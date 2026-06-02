using { gisa.mdg as my } from '../db/schema.cds';

@path : '/service/generator'
@requires : 'Generator'
service GeneratorService {
    
    entity StreetNames as projection on my.StreetNames;
    entity Cities as projection on my.Cities;
    entity Neighborhoods as projection on my.Neighborhoods;
    entity FirstNames as projection on my.FirstNames;
    entity LastNames as projection on my.LastNames;
    entity PostCodes as projection on my.PostCodes;
    entity HouseNumbers as projection on my.HouseNumbers;

    // Jeder Nutzer sieht/aendert nur seine eigenen generierten Zeilen.
    @odata.draft.enabled: false
    @restrict: [
        { grant: '*', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity GeneratorData as projection on my.GeneratorData;

    // Tracking-Protokoll: nur lesen, und nur die eigenen Eintraege.
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity CreatedObjects as projection on my.CreatedObjects;

    action generateTestCustomers(anzahl : Integer) returns String;
    action pushToBackend() returns String;
}