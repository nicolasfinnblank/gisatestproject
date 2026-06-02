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
            HouseNumbers, GeneratorData, CreatedObjects
        } = this.entities;

        // Kennung des Ziel-Systems. Vorerst konstant – wird im naechsten Schritt
        // (Multi-System) durch das tatsaechlich gewaehlte Zielsystem ersetzt.
        const TARGET_SYSTEM = 'BackendAPI_2';

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
                // Verbindung zum Backend-Service (lokal gemockt bzw. in Produktion das echte S/4)
                const backend = await cds.connect.to('BackendAPI_2');

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
                        system: TARGET_SYSTEM, objectType,
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

                console.log(`✅ Pushed ${pushed} business partners to backend (${tracked.length} objects tracked).`);
                return `Successfully pushed ${pushed} customers to backend.`;
            } catch (err) {
                console.error('❌ Push failed:', err);
                return req.error(500, `Push failed: ${err.message}`);
            }
        });

        return super.init();
    }
}