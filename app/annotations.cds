using { GeneratorService } from '../srv/service.cds';

annotate GeneratorService.StreetNames with @UI.HeaderInfo: { TypeName: 'Street Name', TypeNamePlural: 'Street Names', Title: { Value: streetName } };
annotate GeneratorService.StreetNames with {
  ID @UI.Hidden @Common.Text: { $value: streetName, ![@UI.TextArrangement]: #TextOnly }
};
annotate GeneratorService.StreetNames with @UI.Identification: [{ Value: streetName }];
annotate GeneratorService.StreetNames with {
  streetName @title: 'Street Name'
};

annotate GeneratorService.StreetNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: streetName }
];

annotate GeneratorService.StreetNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: streetName }
  ]
};

annotate GeneratorService.StreetNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate GeneratorService.StreetNames with @UI.SelectionFields: [
  streetName
];

annotate GeneratorService.Cities with @UI.HeaderInfo: { TypeName: 'City', TypeNamePlural: 'Cities', Title: { Value: cityName } };
annotate GeneratorService.Cities with {
  ID @UI.Hidden @Common.Text: { $value: cityName, ![@UI.TextArrangement]: #TextOnly }
};
annotate GeneratorService.Cities with @UI.Identification: [{ Value: cityName }];
annotate GeneratorService.Cities with {
  cityName @title: 'City Name'
};

annotate GeneratorService.Cities with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: cityName }
];

annotate GeneratorService.Cities with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: cityName }
  ]
};

annotate GeneratorService.Cities with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate GeneratorService.Cities with @UI.SelectionFields: [
  cityName
];

annotate GeneratorService.Neighborhoods with @UI.HeaderInfo: { TypeName: 'Neighborhood', TypeNamePlural: 'Neighborhoods', Title: { Value: neighborhoodName } };
annotate GeneratorService.Neighborhoods with {
  ID @UI.Hidden @Common.Text: { $value: neighborhoodName, ![@UI.TextArrangement]: #TextOnly }
};
annotate GeneratorService.Neighborhoods with @UI.Identification: [{ Value: neighborhoodName }];
annotate GeneratorService.Neighborhoods with {
  neighborhoodName @title: 'Neighborhood Name'
};

annotate GeneratorService.Neighborhoods with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: neighborhoodName }
];

annotate GeneratorService.Neighborhoods with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: neighborhoodName }
  ]
};

annotate GeneratorService.Neighborhoods with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate GeneratorService.Neighborhoods with @UI.SelectionFields: [
  neighborhoodName
];

annotate GeneratorService.FirstNames with @UI.HeaderInfo: { TypeName: 'First Name', TypeNamePlural: 'First Names', Title: { Value: firstName } };
annotate GeneratorService.FirstNames with {
  ID @UI.Hidden @Common.Text: { $value: firstName, ![@UI.TextArrangement]: #TextOnly }
};
annotate GeneratorService.FirstNames with @UI.Identification: [{ Value: firstName }];
annotate GeneratorService.FirstNames with {
  firstName @title: 'First Name'
};

annotate GeneratorService.FirstNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: firstName }
];

annotate GeneratorService.FirstNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: firstName }
  ]
};

annotate GeneratorService.FirstNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate GeneratorService.FirstNames with @UI.SelectionFields: [
  firstName
];

annotate GeneratorService.LastNames with @UI.HeaderInfo: { TypeName: 'Last Name', TypeNamePlural: 'Last Names', Title: { Value: lastName } };
annotate GeneratorService.LastNames with {
  ID @UI.Hidden @Common.Text: { $value: lastName, ![@UI.TextArrangement]: #TextOnly }
};
annotate GeneratorService.LastNames with @UI.Identification: [{ Value: lastName }];
annotate GeneratorService.LastNames with {
  lastName @title: 'Last Name'
};

annotate GeneratorService.LastNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: lastName }
];

annotate GeneratorService.LastNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: lastName }
  ]
};

annotate GeneratorService.LastNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate GeneratorService.LastNames with @UI.SelectionFields: [
  lastName
];

//
// --- Generator: Quittung des letzten Laufs ---
//
annotate GeneratorService.GeneratorData with @UI.HeaderInfo: {
  TypeName: 'Person',
  TypeNamePlural: 'Letzter Lauf',
  Title: { Value: lastName },
  Description: { Value: firstName }
};

