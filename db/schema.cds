namespace Test1;
using { cuid } from '@sap/cds/common';

@assert.unique: { streetName: [streetName] }
entity StreetNames : cuid {
  streetName: String(100) @mandatory;
}

@assert.unique: { cityName: [cityName] }
entity Cities : cuid {
  cityName: String(100) @mandatory;
}

@assert.unique: { neighborhoodName: [neighborhoodName] }
entity Neighborhoods : cuid {
  neighborhoodName: String(100) @mandatory;
}

@assert.unique: { firstName: [firstName] }
entity FirstNames : cuid {
  firstName: String(50) @mandatory;
}

@assert.unique: { lastName: [lastName] }
entity LastNames : cuid {
  lastName: String(50) @mandatory;
}