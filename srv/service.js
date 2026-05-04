const cds = require('@sap/cds');

module.exports = class test1Srv extends cds.ApplicationService {
    async init() {
        const { 
            StreetNames, Cities, Neighborhoods, 
            FirstNames, LastNames, PostCodes, 
            HouseNumbers, GeneratorData 
        } = this.entities;

        // Change the trigger to 'before READ'
        this.before('READ', 'GeneratorData', async (req) => {
            
            // Check if we already have data
            const existing = await SELECT.from(GeneratorData);
            if (existing.length > 0) return; 

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

            const numberrows = 10;
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
        });

        return super.init();
    }
}