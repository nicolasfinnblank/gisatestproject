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

