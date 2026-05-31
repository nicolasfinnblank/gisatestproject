using { test1Srv } from '../srv/service.cds';

annotate test1Srv.StreetNames with @UI.HeaderInfo: { TypeName: 'Street Name', TypeNamePlural: 'Street Names', Title: { Value: streetName } };
annotate test1Srv.StreetNames with {
  ID @UI.Hidden @Common.Text: { $value: streetName, ![@UI.TextArrangement]: #TextOnly }
};
annotate test1Srv.StreetNames with @UI.Identification: [{ Value: streetName }];
annotate test1Srv.StreetNames with {
  streetName @title: 'Street Name'
};

annotate test1Srv.StreetNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: streetName }
];

annotate test1Srv.StreetNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: streetName }
  ]
};

annotate test1Srv.StreetNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate test1Srv.StreetNames with @UI.SelectionFields: [
  streetName
];

annotate test1Srv.Cities with @UI.HeaderInfo: { TypeName: 'City', TypeNamePlural: 'Cities', Title: { Value: cityName } };
annotate test1Srv.Cities with {
  ID @UI.Hidden @Common.Text: { $value: cityName, ![@UI.TextArrangement]: #TextOnly }
};
annotate test1Srv.Cities with @UI.Identification: [{ Value: cityName }];
annotate test1Srv.Cities with {
  cityName @title: 'City Name'
};

annotate test1Srv.Cities with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: cityName }
];

annotate test1Srv.Cities with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: cityName }
  ]
};

annotate test1Srv.Cities with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate test1Srv.Cities with @UI.SelectionFields: [
  cityName
];

annotate test1Srv.Neighborhoods with @UI.HeaderInfo: { TypeName: 'Neighborhood', TypeNamePlural: 'Neighborhoods', Title: { Value: neighborhoodName } };
annotate test1Srv.Neighborhoods with {
  ID @UI.Hidden @Common.Text: { $value: neighborhoodName, ![@UI.TextArrangement]: #TextOnly }
};
annotate test1Srv.Neighborhoods with @UI.Identification: [{ Value: neighborhoodName }];
annotate test1Srv.Neighborhoods with {
  neighborhoodName @title: 'Neighborhood Name'
};

annotate test1Srv.Neighborhoods with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: neighborhoodName }
];

annotate test1Srv.Neighborhoods with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: neighborhoodName }
  ]
};

annotate test1Srv.Neighborhoods with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate test1Srv.Neighborhoods with @UI.SelectionFields: [
  neighborhoodName
];

annotate test1Srv.FirstNames with @UI.HeaderInfo: { TypeName: 'First Name', TypeNamePlural: 'First Names', Title: { Value: firstName } };
annotate test1Srv.FirstNames with {
  ID @UI.Hidden @Common.Text: { $value: firstName, ![@UI.TextArrangement]: #TextOnly }
};
annotate test1Srv.FirstNames with @UI.Identification: [{ Value: firstName }];
annotate test1Srv.FirstNames with {
  firstName @title: 'First Name'
};

annotate test1Srv.FirstNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: firstName }
];

annotate test1Srv.FirstNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: firstName }
  ]
};

annotate test1Srv.FirstNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate test1Srv.FirstNames with @UI.SelectionFields: [
  firstName
];

annotate test1Srv.LastNames with @UI.HeaderInfo: { TypeName: 'Last Name', TypeNamePlural: 'Last Names', Title: { Value: lastName } };
annotate test1Srv.LastNames with {
  ID @UI.Hidden @Common.Text: { $value: lastName, ![@UI.TextArrangement]: #TextOnly }
};
annotate test1Srv.LastNames with @UI.Identification: [{ Value: lastName }];
annotate test1Srv.LastNames with {
  lastName @title: 'Last Name'
};

annotate test1Srv.LastNames with @UI.LineItem: [
 { $Type: 'UI.DataField', Value: lastName }
];

annotate test1Srv.LastNames with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
 { $Type: 'UI.DataField', Value: lastName }
  ]
};

annotate test1Srv.LastNames with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate test1Srv.LastNames with @UI.SelectionFields: [
  lastName
];

