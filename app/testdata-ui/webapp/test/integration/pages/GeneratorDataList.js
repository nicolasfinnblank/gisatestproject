sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'gisa.testdata.testdataui',
            componentId: 'GeneratorDataList',
            contextPath: '/GeneratorData'
        },
        CustomPageDefinitions
    );
});