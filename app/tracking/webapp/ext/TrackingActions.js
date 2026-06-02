sap.ui.define([], function () {
  "use strict";

  return {
    // Zurueck zur Generator-Liste (eigenstaendige FE-App unter anderer URL).
    onBackToGenerator: function () {
      window.location.href = "/generator/webapp/index.html";
    }
  };
});
