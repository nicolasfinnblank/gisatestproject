const cds = require('@sap/cds');

// Das Backend verlangt Hausnummern im Format [0-9]{1,4}[a-z]
// (1-4 Ziffern + ein Kleinbuchstabe). Unsere Pool-Hausnummern sind reine
// Zahlen -> auf max. 4 Ziffern kuerzen und einen zufaelligen Buchstaben anhaengen.
function toBackendHouseNumber(raw) {
    // Passt der Pool-Wert bereits (z.B. "88k"), unveraendert uebernehmen -
    // dann stimmen Quittung und Backend ueberein.
    if (/^[0-9]{1,4}[a-z]$/.test(String(raw ?? ''))) return String(raw);
    const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4) || '1';
    const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
    return digits + letter;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

module.exports = class GeneratorService extends cds.ApplicationService {
    async init() {

        // Lokaler Komfort: Startet die App auf einer frischen SQLite-Datei
        // (z.B. via 'npm start', das nicht automatisch deployt), werden die
        // Tabellen einmalig angelegt. Greift nur auf SQLite – in Produktion
        // (HANA) wird hier nichts deployt.
        if (cds.db?.kind !== 'hana') {
            try {
                await cds.run(SELECT.one.from('gisa.mdg.Runs'));
            } catch (err) {
                if (err.message.includes('no such table')) {
                    const url = cds.env.requires.db?.credentials?.url || 'db.sqlite';
                    console.log(`🛠️  Tabellen fehlen – deploye Schema lokal nach ${url} …`);
                    await cds.deploy(await cds.load('*')).to('sqlite:' + url);
                    console.log("✅ Lokales Deployment fertig.");
                }
            }
        }

        const {
            StreetNames, Cities, Neighborhoods,
            FirstNames, LastNames, PostCodes,
            HouseNumbers, GeneratorData, CreatedObjects, Runs, Systems
        } = this.entities;

        // Welches *Number-Feld traegt den Backend-Schluessel je Objekttyp.
        const NUMBER_FIELD = {
            BusinessPartner: 'businessPartnerNumber',
            Address:         'addressNumber',
            Street:          'streetNumber',
            City:            'cityNumber'
        };
        // Loeschreihenfolge: abhaengige Objekte zuerst (BP -> Address -> Street/City).
        const DELETE_ORDER = ['BusinessPartner', 'Address', 'Street', 'City'];

        // ------------------------------------------------------------------
        // Hilfsfunktionen
        // ------------------------------------------------------------------

        // Legt EINE Person (Strasse, Stadt, Adresse, Geschaeftspartner) im
        // Zielsystem an und liefert die vier Protokoll-Zeilen zurueck.
        // person: { concatID, firstName, lastName, streetName, houseNumber
        //           (bereits im Backend-Format), postCode, cityName }
        async function createPersonIn(backend, sys, person, meta) {
            // IDs selbst vergeben, um die Datensaetze zu verknuepfen.
            // Alle *Number-Felder vergibt der Server (Core.Computed) -> NICHT mitsenden.
            const streetId = cds.utils.uuid();
            const cityId   = cds.utils.uuid();
            const addrId   = cds.utils.uuid();

            const street  = await backend.create('Street').entries({ ID: streetId, name: person.streetName });
            const city    = await backend.create('City').entries({   ID: cityId,   name: person.cityName });
            const address = await backend.create('Address').entries({
                ID: addrId, street_ID: streetId, city_ID: cityId,
                houseNumber: person.houseNumber, postalCode: person.postCode
            });
            const partner = await backend.create('BusinessPartner').entries({
                firstName: person.firstName, surName: person.lastName, address_ID: addrId
            });

            const row = (objectType, objectKey, extra = {}) => ({
                run_ID: meta.runId, system: sys.name, sourceSystem: meta.sourceSystem ?? null,
                objectType, objectKey: String(objectKey),
                sourceConcatID: person.concatID, createdBy: meta.owner, createdAt: meta.now,
                status: 'created', ...extra
            });
            return [
                row('Street',  street?.streetNumber   ?? streetId),
                row('City',    city?.cityNumber       ?? cityId),
                row('Address', address?.addressNumber ?? addrId),
                // Beim Geschaeftspartner zusaetzlich die Stammdaten (fuer die Anzeige).
                row('BusinessPartner', partner?.businessPartnerNumber ?? '', {
                    firstName: person.firstName, lastName: person.lastName,
                    streetName: person.streetName, houseNumber: person.houseNumber,
                    postCode: person.postCode, cityName: person.cityName
                })
            ];
        }

        // Berechnet die Anzeigefelder des Laufs (Systeme, Status) neu.
        async function refreshRun(runId) {
            const rows = await SELECT.from(CreatedObjects)
                .columns('system', 'status').where({ run_ID: runId });
            const active  = [...new Set(rows.filter(r => r.status === 'created').map(r => r.system))].sort();
            const deleted = rows.some(r => r.status === 'deleted');
            const status  = active.length === 0 ? 'deleted' : deleted ? 'partially deleted' : 'created';
            await UPDATE(Runs, runId).with({ systems: active.join(', '), status });
        }

        // Lauf laden und pruefen, dass er dem Nutzer gehoert.
        // (req.reject wirft sofort -> Aufruf VOR dem try/catch der Aktion.)
        async function ownRun(req, runId) {
            if (!runId) req.reject(400, 'Kein Lauf angegeben.');
            const run = await SELECT.one.from(Runs).where({ ID: runId });
            if (!run) req.reject(404, `Lauf '${runId}' nicht gefunden.`);
            const owner = req.user.id || 'anonymous';
            if (run.createdBy !== owner) {
                req.reject(403, `Der Lauf "${run.label}" gehört ${run.createdBy}. Nur eigene Läufe können geändert werden.`);
            }
            return run;
        }

        // ------------------------------------------------------------------
        // Aktion: Generieren UND anlegen (ein Schritt, ergibt einen Lauf)
        // ------------------------------------------------------------------
        this.on('generateAndCreate', async (req) => {
            try {
                const anzahl = req.data.anzahl == null ? 10 : Number(req.data.anzahl);
                if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 1000) {
                    return req.error(400, 'Anzahl muss zwischen 1 und 1000 liegen.');
                }
                const owner = req.user.id || 'anonymous';
                const now = new Date().toISOString();
                const label = (req.data.label || '').trim()
                    || `Testdaten ${now.slice(0, 16).replace('T', ' ')}`;

                // Zielsysteme: gewaehlte (Liste von Systems.ID) oder das Default-System.
                let ids = req.data.systems;
                if (!Array.isArray(ids)) ids = ids ? [ids] : [];
                const targets = ids.length
                    ? await SELECT.from(Systems).where({ ID: { in: ids } })
                    : await SELECT.from(Systems).where({ isDefault: true });
                if (!targets.length) {
                    return req.error(400, ids.length
                        ? 'Unbekannte Zielsysteme.'
                        : 'Kein Default-Zielsystem konfiguriert.');
                }

                // 1. Stammdaten-Pools laden
                const [streets, cts, hoods, fNames, lNames, pCodes, hNumbers] = await Promise.all([
                    SELECT.from(StreetNames), SELECT.from(Cities),
                    SELECT.from(Neighborhoods), SELECT.from(FirstNames),
                    SELECT.from(LastNames), SELECT.from(PostCodes),
                    SELECT.from(HouseNumbers)
                ]);
                if (streets.length === 0) {
                    return req.error(500, 'Stammdaten sind leer. Bitte die CSV-Dateien prüfen.');
                }

                // 2. Lauf anlegen
                const runId = cds.utils.uuid();
                await INSERT.into(Runs).entries({
                    ID: runId, label, createdBy: owner, createdAt: now,
                    partnerCount: anzahl, systems: '', status: 'created'
                });

                // 3. Personen wuerfeln
                const persons = [];
                for (let i = 0; i < anzahl; i++) {
                    const s = pick(streets), c = pick(cts), n = pick(hoods);
                    const f = pick(fNames), l = pick(lNames), p = pick(pCodes), h = pick(hNumbers);
                    persons.push({
                        concatID: [s.ID, c.ID, n.ID, f.ID, l.ID, String(p.ID), String(h.ID)].join('-'),
                        streetName: s.streetName, cityName: c.cityName,
                        neighborhoodName: n.neighborhoodName,
                        firstName: f.firstName, lastName: l.lastName,
                        postCode: p.postCode, houseNumber: h.houseNumber,
                        createdBy: owner, run_ID: runId
                    });
                }

                // 4. Quittung: nur die EIGENE alte Quittung ersetzen (Multi-User-sicher)
                await DELETE.from(GeneratorData).where({ createdBy: owner });
                await INSERT.into(GeneratorData).entries(persons);

                // 5. In jedem Zielsystem anlegen. Die Hausnummer wird je Person EINMAL
                //    festgelegt, damit sie in allen Systemen dieselbe Adresse hat.
                const meta = { runId, owner, now };
                const tracked = [];
                for (const sys of targets) {
                    const backend = await cds.connect.to(sys.serviceName);
                    for (const p of persons) {
                        p.backendHouse ??= toBackendHouseNumber(p.houseNumber);
                        tracked.push(...await createPersonIn(backend, sys,
                            { ...p, houseNumber: p.backendHouse }, meta));
                    }
                }
                if (tracked.length) await INSERT.into(CreatedObjects).entries(tracked);
                await refreshRun(runId);

                const names = targets.map(s => s.name).join(', ');
                console.log(`✅ Lauf "${label}": ${anzahl} Geschäftspartner in ${names} angelegt (${tracked.length} Objekte).`);
                return `Lauf "${label}": ${anzahl} Geschäftspartner in ${names} angelegt.`;
            } catch (err) {
                console.error('❌ Anlegen fehlgeschlagen:', err);
                return req.error(500, `Anlegen fehlgeschlagen: ${err.message}`);
            }
        });

        // ------------------------------------------------------------------
        // Aktion: Lauf in ein weiteres System kopieren
        // ------------------------------------------------------------------
        this.on('copyRun', async (req) => {
            const run = await ownRun(req, req.data.run);
            try {
                const { targetSystem } = req.data;
                if (!targetSystem) return req.error(400, 'Zielsystem angeben.');
                const tgtSys = await SELECT.one.from(Systems).where({ ID: targetSystem });
                if (!tgtSys) return req.error(400, `Unbekanntes Zielsystem '${targetSystem}'.`);

                // Quelle: angegeben, sonst das erste System des Laufs, das nicht das Ziel ist.
                let srcSys;
                if (req.data.sourceSystem) {
                    srcSys = await SELECT.one.from(Systems).where({ ID: req.data.sourceSystem });
                    if (!srcSys) return req.error(400, `Unbekanntes Quellsystem '${req.data.sourceSystem}'.`);
                } else {
                    const inSystems = (run.systems || '').split(', ').filter(Boolean);
                    const srcName = inSystems.find(n => n !== tgtSys.name);
                    if (!srcName) return req.error(400, 'Der Lauf liegt in keinem anderen System, aus dem kopiert werden könnte.');
                    srcSys = await SELECT.one.from(Systems).where({ name: srcName });
                }
                if (srcSys.ID === tgtSys.ID) {
                    return req.error(400, 'Quell- und Zielsystem müssen unterschiedlich sein.');
                }

                // Welche Geschaeftspartner des Laufs liegen (noch) im Quellsystem?
                const trackedBPs = await SELECT.from(CreatedObjects).where({
                    run_ID: run.ID, system: srcSys.name, objectType: 'BusinessPartner', status: 'created'
                });
                if (trackedBPs.length === 0) {
                    return req.error(400, `Der Lauf "${run.label}" liegt nicht (mehr) in ${srcSys.name}.`);
                }
                const keys = trackedBPs.map(t => Number(t.objectKey)).filter(n => !Number.isNaN(n));
                // Quell-Nummer -> Herkunft (sourceConcatID), damit die Kopie an derselben Person haengt.
                const concatByNum = Object.fromEntries(trackedBPs.map(t => [String(t.objectKey), t.sourceConcatID]));

                // Vollstaendige Datensaetze aus dem Quell-Backend lesen: flach in
                // Schritten (statt tiefem $expand, den der OData-Mock nicht kann).
                const source = await cds.connect.to(srcSys.serviceName);
                const partners = await source.run(
                    SELECT.from('BusinessPartner').where({ businessPartnerNumber: { in: keys } })
                );
                const byId = (rows) => Object.fromEntries(rows.map(r => [r.ID, r]));
                const addrIds = [...new Set(partners.map(p => p.address_ID).filter(Boolean))];
                const addresses = addrIds.length
                    ? await source.run(SELECT.from('Address').where({ ID: { in: addrIds } })) : [];
                const addrById = byId(addresses);
                const streetIds = [...new Set(addresses.map(a => a.street_ID).filter(Boolean))];
                const cityIds   = [...new Set(addresses.map(a => a.city_ID).filter(Boolean))];
                const streetById = byId(streetIds.length
                    ? await source.run(SELECT.from('Street').where({ ID: { in: streetIds } })) : []);
                const cityById = byId(cityIds.length
                    ? await source.run(SELECT.from('City').where({ ID: { in: cityIds } })) : []);

                // Im Ziel-Backend neu anlegen (gleiche Reihenfolge wie beim Anlegen).
                const target = await cds.connect.to(tgtSys.serviceName);
                const meta = { runId: run.ID, owner: req.user.id || 'anonymous',
                               now: new Date().toISOString(), sourceSystem: srcSys.name };
                const tracked = [];
                for (const p of partners) {
                    const addr   = addrById[p.address_ID] || {};
                    const street = streetById[addr.street_ID] || {};
                    const city   = cityById[addr.city_ID] || {};
                    tracked.push(...await createPersonIn(target, tgtSys, {
                        concatID: concatByNum[String(p.businessPartnerNumber)] ?? null,
                        firstName: p.firstName, lastName: p.surName,
                        streetName: street.name, houseNumber: addr.houseNumber,
                        postCode: addr.postalCode, cityName: city.name
                    }, meta));
                }
                if (tracked.length) await INSERT.into(CreatedObjects).entries(tracked);
                await refreshRun(run.ID);

                const copied = partners.length;
                console.log(`✅ Lauf "${run.label}": ${copied} Geschäftspartner von ${srcSys.name} nach ${tgtSys.name} kopiert.`);
                return `Lauf "${run.label}": ${copied} Geschäftspartner von ${srcSys.name} nach ${tgtSys.name} kopiert.`;
            } catch (err) {
                console.error('❌ Kopieren fehlgeschlagen:', err);
                return req.error(500, `Kopieren fehlgeschlagen: ${err.message}`);
            }
        });

        // ------------------------------------------------------------------
        // Aktion: Lauf in einem System loeschen (Protokoll bleibt, Status 'deleted')
        // ------------------------------------------------------------------
        this.on('deleteRun', async (req) => {
            const run = await ownRun(req, req.data.run);
            try {
                if (!req.data.system) return req.error(400, 'System angeben.');
                const sys = await SELECT.one.from(Systems).where({ ID: req.data.system });
                if (!sys) return req.error(400, `Unbekanntes System '${req.data.system}'.`);

                const tracked = await SELECT.from(CreatedObjects).where({
                    run_ID: run.ID, system: sys.name, status: 'created'
                });
                if (tracked.length === 0) {
                    return req.error(400, `Der Lauf "${run.label}" liegt nicht (mehr) in ${sys.name}.`);
                }

                const backend = await cds.connect.to(sys.serviceName);

                // Je Objekttyp: anhand der protokollierten *Number die Backend-IDs holen
                // und per Key loeschen (OData-DELETE ist key-basiert).
                let deleted = 0;
                for (const type of DELETE_ORDER) {
                    const numField = NUMBER_FIELD[type];
                    const keys = tracked
                        .filter(t => t.objectType === type)
                        .map(t => Number(t.objectKey))
                        .filter(n => !Number.isNaN(n));
                    if (!keys.length) continue;

                    const rows = await backend.run(
                        SELECT.from(type).columns('ID').where({ [numField]: { in: keys } })
                    );
                    for (const r of rows) {
                        await backend.delete(type, r.ID);
                        deleted++;
                    }
                }

                // Protokoll: Status setzen statt loeschen (Historie bleibt sichtbar).
                await UPDATE(CreatedObjects)
                    .with({ status: 'deleted', deletedAt: new Date().toISOString() })
                    .where({ run_ID: run.ID, system: sys.name, status: 'created' });
                await refreshRun(run.ID);

                console.log(`✅ Lauf "${run.label}": ${deleted} Objekte aus ${sys.name} gelöscht.`);
                return `Lauf "${run.label}": ${deleted} Objekte aus ${sys.name} gelöscht.`;
            } catch (err) {
                console.error('❌ Löschen fehlgeschlagen:', err);
                return req.error(500, `Löschen fehlgeschlagen: ${err.message}`);
            }
        });

        return super.init();
    }
}
