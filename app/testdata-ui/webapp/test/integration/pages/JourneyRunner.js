sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"gisa/testdata/testdataui/test/integration/pages/GeneratorDataList",
	"gisa/testdata/testdataui/test/integration/pages/GeneratorDataObjectPage"
], function (JourneyRunner, GeneratorDataList, GeneratorDataObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('gisa/testdata/testdataui') + '/test/flp.html#app-preview',
        pages: {
			onTheGeneratorDataList: GeneratorDataList,
			onTheGeneratorDataObjectPage: GeneratorDataObjectPage
        },
        async: true
    });

    return runner;
});

