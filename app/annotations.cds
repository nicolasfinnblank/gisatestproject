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
// --- Generierte Stammdaten (Ergebnis-Liste) ---
//
annotate GeneratorService.GeneratorData with @UI.HeaderInfo: {
  TypeName: 'Generierte Entität',
  TypeNamePlural: 'Generierte Stammdaten',
  Title: { Value: lastName },
  Description: { Value: firstName }
};

annotate GeneratorService.GeneratorData with {
  concatID         @UI.Hidden;
  createdBy        @UI.Hidden  @title: 'Erstellt von';
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
  { $Type: 'UI.DataField', Value: neighborhoodName }
];

annotate GeneratorService.GeneratorData with @UI.SelectionFields: [
  lastName, cityName, postCode
];

annotate GeneratorService.GeneratorData with @UI.FieldGroup #Details: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: firstName },
    { $Type: 'UI.DataField', Value: lastName },
    { $Type: 'UI.DataField', Value: streetName },
    { $Type: 'UI.DataField', Value: houseNumber },
    { $Type: 'UI.DataField', Value: postCode },
    { $Type: 'UI.DataField', Value: cityName },
    { $Type: 'UI.DataField', Value: neighborhoodName }
  ]
};

annotate GeneratorService.GeneratorData with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Details', Label: 'Details', Target: '@UI.FieldGroup#Details' }
];

//
// --- Tracking: angelegte Objekte je Zielsystem ---
//
annotate GeneratorService.CreatedObjects with @UI.HeaderInfo: {
  TypeName: 'Angelegtes Objekt',
  TypeNamePlural: 'Angelegte Objekte',
  Title: { Value: objectType },
  Description: { Value: objectKey }
};

annotate GeneratorService.CreatedObjects with {
  ID             @UI.Hidden;
  sourceConcatID @UI.Hidden  @title: 'Quelle (concatID)';
  system         @title: 'System';
  objectType     @title: 'Objekttyp';
  objectKey      @title: 'Schlüssel';
  createdBy      @title: 'Erstellt von';
  createdAt      @title: 'Erstellt am';
};

annotate GeneratorService.CreatedObjects with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: system },
  { $Type: 'UI.DataField', Value: objectType },
  { $Type: 'UI.DataField', Value: objectKey },
  { $Type: 'UI.DataField', Value: createdBy },
  { $Type: 'UI.DataField', Value: createdAt }
];

annotate GeneratorService.CreatedObjects with @UI.SelectionFields: [
  system, objectType, createdBy
];

annotate GeneratorService.CreatedObjects with @UI.FieldGroup #Details: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: system },
    { $Type: 'UI.DataField', Value: objectType },
    { $Type: 'UI.DataField', Value: objectKey },
    { $Type: 'UI.DataField', Value: sourceConcatID },
    { $Type: 'UI.DataField', Value: createdBy },
    { $Type: 'UI.DataField', Value: createdAt }
  ]
};

annotate GeneratorService.CreatedObjects with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Details', Label: 'Details', Target: '@UI.FieldGroup#Details' }
];

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
  serviceName @title: 'Service';
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

