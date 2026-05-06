const cds = require('@sap/cds');
const { DELETE } = require('@sap/cds/lib/ql/cds-ql');

module.exports = class test1Srv extends cds.ApplicationService {
    async init() {

        try {
            // Check if a core mock table exists
            await cds.run(SELECT.one.from('Mock_BusinessPartner'));
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

            try {
                // 1. Wipe mock data safely if tables exist
                try {
                    await SELECT.one.from('Mock_Address');
                    await SELECT.one.from('Mock_BusinessPartner');
                    
                    await DELETE.from('Mock_Address');
                    await DELETE.from('Mock_BusinessPartner');
                    console.log("🗑️ Previous mock data cleared.");
                } catch (dbErr) {
                    console.log("⚠️ Mock tables not found; skipping deletion.");
                }

                // 2. Wipe existing GeneratorData to start fresh
                await DELETE.from(GeneratorData);

                // 3. Fetch master data
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
                        houseNumber: h.houseNumber
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
                // Use the safe wipe here as well so teammates don't crash
                try {
                    await SELECT.one.from('Mock_Address');
                    await SELECT.one.from('Mock_BusinessPartner');
                    await DELETE.from('Mock_Address');
                    await DELETE.from('Mock_BusinessPartner');
                } catch (dbErr) {
                    console.log("⚠️ Mock tables not found; skipping deletion during push.");
                }

                const localCustomers = await SELECT.from(GeneratorData); 
                if (localCustomers.length === 0) return req.error(400, "Local database is empty. Generate data first.");

                for (const cust of localCustomers) {
                    const bpNum = Math.floor(Math.random() * 899999 + 100000);
                    const bpGuid = cds.utils.uuid(); 

                   // 1. Insert the Header
                    await cds.run(INSERT.into('Mock_BusinessPartner').entries({
                        ID: bpGuid,
                        businessPartnerNumber: bpNum,
                        firstName: cust.firstName,
                        surName: cust.lastName
                    }));

                    // 2. Insert the Child
                    await cds.run(INSERT.into('Mock_Address').entries({
                        ID: cds.utils.uuid(),
                        up__ID: bpGuid, 
                        houseNumber: String(cust.houseNumber),
                        postalCode: String(cust.postCode),
                        street: cust.streetName,
                        city: cust.cityName
                    }));
            
                    console.log(`✅ Pushed BP ${bpNum} with its address.`);
                }
                
                return `Successfully pushed ${localCustomers.length} customers.`;
            } catch (err) {
                console.error('❌ Push failed:', err);
                return req.error(500, `Push failed: ${err.message}`);
            }
        });

        return super.init();
    }
}