annotate GeneratorService.GeneratorData with {
  concatID         @UI.Hidden;
  createdBy        @UI.Hidden  @title: 'Erstellt von';
  run              @UI.Hidden  @title: 'Lauf';
  firstName        @title: 'Vorname';
  lastName         @title: 'Nachname';
  streetName       @title: 'Straße';
  houseNumber      @title: 'Hausnummer';
  postCode         @title: 'PLZ';
  cityName         @title: 'Stadt';
  neighborhoodName @title: 'Stadtteil';
};

annotate GeneratorService.GeneratorData with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: firstName },
  { $Type: 'UI.DataField', Value: lastName },
  { $Type: 'UI.DataField', Value: streetName },
  { $Type: 'UI.DataField', Value: houseNumber },
  { $Type: 'UI.DataField', Value: postCode },
  { $Type: 'UI.DataField', Value: cityName },
  { $Type: 'UI.DataField', Value: run.label, Label: 'Lauf' }
];

annotate GeneratorService.GeneratorData with @UI.SelectionFields: [
  lastName, cityName
];

annotate GeneratorService.GeneratorData with @UI.FieldGroup #Details: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: firstName },
    { $Type: 'UI.DataField', Value: lastName },
    { $Type: 'UI.DataField', Value: streetName },
    { $Type: 'UI.DataField', Value: houseNumber },
    { $Type: 'UI.DataField', Value: postCode },
    { $Type: 'UI.DataField', Value: cityName },
    { $Type: 'UI.DataField', Value: neighborhoodName },
    { $Type: 'UI.DataField', Value: run.label, Label: 'Lauf' }
  ]
};

annotate GeneratorService.GeneratorData with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Details',      Label: 'Person',                 Target: '@UI.FieldGroup#Details' },
  { $Type: 'UI.ReferenceFacet', ID: 'Placements',   Label: 'Angelegt in',            Target: 'placements/@UI.LineItem#Placement' }
];

//
// --- Tracking: Laeufe (Liste) mit Geschaeftspartnern und Objekten (Detail) ---
//
annotate GeneratorService.Runs with @UI.HeaderInfo: {
  TypeName: 'Lauf',
  TypeNamePlural: 'Testdaten-Läufe',
  Title: { Value: label },
  Description: { Value: systems }
};

annotate GeneratorService.Runs with {
  ID           @UI.Hidden;
  label        @title: 'Bezeichnung';
  createdBy    @title: 'Erstellt von';
  createdAt    @title: 'Erstellt am';
  partnerCount @title: 'Geschäftspartner';
  systems      @title: 'Systeme';
  status       @title: 'Status';
};

annotate GeneratorService.Runs with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: label },
  { $Type: 'UI.DataField', Value: createdAt },
  { $Type: 'UI.DataField', Value: createdBy },
  { $Type: 'UI.DataField', Value: systems },
  { $Type: 'UI.DataField', Value: partnerCount },
  { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality }
];

annotate GeneratorService.Runs with @UI.PresentationVariant: {
  SortOrder: [{ Property: createdAt, Descending: true }],
  Visualizations: ['@UI.LineItem']
};

annotate GeneratorService.Runs with @UI.SelectionFields: [
  createdBy, status, label
];

annotate GeneratorService.Runs with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: label },
    { $Type: 'UI.DataField', Value: createdAt },
    { $Type: 'UI.DataField', Value: createdBy },
    { $Type: 'UI.DataField', Value: systems },
    { $Type: 'UI.DataField', Value: partnerCount },
    { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality }
  ]
};

annotate GeneratorService.Runs with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main',     Label: 'Lauf',                  Target: '@UI.FieldGroup#Main' },
  { $Type: 'UI.ReferenceFacet', ID: 'Partners', Label: 'Geschäftspartner',      Target: 'partners/@UI.PresentationVariant' },
  { $Type: 'UI.ReferenceFacet', ID: 'Objects',  Label: 'Alle angelegten Objekte', Target: 'objects/@UI.PresentationVariant' }
];

