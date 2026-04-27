namespace Test1;

using { cuid } from '@sap/cds/common';

entity StreetNames : cuid
{
    streetName : String(100)
        @mandatory;
}

annotate StreetNames with @assert.unique :
{
    streetName : [ streetName ],
};

entity Cities : cuid
{
    cityName : String(100)
        @mandatory;
}

annotate Cities with @assert.unique :
{
    cityName : [ cityName ],
};

entity Neighborhoods : cuid
{
    neighborhoodName : String(100)
        @mandatory;
}

annotate Neighborhoods with @assert.unique :
{
    neighborhoodName : [ neighborhoodName ],
};

entity FirstNames : cuid
{
    firstName : String(50)
        @mandatory;
}

annotate FirstNames with @assert.unique :
{
    firstName : [ firstName ],
};

entity LastNames : cuid
{
    lastName : String(50)
        @mandatory;
}

annotate LastNames with @assert.unique :
{
    lastName : [ lastName ],
};

entity PostCodes : cuid
{
    postCode : Integer
        @mandatory;
}

annotate PostCodes with @assert.unique :
{
    postCode : [ postCode ],
};
