sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/Label",
  "sap/m/VBox"
], function (MessageToast, Dialog, Button, Select, Item, Label, VBox) {
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

  // Liste der konfigurierten Zielsysteme laden.
  function loadSystems() {
    return fetch("/service/generator/Systems?$select=ID,name,description,isDefault&$orderby=name", {
      headers: { "Accept": "application/json" }
    }).then(function (r) { return r.json(); }).then(function (j) { return j.value || []; });
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

    // Push: Zielsystem in einem Dialog waehlen, dann pushToBackend(system) rufen.
    onPush: function () {
      loadSystems().then(function (aSystems) {
        if (!aSystems.length) {
          MessageToast.show("Keine Zielsysteme konfiguriert.");
          return;
        }

        const oSelect = new Select({ width: "100%" });
        aSystems.forEach(function (s) {
          oSelect.addItem(new Item({
            key: s.ID,
            text: s.name + (s.description ? " – " + s.description : "") + (s.isDefault ? " (Standard)" : "")
          }));
        });
        const oDefault = aSystems.find(function (s) { return s.isDefault; });
        if (oDefault) { oSelect.setSelectedKey(oDefault.ID); }

        const oDialog = new Dialog({
          title: "An SAP-System pushen",
          content: new VBox({
            items: [ new Label({ text: "Zielsystem:", labelFor: oSelect }), oSelect ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Pushen",
            type: "Emphasized",
            press: function () {
              const sId = oSelect.getSelectedKey();
              oDialog.close();
              callAction("pushToBackend", { system: sId })
                .then(function (msg) { MessageToast.show(msg || "Gepusht"); })
                .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Zur Tracking-Liste (eigenstaendige FE-App unter anderer URL).
    onShowTracking: function () {
      window.location.href = "/tracking/webapp/index.html";
    },

    // Zur Zielsystem-Verwaltung (eigenstaendige FE-App unter anderer URL).
    onShowSystems: function () {
      window.location.href = "/systems/webapp/index.html";
    }
  };
});
