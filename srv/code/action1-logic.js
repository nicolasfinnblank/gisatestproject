/**
 * 
 * @On(event = { "Action1" })
 * @param {cds.Request} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
    const numberrowsgenerator = 10; // Example value, replace with actual value
    const { StreetNames, Cities, Neighborhoods, FirstNames, LastNames, PostCodes, HouseNumbers } = cds.entities;

    // Helper function to get random element from an array
    const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

    // Fetch all entities
    const streetNames = await SELECT.from(StreetNames);
    const cities = await SELECT.from(Cities);
    const neighborhoods = await SELECT.from(Neighborhoods);
    const firstNames = await SELECT.from(FirstNames);
    const lastNames = await SELECT.from(LastNames);
    const postCodes = await SELECT.from(PostCodes);
    const houseNumbers = await SELECT.from(HouseNumbers);

    // Check if entities are not empty
    if (!streetNames.length || !cities.length || !neighborhoods.length || !firstNames.length || !lastNames.length || !postCodes.length || !houseNumbers.length) {
        throw new Error("One or more entities are empty.");
    }

    const generatorTestRows = [];

    for (let i = 0; i < numberrowsgenerator; i++) {
        const randomStreetName = getRandomElement(streetNames);
        const randomCity = getRandomElement(cities);
        const randomNeighborhood = getRandomElement(neighborhoods);
        const randomFirstName = getRandomElement(firstNames);
        const randomLastName = getRandomElement(lastNames);
        const randomPostCode = getRandomElement(postCodes);
        const randomHouseNumber = getRandomElement(houseNumbers);

        const concatID = [
            randomStreetName.ID,
            randomCity.ID,
            randomNeighborhood.ID,
            randomFirstName.ID,
            randomLastName.ID,
            randomPostCode.ID,
            randomHouseNumber.ID
        ].join('-');

        generatorTestRows.push({
            streetName_ID: randomStreetName.ID,
            city_ID: randomCity.ID,
            neighborhood_ID: randomNeighborhood.ID,
            firstName_ID: randomFirstName.ID,
            lastName_ID: randomLastName.ID,
            postCode_ID: randomPostCode.ID,
            houseNumber_ID: randomHouseNumber.ID,
            concatID: concatID
        });
    }

    // Insert generated rows into GeneratorTest entity
    await INSERT.into('GeneratorTest').entries(generatorTestRows);
}