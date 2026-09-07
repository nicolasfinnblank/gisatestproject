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

  // Adresse der Schwester-Apps. Lokal liegen sie unter /<app>/webapp/index.html,
  // auf BTP liefert sie das HTML5-Repository unter /gisamdg<app>/index.html aus.
  // Am eigenen Pfad erkennen wir, in welcher Umgebung wir laufen.
  function appUrl(sApp) {
    // Erstes Pfadsegment: "gisamdggenerator" (Standalone-Approuter) oder
    // "gisamasterdatageneratorservice.gisamdggenerator-1.0.0" (Work Zone).
    // Darin nur den App-Teil tauschen, damit der Rest der Umgebung erhalten bleibt.
    var seg = window.location.pathname.split("/")[1] || "";
    if (seg.indexOf("gisamdg") >= 0) {
      return "/" + seg.replace(/gisamdg(generator|tracking|systems)/, "gisamdg" + sApp) + "/index.html";
    }
    return "/" + sApp + "/webapp/index.html";
  }

  // Adresse des CAP-Service RELATIV zur App (wie der Service-Pfad im manifest.json).
  // Auf BTP leitet der jeweilige Approuter <app>/service/generator/* an das
  // Backend weiter, lokal uebernimmt srv/server.js die Umschreibung.
  function serviceUrl(sPath) {
    return sap.ui.require.toUrl("gisamdg/tracking/service/generator/") + (sPath || "");
  }

  // Ruft eine unbound OData-Action des Generator-Service auf.
  function callAction(sName, oBody) {
    return fetch(serviceUrl(sName), {
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
    return fetch(serviceUrl("Systems?$select=ID,name,description,isDefault&$orderby=name"), {
      headers: { "Accept": "application/json" }
    }).then(function (r) { return r.json(); }).then(function (j) { return j.value || []; });
  }

  // Tabelle nach einer Aktion neu laden (defensiv ueber die FE-ExtensionAPI).
  function refresh(oApi) {
    try {
      if (oApi && typeof oApi.refresh === "function") { oApi.refresh(); }
    } catch (e) { /* notfalls 'Go' druecken */ }
  }

  function buildSystemSelect(aSystems) {
    const oSel = new Select({ width: "100%" });
    aSystems.forEach(function (s) {
      oSel.addItem(new Item({
        key: s.ID,
        text: s.name + (s.description ? " – " + s.description : "") + (s.isDefault ? " (Standard)" : "")
      }));
    });
    return oSel;
  }

  return {
    // Kopiert die im Quellsystem angelegten Partner ins Zielsystem. Gehoert
    // hierher, weil die Logik auf den Tracking-Eintraegen (CreatedObjects)
    // arbeitet, nicht auf frisch generierten Daten.
    onCopy: function () {
      const oApi = this;
      loadSystems().then(function (aSystems) {
        if (aSystems.length < 2) {
          MessageToast.show("Mindestens zwei Zielsysteme nötig (siehe 'Systeme verwalten').");
          return;
        }
        const oFrom = buildSystemSelect(aSystems);
        const oTo = buildSystemSelect(aSystems);
        const oDefault = aSystems.find(function (s) { return s.isDefault; }) || aSystems[0];
        const oOther = aSystems.find(function (s) { return s.ID !== oDefault.ID; });
        oFrom.setSelectedKey(oDefault.ID);
        oTo.setSelectedKey(oOther.ID);

        const oDialog = new Dialog({
          title: "Daten zwischen Systemen kopieren",
          content: new VBox({
            items: [
              new Label({ text: "Von (Quelle):", labelFor: oFrom }), oFrom,
              new Label({ text: "Nach (Ziel):", labelFor: oTo }), oTo
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Kopieren",
            type: "Emphasized",
            press: function () {
              const sFrom = oFrom.getSelectedKey();
              const sTo = oTo.getSelectedKey();
              if (sFrom === sTo) { MessageToast.show("Quelle und Ziel müssen unterschiedlich sein."); return; }
              oDialog.close();
              callAction("copyData", { sourceSystem: sFrom, targetSystem: sTo })
                .then(function (msg) { MessageToast.show(msg || "Kopiert"); refresh(oApi); })
                .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Loescht die im gewaehlten System angelegten Objekte wieder. Arbeitet
    // ebenfalls auf den Tracking-Eintraegen.
    onDelete: function () {
      const oApi = this;
      loadSystems().then(function (aSystems) {
        if (!aSystems.length) {
          MessageToast.show("Keine Zielsysteme konfiguriert.");
          return;
        }
        const oSelect = buildSystemSelect(aSystems);
        const oDefault = aSystems.find(function (s) { return s.isDefault; });
        if (oDefault) { oSelect.setSelectedKey(oDefault.ID); }

        const oDialog = new Dialog({
          title: "Im SAP-System löschen",
          state: "Warning",
          content: new VBox({
            items: [
              new Label({ text: "Löscht die von dir in diesem System angelegten Objekte unwiderruflich." }),
              new Label({ text: "System:", labelFor: oSelect }), oSelect
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Löschen",
            type: "Reject",
            press: function () {
              const sId = oSelect.getSelectedKey();
              oDialog.close();
              callAction("deleteFromBackend", { system: sId })
                .then(function (msg) { MessageToast.show(msg || "Gelöscht"); refresh(oApi); })
                .catch(function (e) { MessageToast.show("Fehler: " + e.message); });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Zurueck zur Generator-Liste.
    onBackToGenerator: function () {
      window.location.href = appUrl("generator");
    }
  };
});
