using { gisa.mdg as my } from '../db/schema.cds';

@path : '/service/generator'
@requires : 'Generator'
service GeneratorService {

    // Die Namenslisten (Datenpools) sind bewusst NICHT Teil der Schnittstelle:
    // keine App zeigt sie an, nur service.js liest sie intern beim Anlegen.

    // Laeufe (Testdaten-Erstellungen). Zentral: ALLE Nutzer sehen alle Laeufe,
    // damit das Team weiss, was in den Systemen liegt. Kopieren/Loeschen
    // pruefen den Eigentuemer in der Aktion.
    @readonly
    entity Runs as projection on my.Runs {
        *,
        // Geschaeftspartner des Laufs (eine Zeile je Person UND System).
        partners : Association to many RunPartners on partners.run = $self,
        // Anzeige in der UI: Status auf Deutsch und als Farbe (3 gruen, 2 gelb, 1 rot)
        case status when 'created' then 'Angelegt' when 'deleted' then 'Gelöscht'
                    else 'Teilweise gelöscht' end as statusText : String,
        case status when 'created' then 3 when 'deleted' then 1 else 2 end as statusCriticality : Integer
    };

    // Startseite des Generators: fest die 5 neuesten EIGENEN Laeufe (Schnellblick).
    // Alles Weitere - alle Laeufe, Kopieren, Loeschen - im Tracking.
    @readonly
    entity MyRuns as projection on Runs where createdBy = $user
        order by createdAt desc limit 5;

    // Tracking-Protokoll (alle Objekte, Tabelle System|Objekt|Schluessel).
    @readonly
    @cds.redirection.target
    entity CreatedObjects as projection on my.CreatedObjects {
        *,
        // Anzeige-Reihenfolge der Objekttypen: Geschaeftspartner zuerst.
        case objectType when 'BusinessPartner' then 1 when 'Address' then 2
                        when 'Street' then 3 else 4 end as objectOrder : Integer,
        // Anzeige in der UI: Status auf Deutsch und als Farbe (3 gruen, 2 gelb, 1 rot)
        case status when 'created' then 'Angelegt' when 'deleted' then 'Gelöscht'
                    else 'Teilweise gelöscht' end as statusText : String,
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
        // Anzeige in der UI: Status auf Deutsch und als Farbe (3 gruen, 2 gelb, 1 rot)
        case status when 'created' then 'Angelegt' when 'deleted' then 'Gelöscht'
                    else 'Teilweise gelöscht' end as statusText : String,
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
