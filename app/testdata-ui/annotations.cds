using test1Srv as service from '../../srv/service';

annotate service.GeneratorData with @(
    UI.HeaderInfo: {
        TypeName: 'Generated Customer',
        TypeNamePlural: 'Generated Customers',
        Title: { Value: firstName }
    },
    UI.SelectionFields: [ firstName, lastName, cityName ],
    UI.LineItem: [
        {
            $Type: 'UI.DataFieldForAction',
            Action: 'test1Srv.EntityContainer/generateTestCustomers',
            Label: 'Generate Customers',
            ![@UI.Hidden]: false
        },
        { $Type: 'UI.DataField', Label: 'First Name',   Value: firstName },
        { $Type: 'UI.DataField', Label: 'Last Name',    Value: lastName },
        { $Type: 'UI.DataField', Label: 'Street',       Value: streetName },
        { $Type: 'UI.DataField', Label: 'House No.',    Value: houseNumber },
        { $Type: 'UI.DataField', Label: 'Post Code',    Value: postCode },
        { $Type: 'UI.DataField', Label: 'City',         Value: cityName },
        { $Type: 'UI.DataField', Label: 'Neighborhood', Value: neighborhoodName },
    ],
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Label: 'First Name',   Value: firstName },
            { $Type: 'UI.DataField', Label: 'Last Name',    Value: lastName },
            { $Type: 'UI.DataField', Label: 'Street',       Value: streetName },
            { $Type: 'UI.DataField', Label: 'House No.',    Value: houseNumber },
            { $Type: 'UI.DataField', Label: 'Post Code',    Value: postCode },
            { $Type: 'UI.DataField', Label: 'City',         Value: cityName },
            { $Type: 'UI.DataField', Label: 'Neighborhood', Value: neighborhoodName },
        ],
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'GeneratedFacet1',
            Label: 'General Information',
            Target: '@UI.FieldGroup#GeneratedGroup',
        },
    ],
);
