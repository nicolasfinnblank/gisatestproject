sap.ui.define([
  "sap/fe/core/AppComponent",
  // Vorab laden: UI5 sucht die Controller-Erweiterung aus manifest.json
  // (Klick auf einen Lauf -> Tracking) sonst synchron und findet sie nicht.
  "./ext/MyRunsNavigation"
], function (AppComponent) {
  "use strict";

  return AppComponent.extend("gisamdg.generator.Component", {
    metadata: {
      manifest: "json"
    }
  });
});
