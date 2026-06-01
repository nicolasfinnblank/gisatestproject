const cds = require('@sap/cds');
const { DELETE } = require('@sap/cds/lib/ql/cds-ql');

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

        try {
            // Check if the core tables are already deployed
            await cds.run(SELECT.one.from('gisa.mdg.GeneratorData'));
        } catch (err) {
            if (err.message.includes('no such table')) {
                console.log("🛠️  Missing tables detected. Auto-deploying schema to db.sqlite...");
                const model = await cds.load('*'); 
                await cds.deploy(model).to('sqlite:db.sqlite');
                console.log("✅ Auto-deployment successful. Environment is ready.");
            }
        }

        const { 
            StreetNames, Cities, Neighborhoods, 
            FirstNames, LastNames, PostCodes, 
            HouseNumbers, GeneratorData 
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
                // Verbindung zum Backend-Service (lokal gemockt bzw. in Produktion das echte S/4)
                const backend = await cds.connect.to('BackendAPI_2');

                // Nur die EIGENEN generierten Zeilen pushen (Multi-User-sicher)
                const owner = req.user.id || 'anonymous';
                const localCustomers = await SELECT.from(GeneratorData).where({ createdBy: owner });
                if (localCustomers.length === 0) return req.error(400, "Local database is empty. Generate data first.");

                let pushed = 0;
                for (const cust of localCustomers) {
                    // IDs selbst vergeben, um die Datensaetze zu verknuepfen.
                    // Alle *Number-Felder vergibt der Server (Core.Computed) -> NICHT mitsenden.
                    const streetId = cds.utils.uuid();
                    const cityId   = cds.utils.uuid();
                    const addrId   = cds.utils.uuid();

                    // 1. Strasse und Stadt anlegen
                    await backend.create('Street').entries({ ID: streetId, name: cust.streetName });
                    await backend.create('City').entries({   ID: cityId,   name: cust.cityName });

                    // 2. Adresse anlegen (verweist per ID auf Strasse + Stadt)
                    await backend.create('Address').entries({
                        ID: addrId,
                        street_ID: streetId,
                        city_ID:   cityId,
                        houseNumber: toBackendHouseNumber(cust.houseNumber),
                        postalCode:  cust.postCode
                    });

                    // 3. BusinessPartner anlegen (verweist per ID auf die Adresse)
                    await backend.create('BusinessPartner').entries({
                        firstName:  cust.firstName,
                        surName:    cust.lastName,
                        address_ID: addrId
                    });
                    pushed++;
                }

                console.log(`✅ Pushed ${pushed} business partners to backend.`);
                return `Successfully pushed ${pushed} customers to backend.`;
            } catch (err) {
                console.error('❌ Push failed:', err);
                return req.error(500, `Push failed: ${err.message}`);
            }
        });

        return super.init();
    }
}