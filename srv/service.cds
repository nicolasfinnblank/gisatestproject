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

    // Quittung des letzten Laufs: jeder Nutzer sieht nur seine eigenen Zeilen.
    @readonly
    @restrict: [
        { grant: 'READ', to: 'Generator', where: 'createdBy = $user' }
    ]
    entity GeneratorData as projection on my.GeneratorData {
        *,
        // Wo liegt diese Person? (System + dort vergebene Geschaeftspartner-Nummer)
        placements : Association to many RunPartners
            on placements.sourceConcatID = concatID and placements.run = run
    };

    // Laeufe (Testdaten-Erstellungen). Zentral: ALLE Nutzer sehen alle Laeufe,
    // damit das Team weiss, was in den Systemen liegt. Kopieren/Loeschen
    // pruefen den Eigentuemer in der Aktion.
    @readonly
    entity Runs as projection on my.Runs {
        *,
        // Geschaeftspartner des Laufs (eine Zeile je Person UND System).
        partners : Association to many RunPartners on partners.run = $self,
        // Farbe fuer die UI: 3 = gruen (angelegt), 2 = gelb (teilweise), 1 = rot (geloescht)
        case status when 'created' then 3 when 'deleted' then 1 else 2 end as statusCriticality : Integer
    };

    // Tracking-Protokoll (alle Objekte, Tabelle System|Objekt|Schluessel).
    @readonly
    @cds.redirection.target
    entity CreatedObjects as projection on my.CreatedObjects {
        *,
        // Anzeige-Reihenfolge der Objekttypen: Geschaeftspartner zuerst.
        case objectType when 'BusinessPartner' then 1 when 'Address' then 2
                        when 'Street' then 3 else 4 end as objectOrder : Integer,
        // Farbe fuer die UI: 3 = gruen (angelegt), 2 = gelb (teilweise), 1 = rot (geloescht)
        case status when 'created' then 3 when 'deleted' then 1 else 2 end as statusCriticality : Integer
    };

    // Nur die Geschaeftspartner aus dem Protokoll (mit Name/Adresse).
    @readonly
    entity RunPartners as projection on my.CreatedObjects {
        *,
        // Die vier Objekte dieser Person in diesem System (Street, City,
        // Address, BusinessPartner) - fuer die Detailseite der Person.
        objects : Association to many CreatedObjects
            on objects.run.ID = run.ID and objects.sourceConcatID = sourceConcatID
               and objects.system = system,
        // Farbe fuer die UI: 3 = gruen (angelegt), 2 = gelb (teilweise), 1 = rot (geloescht)
        case status when 'created' then 3 when 'deleted' then 1 else 2 end as statusCriticality : Integer
    } where objectType = 'BusinessPartner';

    // Katalog der Ziel-Systeme: gemeinsam gepflegt (CRUD fuer Generator-Rolle).
    entity Systems as projection on my.Systems;

    // Ein Schritt: Personen aus den Pools generieren UND in allen gewaehlten
    // Systemen anlegen. Ergebnis ist ein neuer Lauf. systems leer -> Default.
    // Ergebnis: ok=false, wenn das Zielsystem mittendrin abgebrochen hat - dann
    // sind Lauf und die bis dahin angelegten Objekte trotzdem protokolliert.
    type CreateResult { ok : Boolean; message : String; runID : UUID; }
    action generateAndCreate(anzahl : Integer, label : String, systems : many String) returns CreateResult;

    // Kopiert die Geschaeftspartner eines Laufs (inkl. Adresse) aus einem
    // System, in dem der Lauf liegt, in ein weiteres System. Nur eigene Laeufe.
    // sourceSystem leer -> erstes System des Laufs, das nicht das Ziel ist.
    action copyRun(run : UUID, sourceSystem : String, targetSystem : String) returns String;

    // Loescht die Objekte eines Laufs in EINEM System wieder aus dem Backend.
    // Die Protokoll-Eintraege bleiben mit Status 'deleted' erhalten. Nur eigene Laeufe.
    action deleteRun(run : UUID, system : String) returns String;
}
