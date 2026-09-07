sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/MultiComboBox",
  "sap/ui/core/Item",
  "sap/m/Label",
  "sap/m/VBox"
], function (MessageToast, Dialog, Button, MultiComboBox, Item, Label, VBox) {
  "use strict";

  // Adresse der Schwester-Apps. Lokal liegen sie unter /<app>/webapp/index.html,
  // auf BTP liefert sie das HTML5-Repository unter /gisamdg<app>/index.html aus.
  // Am eigenen Pfad erkennen wir, in welcher Umgebung wir laufen.
  function appUrl(sApp) {
    return window.location.pathname.indexOf("/gisamdg") === 0
      ? "/gisamdg" + sApp + "/index.html"
      : "/" + sApp + "/webapp/index.html";
  }

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
    // Testdaten aus den Pools erzeugen.
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

    // Push: ein ODER MEHRERE Zielsysteme waehlen, dann pushToBackend(systems) rufen.
    onPush: function () {
      loadSystems().then(function (aSystems) {
        if (!aSystems.length) {
          MessageToast.show("Keine Zielsysteme konfiguriert.");
          return;
        }

        const oBox = new MultiComboBox({ width: "100%" });
        aSystems.forEach(function (s) {
          oBox.addItem(new Item({
            key: s.ID,
            text: s.name + (s.description ? " – " + s.description : "") + (s.isDefault ? " (Standard)" : "")
          }));
        });
        const oDefault = aSystems.find(function (s) { return s.isDefault; });
        if (oDefault) { oBox.setSelectedKeys([oDefault.ID]); }

        const oDialog = new Dialog({
          title: "An SAP-System(e) pushen",
          content: new VBox({
            items: [ new Label({ text: "Zielsysteme (Mehrfachauswahl):", labelFor: oBox }), oBox ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Pushen",
            type: "Emphasized",
            press: function () {
              const aIds = oBox.getSelectedKeys();
              if (!aIds.length) { MessageToast.show("Bitte mindestens ein Zielsystem wählen."); return; }
              oDialog.close();
              callAction("pushToBackend", { systems: aIds })
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

    // Zur Tracking-Liste. Dort liegen Kopieren und Loeschen, weil beide auf
    // den Tracking-Eintraegen arbeiten.
    onShowTracking: function () {
      window.location.href = appUrl("tracking");
    },

    // Zur Zielsystem-Verwaltung.
    onShowSystems: function () {
      window.location.href = appUrl("systems");
    }
  };
});
