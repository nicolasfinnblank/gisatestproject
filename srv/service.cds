using { Test1 as my } from '../db/schema.cds';

@path : '/service/test1'
service test1Srv {
    
    entity StreetNames as projection on my.StreetNames;
    entity Cities as projection on my.Cities;
    entity Neighborhoods as projection on my.Neighborhoods;
    entity FirstNames as projection on my.FirstNames;
    entity LastNames as projection on my.LastNames;
    entity PostCodes as projection on my.PostCodes;
    entity HouseNumbers as projection on my.HouseNumbers;

    @odata.draft.enabled: false
    entity GeneratorData as projection on my.GeneratorData;
}