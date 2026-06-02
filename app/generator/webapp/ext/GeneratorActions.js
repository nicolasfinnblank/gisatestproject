sap.ui.define([
  "sap/m/MessageToast"
], function (MessageToast) {
  "use strict";

  // Ruft eine unbound OData-Action des Generator-Service auf.
  function callAction(sName, oBody) {
    return fetch("/service/generator/" + sName, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(oBody || {})
    }).then(async function (r) {
      const t = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        throw new Error((t.error && t.error.message) || ("HTTP " + r.status));
      }
      return t.value;
    });
  }

  // Tabelle nach einer Aktion neu laden (defensiv ueber die FE-ExtensionAPI).
  function refresh(oApi) {
    try {
      if (oApi && typeof oApi.refresh === "function") { oApi.refresh(); }
    } catch (e) { /* notfalls 'Go' druecken */ }
  }

  return {
    onGenerate: function () {
      const oApi = this;
      const sVal = window.prompt("Wie viele Datensätze generieren?", "10");
      if (sVal === null) { return; }
      const iCount = parseInt(sVal, 10) || 10;
      callAction("generateTestCustomers", { anzahl: iCount })
        .then(function (msg) {
          MessageToast.show(msg || "Generiert");
          refresh(oApi);
        })
        .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    onPush: function () {
      callAction("pushToBackend", {})
        .then(function (msg) { MessageToast.show(msg || "An Backend gepusht"); })
        .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Zur Tracking-Liste (eigenstaendige FE-App unter anderer URL).
    onShowTracking: function () {
      window.location.href = "/tracking/webapp/index.html";
    }
  };
});
