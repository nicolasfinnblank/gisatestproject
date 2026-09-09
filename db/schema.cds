namespace gisa.mdg;

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

// Quittung des LETZTEN Laufs je Nutzer: die zuletzt generierten Personen.
// Wird beim naechsten Lauf des Nutzers geleert. Die dauerhafte Historie ist
// Runs/CreatedObjects.
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

    // Eigentuemer der Zeile (Login-ID). Jeder Nutzer sieht nur seine eigenen.
    createdBy : String(255);
    // Lauf, in dem diese Person erzeugt wurde.
    run : Association to Runs;
}

// Katalog der Ziel-SAP-Systeme, in die gepusht werden kann. Lokal sind beide
// als Mock hinterlegt (serviceName -> konfigurierter CAP-Service); in Produktion
// zeigen sie auf echte S/4-Destinationen. Gemeinsame Konfiguration (nicht pro
// Nutzer). Basis fuer Multi-System-Push und spaeter Copy.

entity Systems : cuid
{
    // Kurzer Anzeigename / Code, z.B. "S4D", "S4Q".
    name        : String(20)
        @mandatory;
    description : String(200);
    // Name des konfigurierten CAP-Remote-Service (package.json cds.requires),
    // ueber den dieses System angesprochen wird: BackendAPI_2 / BackendAPI_3 / ...
    serviceName : String(100)
        @mandatory;
    // Default-Ziel, wenn beim Push kein System gewaehlt wird.
    isDefault   : Boolean default false;
}

// Ein Lauf = eine Testdaten-Erstellung ("Testfall 4711"): N Personen, in
// einem oder mehreren SAP-Systemen angelegt. Der Lauf ist die Einheit, in der
// Tester denken - Kopieren und Loeschen wirken pro Lauf.
entity Runs : cuid
{
    // Bezeichnung, vom Nutzer vergeben (z.B. "Testfall 4711").
    label        : String(100);
    createdBy    : String(255);
    createdAt    : Timestamp;
    // Anzahl generierter Personen (Geschaeftspartner je System).
    partnerCount : Integer;
    // Systeme, in denen der Lauf aktuell (nicht geloescht) liegt, z.B. "S4D, S4Q".
    // Wird vom Service nach jeder Aenderung neu berechnet (Anzeige in der Liste).
    systems      : String(500);
    // created | partially deleted | deleted - ebenfalls vom Service gepflegt.
    status       : String(20) default 'created';
    objects      : Composition of many CreatedObjects on objects.run = $self;
}

// Protokoll der angelegten Entitaeten: WELCHES Objekt wurde in WELCHEM
// SAP-System mit WELCHEM Schluessel angelegt (Tabelle System|Object|Key aus
// der Aufgabenstellung). Wird beim Anlegen befuellt und bleibt als Historie
// erhalten; geloeschte Objekte bekommen einen Status statt zu verschwinden.

entity CreatedObjects : cuid
{
    // Lauf, zu dem das Objekt gehoert.
    run            : Association to Runs;
    // Ziel-SAP-System (Systems.name).
    system         : String(100);
    // Quell-SAP-System, falls dieser Eintrag durch eine Kopie entstanden ist.
    // NULL bei direkter Anlage (Quelle = Generator selbst).
    sourceSystem   : String(100);
    // Art des angelegten Objekts: Street | City | Address | BusinessPartner.
    objectType     : String(50);
    // Vom Ziel-System vergebener Schluessel (z.B. businessPartnerNumber).
    objectKey      : String(100);
    // Verweis auf die generierte Person (GeneratorData.concatID) - verbindet
    // dieselbe Person ueber alle Systeme hinweg.
    sourceConcatID : String;
    // Wer das Objekt angelegt hat (Login-ID).
    createdBy      : String(255);
    // Zeitpunkt der Anlage (ISO-Timestamp).
    createdAt      : Timestamp;
    // created | deleted. Geloeschte Objekte bleiben als Historie sichtbar.
    status         : String(20) default 'created';
    deletedAt      : Timestamp;
    // Beschreibende Stammdaten - nur bei objectType = 'BusinessPartner' gefuellt.
    firstName      : String(50);
    lastName       : String(50);
    streetName     : String(100);
    houseNumber    : String(10);
    postCode       : String(5);
    cityName       : String(100);
}