// Geschaeftspartner des Laufs: eine Zeile je Person UND System.
annotate GeneratorService.RunPartners with {
  ID             @UI.Hidden;
  run            @UI.Hidden;
  sourceConcatID @UI.Hidden;
  objectType     @UI.Hidden;
  firstName      @title: 'Vorname';
  lastName       @title: 'Nachname';
  streetName     @title: 'Straße';
  houseNumber    @title: 'Hausnummer';
  postCode       @title: 'PLZ';
  cityName       @title: 'Stadt';
  system         @title: 'System';
  objectKey      @title: 'Geschäftspartner-Nr.';
  sourceSystem   @title: 'Kopiert aus';
  status         @title: 'Status';
  createdAt      @title: 'Angelegt am';
  deletedAt      @title: 'Gelöscht am';
};

// Eine Zeile je Geschaeftspartner (und System) mit ALLEN Daten der Person.
// ![@UI.Importance]: #High sorgt dafuer, dass Fiori Elements die Spalten auch
// in der Detailseiten-Tabelle alle anzeigt (statt sie als "unwichtig" auszublenden).
annotate GeneratorService.RunPartners with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: firstName,   ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: lastName,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: streetName,  ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: houseNumber, ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: postCode,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: cityName,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: system,      ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: objectKey,   ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality, ![@UI.Importance]: #High }
];

annotate GeneratorService.RunPartners with @UI.PresentationVariant: {
  SortOrder: [
    { Property: lastName }, { Property: firstName }, { Property: system }
  ],
  Visualizations: ['@UI.LineItem']
};

// Kompakte Variante fuer die Quittung im Generator (Person ist dort schon bekannt).
annotate GeneratorService.RunPartners with @UI.LineItem #Placement: [
  { $Type: 'UI.DataField', Value: system },
  { $Type: 'UI.DataField', Value: objectKey },
  { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality }
];

// Alle Objekte des Laufs: die Tabelle System | Objekt | Schluessel.
annotate GeneratorService.CreatedObjects with {
  ID             @UI.Hidden;
  run            @UI.Hidden;
  sourceConcatID @UI.Hidden;
  system         @title: 'System';
  objectType     @title: 'Objekttyp';
  objectKey      @title: 'Schlüssel';
  sourceSystem   @title: 'Kopiert aus';
  status         @title: 'Status';
  createdBy      @title: 'Erstellt von';
  createdAt      @title: 'Angelegt am';
  deletedAt      @title: 'Gelöscht am';
};

annotate GeneratorService.CreatedObjects with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: system },
  { $Type: 'UI.DataField', Value: objectType },
  { $Type: 'UI.DataField', Value: objectKey },
  { $Type: 'UI.DataField', Value: status, Criticality: statusCriticality },
  { $Type: 'UI.DataField', Value: sourceSystem },
  { $Type: 'UI.DataField', Value: createdAt },
  { $Type: 'UI.DataField', Value: deletedAt }
];

annotate GeneratorService.CreatedObjects with @UI.PresentationVariant: {
  SortOrder: [
    { Property: system }, { Property: objectType }, { Property: objectKey }
  ],
  Visualizations: ['@UI.LineItem']
};

//
// --- Ziel-Systeme (Verwaltung) ---
//
annotate GeneratorService.Systems with @UI.HeaderInfo: {
  TypeName: 'Zielsystem',
  TypeNamePlural: 'Zielsysteme',
  Title: { Value: name },
  Description: { Value: description }
};

annotate GeneratorService.Systems with {
  ID          @UI.Hidden;
  name        @title: 'System';
  description @title: 'Beschreibung';
  serviceName @title: 'Technischer Name (Destination)';
  isDefault   @title: 'Standard';
};

annotate GeneratorService.Systems with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: name },
  { $Type: 'UI.DataField', Value: description },
  { $Type: 'UI.DataField', Value: serviceName },
  { $Type: 'UI.DataField', Value: isDefault }
];

annotate GeneratorService.Systems with @UI.SelectionFields: [
  name, isDefault
];

annotate GeneratorService.Systems with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: name },
    { $Type: 'UI.DataField', Value: description },
    { $Type: 'UI.DataField', Value: serviceName },
    { $Type: 'UI.DataField', Value: isDefault }
  ]
};

annotate GeneratorService.Systems with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'Allgemein', Target: '@UI.FieldGroup#Main' }
];

