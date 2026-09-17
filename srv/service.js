const cds = require('@sap/cds');

// Das Backend verlangt Hausnummern im Format [0-9]{1,4}[a-z]
// (1-4 Ziffern + ein Kleinbuchstabe). Unsere Pool-Hausnummern sind reine
// Zahlen -> auf max. 4 Ziffern kuerzen und einen zufaelligen Buchstaben anhaengen.
function toBackendHouseNumber(raw) {
    // Passt der Pool-Wert bereits (z.B. "88k"), unveraendert uebernehmen -
    // dann bleibt die Hausnummer aus dem Pool erhalten.
    if (/^[0-9]{1,4}[a-z]$/.test(String(raw ?? ''))) return String(raw);
    const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4) || '1';
    const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
    return digits + letter;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Zufaellige Sortierung in der Datenbank: HANA kennt RAND(), SQLite RANDOM().
const RANDOM = () => cds.db.kind === 'hana' ? 'RAND()' : 'RANDOM()';

module.exports = class GeneratorService extends cds.ApplicationService {
    async init() {
        const { CreatedObjects, Runs, Systems } = this.entities;
        // Namenslisten direkt aus dem Datenmodell (nicht ueber die Schnittstelle angeboten).
        const {
            StreetNames, Cities, FirstNames, LastNames, PostCodes, HouseNumbers
        } = cds.entities('gisa.mdg');

        // Welches *Number-Feld traegt den Backend-Schluessel je Objekttyp.
        const NUMBER_FIELD = {
            BusinessPartner: 'businessPartnerNumber',
            Address:         'addressNumber',
            Street:          'streetNumber',
            City:            'cityNumber'
        };
        // Loeschreihenfolge: abhaengige Objekte zuerst (BP -> Address -> Street/City).
        const DELETE_ORDER = ['BusinessPartner', 'Address', 'Street', 'City'];

        // Filterlisten an fremde Systeme in Bloecken abfragen. CAP schreibt
        // "feld in (a, b, ...)" fuer OData als "feld eq a or feld eq b or ..." in
        // die Adresse. Bei Hunderten Werten wird sie so lang, dass ein echtes
        // System sie ablehnt. Eine leere Liste fragt gar nicht erst an: CAP wuerde
        // den Filter sonst weglassen und ALLE Datensaetze lesen.
        const FILTER_CHUNK = 50;
        async function selectIn(backend, entity, field, values, columns) {
            const rows = [];
            for (let i = 0; i < values.length; i += FILTER_CHUNK) {
                const q = SELECT.from(entity).where({ [field]: { in: values.slice(i, i + FILTER_CHUNK) } });
                if (columns) q.columns(...columns);
                rows.push(...await backend.run(q));
            }
            return rows;
        }

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
            // Ausserhalb des try: im Fehlerfall wissen wir, was schon angelegt wurde.
            const tracked = [];
            let runId, label = '';
            const owner = req.user.id || 'anonymous';
            const now = new Date().toISOString();
            try {
                const anzahl = req.data.anzahl == null ? 10 : Number(req.data.anzahl);
                // Obergrenze 500: je Person und System 4 OData-Aufrufe; mehr wuerde
                // hinter dem Approuter in den Timeout laufen.
                if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 500) {
                    return req.error(400, 'Anzahl muss zwischen 1 und 500 liegen.');
                }
                label = ((req.data.label || '').trim()
                    || `Testdaten ${now.slice(0, 16).replace('T', ' ')}`).slice(0, 100);

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

                // 1. Aus jeder Namensliste nur so viele zufaellige Eintraege holen,
                //    wie Personen gebraucht werden - nicht die ganze Liste (allein
                //    die Strassen sind ~20.600 Zeilen). Die Datenbank mischt.
                const sample = (entity) => SELECT.from(entity).orderBy(RANDOM()).limit(anzahl);
                const [streets, cts, fNames, lNames, pCodes, hNumbers] = await Promise.all([
                    sample(StreetNames), sample(Cities), sample(FirstNames),
                    sample(LastNames), sample(PostCodes), sample(HouseNumbers)
                ]);
                if ([streets, cts, fNames, lNames, pCodes, hNumbers].some(r => !r.length)) {
                    return req.error(500, 'Stammdaten sind leer. Bitte die CSV-Dateien prüfen.');
                }

                // 2. Lauf anlegen
                runId = cds.utils.uuid();
                await INSERT.into(Runs).entries({
                    ID: runId, label, createdBy: owner, createdAt: now,
                    partnerCount: anzahl, systems: '', status: 'created'
                });

                // 3. Personen zusammensetzen: i-ter Eintrag jeder Stichprobe. Ist eine
                //    Liste kuerzer als die Anzahl (z.B. ~120 Nachnamen), zufaellig
                //    einen der gezogenen Eintraege wiederholen.
                const at = (rows, i) => rows[i] ?? pick(rows);
                const persons = [];
                for (let i = 0; i < anzahl; i++) {
                    const s = at(streets, i), c = at(cts, i);
                    const f = at(fNames, i), l = at(lNames, i), p = at(pCodes, i), h = at(hNumbers, i);
                    persons.push({
                        concatID: [s.ID, c.ID, f.ID, l.ID, String(p.ID), String(h.ID)].join('-'),
                        streetName: s.streetName, cityName: c.cityName,
                        firstName: f.firstName, lastName: l.lastName,
                        postCode: p.postCode, houseNumber: h.houseNumber
                    });
                }

                // 4. In jedem Zielsystem anlegen. Die Hausnummer wird je Person EINMAL
                //    festgelegt, damit sie in allen Systemen dieselbe Adresse hat.
                const meta = { runId, owner, now };
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
                return { ok: true, runID: runId, message: `Lauf "${label}": ${anzahl} Geschäftspartner in ${names} angelegt.` };
            } catch (err) {
                console.error('❌ Anlegen fehlgeschlagen:', err);
                // Ein Fehler (req.error) wuerde die Transaktion zurueckrollen: Lauf
                // und Protokoll waeren weg, die im SAP-System bereits
                // angelegten Objekte aber nicht. Deshalb bei Teil-Erfolg KEIN Fehler,
                // sondern: Protokoll der bisherigen Objekte sichern, Lauf markieren
                // und ok=false zurueckgeben (die UI zeigt eine Warnung).
                if (tracked.length && runId) {
                    const partners = new Set(tracked.filter(t => t.objectType === 'BusinessPartner')
                        .map(t => `${t.system}|${t.sourceConcatID}`)).size;
                    await INSERT.into(CreatedObjects).entries(tracked);
                    await UPDATE(Runs, runId).with({
                        label: `${label} (abgebrochen)`.slice(0, 100), partnerCount: partners
                    });
                    await refreshRun(runId);
                    return {
                        ok: false, runID: runId,
                        message: `Anlegen nach ${partners} Geschäftspartner(n) abgebrochen: ${err.message} `
                            + `Die bereits angelegten Objekte sind im Tracking als Lauf "${label} (abgebrochen)" protokolliert.`
                    };
                }
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
                // Schritten (statt tiefem $expand, den der OData-Mock nicht kann)
                // und je Schritt in Bloecken (selectIn).
                const source = await cds.connect.to(srcSys.serviceName);
                const partners = await selectIn(source, 'BusinessPartner', 'businessPartnerNumber', keys);
                const byId = (rows) => Object.fromEntries(rows.map(r => [r.ID, r]));
                const addrIds = [...new Set(partners.map(p => p.address_ID).filter(Boolean))];
                const addresses = await selectIn(source, 'Address', 'ID', addrIds);
                const addrById = byId(addresses);
                const streetIds = [...new Set(addresses.map(a => a.street_ID).filter(Boolean))];
                const cityIds   = [...new Set(addresses.map(a => a.city_ID).filter(Boolean))];
                const streetById = byId(await selectIn(source, 'Street', 'ID', streetIds));
                const cityById   = byId(await selectIn(source, 'City', 'ID', cityIds));

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

                    const rows = await selectIn(backend, type, numField, keys, ['ID']);
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
