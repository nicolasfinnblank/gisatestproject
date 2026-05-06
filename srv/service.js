const cds = require('@sap/cds');
const { DELETE } = require('@sap/cds/lib/ql/cds-ql');

module.exports = class test1Srv extends cds.ApplicationService {
    async init() {
        const { 
            StreetNames, Cities, Neighborhoods, 
            FirstNames, LastNames, PostCodes, 
            HouseNumbers, GeneratorData 
        } = this.entities;

        // Change the trigger to 'before READ'
        this.on('generateTestCustomers', async (req) => {
            const { anzahl } = req.data; 
            const numberrows = anzahl || 10; //fallback in case of missing number

            await DELETE.from(GeneratorData);
            
            // Check if we already have data -- No longer needed, used before trigger added
            //const existing = await SELECT.from(GeneratorData);
            //if (existing.length > 0) return; 

            console.log('GeneratorData is empty. Generating rows...');

            // Fetch master data
            const [streets, cts, hoods, fNames, lNames, pCodes, hNumbers] = await Promise.all([
                SELECT.from(StreetNames), SELECT.from(Cities),
                SELECT.from(Neighborhoods), SELECT.from(FirstNames),
                SELECT.from(LastNames), SELECT.from(PostCodes),
                SELECT.from(HouseNumbers)
            ]);

            // Safety check: Make sure CSVs actually loaded data
            if (streets.length === 0) {
                console.error('Error: Master data (StreetNames) is empty. Check CSV files!');
                return;
            }

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

            await INSERT.into(GeneratorData).entries(entries);
            console.log(`✅ Generated ${entries.length} identities.`);
            return `Successfully generated ${numberrows} customers.`;
    });
        
        this.on('pushToBackend', async (req) => {
    try {
        const { GeneratorData } = this.entities;

        await DELETE.from('Mock_Address');
        await DELETE.from('Mock_BusinessPartner');

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