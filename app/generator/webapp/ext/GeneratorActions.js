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

  // Aktualisiert die List-Report-Tabelle nach einer Aktion (defensiv, da der
  // 'this'-Kontext je nach FE-Version variiert).
  function refresh(oCtx) {
    try {
      if (oCtx && typeof oCtx.refresh === "function") { oCtx.refresh(); return; }
      if (oCtx && oCtx.getExtensionAPI) { oCtx.getExtensionAPI().refresh(); return; }
    } catch (e) { /* Nutzer kann notfalls 'Go' druecken */ }
  }

  return {
    onGenerate: function () {
      const oThis = this;
      const sVal = window.prompt("Wie viele Datensätze generieren?", "5");
      if (sVal === null) { return; }
      const n = parseInt(sVal, 10) || 10;
      callAction("generateTestCustomers", { anzahl: n })
        .then(function (msg) {
          MessageToast.show(msg || "Generiert");
          refresh(oThis);
        })
        .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    onPush: function () {
      callAction("pushToBackend", {})
        .then(function (msg) { MessageToast.show(msg || "An Backend gepusht"); })
        .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    }
  };
});
