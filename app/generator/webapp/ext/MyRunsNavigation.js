sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "./GeneratorActions"
], function (ControllerExtension, GeneratorActions) {
  "use strict";

  // Startseite "Meine letzten Laeufe": Der Klick auf eine Zeile soll NICHT die
  // Detailseite im Generator oeffnen, sondern dieselbe Seite im Tracking.
  // Fiori Elements fragt vor jeder Navigation hier nach; true = selbst erledigt.
  return ControllerExtension.extend("gisamdg.generator.ext.MyRunsNavigation", {
    override: {
      routing: {
        onBeforeNavigation: function (mParams) {
          const oContext = mParams && mParams.bindingContext;
          if (!oContext) { return false; }
          GeneratorActions.openRun(oContext.getProperty("ID"));
          return true;
        }
      }
    }
  });
});
