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

    // Tracking-Protokoll (vollstaendig, je angelegtem Objekt eine Zeile).
    // Wird intern fuer Copy/Delete genutzt; nur lesen, nur die eigenen Eintraege.
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity CreatedObjects as projection on my.CreatedObjects;

    // Geschaeftspartner-Sicht aufs Tracking: EINE Zeile je Business Partner,
    // mit allen Stammdaten + Zielsystem + vergebener Nummer. Basis fuer die
    // Tracking-Oberflaeche (Liste + Detailseite).
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity TrackedPartners as select from my.CreatedObjects {
        ID,
        firstName,
        lastName,
        firstName || ' ' || lastName as name : String,
        streetName,
        houseNumber,
        postCode,
        cityName,
        system,
        objectKey,
        createdBy,
        createdAt
    } where objectType = 'BusinessPartner';

    // Katalog der Ziel-Systeme: gemeinsam gepflegt (CRUD fuer Generator-Rolle).
    entity Systems as projection on my.Systems;

    action generateTestCustomers(anzahl : Integer) returns String;
    // system: ID eines Eintrags aus Systems. Leer -> Default-System.
    action pushToBackend(system : String) returns String;
    // Kopiert die vom Nutzer im Quellsystem angelegten Business Partner
    // (inkl. Adresse) in das Zielsystem. sourceSystem/targetSystem = Systems.ID.
    action copyData(sourceSystem : String, targetSystem : String) returns String;
    // Loescht die vom Nutzer im angegebenen System angelegten Objekte wieder
    // aus dem Backend (und die zugehoerigen Tracking-Eintraege). system = Systems.ID.
    action deleteFromBackend(system : String) returns String;
}