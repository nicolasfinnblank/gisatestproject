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

    // Geschaeftspartner-Sicht (PARENT): EINE Zeile je Person, unabhaengig vom
    // System. Gleiche Personen (gleiche Herkunft sourceConcatID) werden zu
    // einem Eintrag zusammengefasst. 1:n zu den System-Platzierungen.
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity TrackedPartners as select from my.CreatedObjects {
        key sourceConcatID as ID,
        firstName,
        lastName,
        firstName || ' ' || lastName as name : String,
        streetName,
        houseNumber,
        postCode,
        cityName,
        createdBy,
        systems : Association to many PartnerSystems on systems.partner_ID = $self.ID
    } where objectType = 'BusinessPartner'
    group by sourceConcatID, firstName, lastName, streetName, houseNumber, postCode, cityName, createdBy;

    // System-Platzierungen (CHILD): je (Person, System) ein Eintrag mit der
    // dort vom Backend vergebenen Nummer. Wird auf der Detailseite als Tabelle
    // gezeigt (alle Systeme, in denen der Partner liegt).
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity PartnerSystems as projection on my.CreatedObjects {
        key ID,
        sourceConcatID as partner_ID,
        system,
        objectKey,
        createdAt,
        createdBy
    } where objectType = 'BusinessPartner';

    // Katalog der Ziel-Systeme: gemeinsam gepflegt (CRUD fuer Generator-Rolle).
    entity Systems as projection on my.Systems;

    action generateTestCustomers(anzahl : Integer) returns String;
    // systems: IDs aus Systems (Mehrfachauswahl). Leer -> Default-System.
    action pushToBackend(systems : many String) returns String;
    // Kopiert die vom Nutzer im Quellsystem angelegten Business Partner
    // (inkl. Adresse) in das Zielsystem. sourceSystem/targetSystem = Systems.ID.
    action copyData(sourceSystem : String, targetSystem : String) returns String;
    // Loescht die vom Nutzer im angegebenen System angelegten Objekte wieder
    // aus dem Backend (und die zugehoerigen Tracking-Eintraege). system = Systems.ID.
    action deleteFromBackend(system : String) returns String;
}