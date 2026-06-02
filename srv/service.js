const cds = require('@sap/cds');

// Das Backend verlangt Hausnummern im Format [0-9]{1,4}[a-z]
// (1-4 Ziffern + ein Kleinbuchstabe). Unsere Pool-Hausnummern sind reine
// Zahlen -> auf max. 4 Ziffern kuerzen und einen zufaelligen Buchstaben anhaengen.
function toBackendHouseNumber(raw) {
    const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4) || '1';
    const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
    return digits + letter;
}

module.exports = class GeneratorService extends cds.ApplicationService {
    async init() {

        // Lokaler Komfort: Startet die App auf einer frischen SQLite-Datei
        // (z.B. via 'npm start', das nicht automatisch deployt), werden die
        // Tabellen einmalig angelegt. Greift nur auf SQLite – in Produktion
        // (HANA) wird hier nichts deployt.
        if (cds.db?.kind !== 'hana') {
            try {
                await cds.run(SELECT.one.from('gisa.mdg.GeneratorData'));
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
            HouseNumbers, GeneratorData, CreatedObjects, Systems
        } = this.entities;

        // --- HANDLER: Generate Test Customers ---
        this.on('generateTestCustomers', async (req) => {
            const { anzahl } = req.data;
            const numberrows = anzahl || 10;
            const owner = req.user.id || 'anonymous';

            try {
                // 1. Nur die EIGENEN bisherigen Zeilen loeschen (Multi-User-sicher)
                await DELETE.from(GeneratorData).where({ createdBy: owner });

                // 2. Fetch master data
                const [streets, cts, hoods, fNames, lNames, pCodes, hNumbers] = await Promise.all([
                    SELECT.from(StreetNames), SELECT.from(Cities),
                    SELECT.from(Neighborhoods), SELECT.from(FirstNames),
                    SELECT.from(LastNames), SELECT.from(PostCodes),
                    SELECT.from(HouseNumbers)
                ]);

                if (streets.length === 0) {
                    return req.error(500, 'Master data is empty. Check your CSV files!');
                }

                // 4. Generate entries
                const entries = [];
                for (let i = 0; i < numberrows; i++) {
                    const s = streets[Math.floor(Math.random() * streets.length)];
                    const c = cts[Math.floor(Math.random() * cts.length)];
                    const n = hoods[Math.floor(Math.random() * hoods.length)];
                    const f = fNames[Math.floor(Math.random() * fNames.length)];
                    const l = lNames[Math.floor(Math.random() * lNames.length)];
                    const p = pCodes[Math.floor(Math.random() * pCodes.length)];
                    const h = hNumbers[Math.floor(Math.random() * hNumbers.length)];

                    const concatID = [s.ID, c.ID, n.ID, f.ID, l.ID, String(p.ID), String(h.ID)].join('-');

                    entries.push({
                        concatID: concatID,
                        streetName: s.streetName,
                        cityName: c.cityName,
                        neighborhoodName: n.neighborhoodName,
                        firstName: f.firstName,
                        lastName: l.lastName,
                        postCode: p.postCode,
                        houseNumber: h.houseNumber,
                        createdBy: owner
                    });
                }

                // 5. Bulk insert into GeneratorData
                await INSERT.into(GeneratorData).entries(entries);
                console.log(`✅ Generated ${entries.length} identities.`);
                return `Successfully generated ${numberrows} customers.`;

            } catch (err) {
                console.error('❌ Generation failed:', err);
                return req.error(500, `Generation failed: ${err.message}`);
            }
        });

        // --- HANDLER: Push to Backend ---
        this.on('pushToBackend', async (req) => {
            try {
                // Zielsystem bestimmen: explizit gewaehlt (req.data.system = Systems.ID)
                // oder das als Default markierte System.
                const sys = req.data.system
                    ? await SELECT.one.from(Systems).where({ ID: req.data.system })
                    : await SELECT.one.from(Systems).where({ isDefault: true });
                if (!sys) {
                    return req.error(400, req.data.system
                        ? `Unbekanntes Zielsystem '${req.data.system}'.`
                        : 'Kein Default-Zielsystem konfiguriert.');
                }

                // Verbindung zum Backend-Service des Zielsystems (lokal gemockt
                // bzw. in Produktion die echte S/4-Destination).
                const backend = await cds.connect.to(sys.serviceName);

                // Nur die EIGENEN generierten Zeilen pushen (Multi-User-sicher)
                const owner = req.user.id || 'anonymous';
                const localCustomers = await SELECT.from(GeneratorData).where({ createdBy: owner });
                if (localCustomers.length === 0) return req.error(400, "Local database is empty. Generate data first.");

                let pushed = 0;
                const now = new Date().toISOString();
                const tracked = [];
                for (const cust of localCustomers) {
                    // IDs selbst vergeben, um die Datensaetze zu verknuepfen.
                    // Alle *Number-Felder vergibt der Server (Core.Computed) -> NICHT mitsenden.
                    const streetId = cds.utils.uuid();
                    const cityId   = cds.utils.uuid();
                    const addrId   = cds.utils.uuid();

                    // 1. Strasse und Stadt anlegen
                    const street = await backend.create('Street').entries({ ID: streetId, name: cust.streetName });
                    const city   = await backend.create('City').entries({   ID: cityId,   name: cust.cityName });

                    // 2. Adresse anlegen (verweist per ID auf Strasse + Stadt)
                    const address = await backend.create('Address').entries({
                        ID: addrId,
                        street_ID: streetId,
                        city_ID:   cityId,
                        houseNumber: toBackendHouseNumber(cust.houseNumber),
                        postalCode:  cust.postCode
                    });

                    // 3. BusinessPartner anlegen (verweist per ID auf die Adresse)
                    const partner = await backend.create('BusinessPartner').entries({
                        firstName:  cust.firstName,
                        surName:    cust.lastName,
                        address_ID: addrId
                    });

                    // 4. Tracking: je angelegtem Objekt eine Zeile mit dem vom
                    //    Backend vergebenen Schluessel (Fallback: unsere ID).
                    const track = (objectType, objectKey) => tracked.push({
                        system: sys.name, objectType,
                        objectKey: String(objectKey),
                        sourceConcatID: cust.concatID, createdBy: owner, createdAt: now
                    });
                    track('Street',          street?.streetNumber          ?? streetId);
                    track('City',            city?.cityNumber              ?? cityId);
                    track('Address',         address?.addressNumber        ?? addrId);
                    track('BusinessPartner', partner?.businessPartnerNumber ?? '');
                    pushed++;
                }

                // Tracking-Zeilen gesammelt schreiben (Historie, wird nicht geleert).
                if (tracked.length) await INSERT.into(CreatedObjects).entries(tracked);

                console.log(`✅ Pushed ${pushed} business partners to ${sys.name} (${tracked.length} objects tracked).`);
                return `Successfully pushed ${pushed} customers to ${sys.name}.`;
            } catch (err) {
                console.error('❌ Push failed:', err);
                return req.error(500, `Push failed: ${err.message}`);
            }
        });

        // --- HANDLER: Copy data from one system into another ---
        this.on('copyData', async (req) => {
            try {
                const { sourceSystem, targetSystem } = req.data;
                if (!sourceSystem || !targetSystem) {
                    return req.error(400, 'Quell- und Zielsystem angeben.');
                }
                if (sourceSystem === targetSystem) {
                    return req.error(400, 'Quell- und Zielsystem müssen unterschiedlich sein.');
                }

                const [srcSys, tgtSys] = await Promise.all([
                    SELECT.one.from(Systems).where({ ID: sourceSystem }),
                    SELECT.one.from(Systems).where({ ID: targetSystem })
                ]);
                if (!srcSys) return req.error(400, `Unbekanntes Quellsystem '${sourceSystem}'.`);
                if (!tgtSys) return req.error(400, `Unbekanntes Zielsystem '${targetSystem}'.`);

                const owner = req.user.id || 'anonymous';

                // Welche Business Partner hat dieser Nutzer im Quellsystem angelegt?
                // (Aus dem Tracking – so ist die Kopie multi-user-sicher.)
                const trackedBPs = await SELECT.from(CreatedObjects).where({
                    system: srcSys.name, objectType: 'BusinessPartner', createdBy: owner
                });
                if (trackedBPs.length === 0) {
                    return req.error(400, `Im System ${srcSys.name} hast du keine Business Partner angelegt.`);
                }
                const keys = trackedBPs.map(t => Number(t.objectKey)).filter(n => !Number.isNaN(n));

                // Die vollstaendigen Datensaetze aus dem Quell-Backend lesen.
                // Flach in Schritten (statt tiefem $expand, das der OData-Mock
                // nicht unterstuetzt): BP -> Address -> Street/City.
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

                // Im Ziel-Backend neu anlegen (gleiche Reihenfolge wie beim Push).
                const target = await cds.connect.to(tgtSys.serviceName);
                const now = new Date().toISOString();
                const newTracked = [];
                let copied = 0;
                for (const p of partners) {
                    const addr   = addrById[p.address_ID] || {};
                    const street0 = streetById[addr.street_ID] || {};
                    const city0   = cityById[addr.city_ID] || {};
                    const streetId = cds.utils.uuid();
                    const cityId   = cds.utils.uuid();
                    const addrId   = cds.utils.uuid();

                    const street = await target.create('Street').entries({ ID: streetId, name: street0.name });
                    const city   = await target.create('City').entries({   ID: cityId,   name: city0.name });
                    const address = await target.create('Address').entries({
                        ID: addrId, street_ID: streetId, city_ID: cityId,
                        houseNumber: addr.houseNumber, postalCode: addr.postalCode
                    });
                    const partner = await target.create('BusinessPartner').entries({
                        firstName: p.firstName, surName: p.surName, address_ID: addrId
                    });

                    const track = (objectType, objectKey) => newTracked.push({
                        system: tgtSys.name, objectType,
                        objectKey: String(objectKey),
                        sourceConcatID: null, createdBy: owner, createdAt: now
                    });
                    track('Street',          street?.streetNumber          ?? streetId);
                    track('City',            city?.cityNumber              ?? cityId);
                    track('Address',         address?.addressNumber        ?? addrId);
                    track('BusinessPartner', partner?.businessPartnerNumber ?? '');
                    copied++;
                }

                if (newTracked.length) await INSERT.into(CreatedObjects).entries(newTracked);

                console.log(`✅ Copied ${copied} business partners from ${srcSys.name} to ${tgtSys.name}.`);
                return `Copied ${copied} business partners from ${srcSys.name} to ${tgtSys.name}.`;
            } catch (err) {
                console.error('❌ Copy failed:', err);
                return req.error(500, `Copy failed: ${err.message}`);
            }
        });

        return super.init();
    }
}