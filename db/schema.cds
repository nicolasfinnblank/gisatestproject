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
    // Eigentuemer der Zeile (Login-ID). Wird beim Generieren gesetzt und sorgt
    // dafuer, dass jeder Nutzer nur seine eigenen Testdaten sieht/loescht/pusht.
    createdBy : String(255);
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

// Protokoll der angelegten Entitaeten: WELCHES Objekt wurde in WELCHEM
// SAP-System mit WELCHEM Schluessel angelegt. Wird beim Push befuellt und
// bleibt als Historie erhalten (anders als GeneratorData, das beim erneuten
// Generieren geleert wird). Basis fuer die spaeteren Schritte Multi-System
// und Copy.
entity CreatedObjects : cuid
{
    // Ziel-SAP-System (vorerst konstant; wird mit Multi-System parametrisiert).
    system         : String(100);
    // Art des angelegten Objekts: Street | City | Address | BusinessPartner.
    objectType     : String(50);
    // Vom Ziel-System vergebener Schluessel (z.B. businessPartnerNumber).
    objectKey      : String(100);
    // Verweis auf die GeneratorData-Zeile, aus der das Objekt entstand.
    sourceConcatID : String;
    // Wer den Push ausgeloest hat (Login-ID) – fuer Multi-User-Filterung.
    createdBy      : String(255);
    // Zeitpunkt des Pushs (ISO-Timestamp).
    createdAt      : Timestamp;
}
