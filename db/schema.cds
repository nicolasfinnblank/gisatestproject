namespace Test1;

using { cuid } from '@sap/cds/common';

entity StreetNames : cuid
{
    streetName : String(100)
        @mandatory;
}

entity Cities : cuid
{
    cityName : String(100)
        @mandatory;
}

entity Neighborhoods : cuid
{
    neighborhoodName : String(100)
        @mandatory;
}

entity FirstNames : cuid
{
    firstName : String(50)
        @mandatory;
}

entity LastNames : cuid
{
    lastName : String(50)
        @mandatory;
}

entity PostCodes : cuid
{
    postCode : String(5)
        @mandatory;
}

annotate PostCodes with @assert.unique :
{
    postCode : [ postCode ],
};

entity HouseNumbers : cuid
{
    houseNumber : String(3)
        @mandatory;
}

annotate HouseNumbers with @assert.unique :
{
    houseNumber : [ houseNumber ],
};

entity GeneratorData
{
    key concatID : String;
    streetName : String(100);
    cityName : String(100);
    neighborhoodName : String(100);
    firstName : String(50);
    lastName : String(50);
    postCode : String(5);
    houseNumber : String(3);
}
