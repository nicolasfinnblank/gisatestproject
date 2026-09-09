sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/Label",
  "sap/m/Text",
  "sap/m/VBox"
], function (MessageToast, MessageBox, Dialog, Button, Select, Item, Label, Text, VBox) {
  "use strict";

  // Adresse der Schwester-Apps als Rueckfall, wenn keine Launchpad-Shell da ist
  // (lokal). Am eigenen Pfad erkennen wir, in welcher Umgebung wir laufen.
  function appUrl(sApp) {
    // Erstes Pfadsegment auf BTP: "gisamasterdatageneratorservice.gisamdg<app>-1.0.0".
    // Darin nur den App-Teil tauschen, damit der Rest der Umgebung erhalten bleibt.
    var seg = window.location.pathname.split("/")[1] || "";
    if (seg.indexOf("gisamdg") >= 0) {
      return "/" + seg.replace(/gisamdg(generator|tracking|systems)/, "gisamdg" + sApp) + "/index.html";
    }
    return "/" + sApp + "/webapp/index.html";
  }
  // Wechsel zu einer Schwester-App. Im Launchpad ueber die Shell (Intent
  // <app>-display, wie in manifest.json/Work Zone hinterlegt) - dann bleibt
  // die App eingebettet. Ohne Shell (lokal) per Adresse.
  function navigateTo(sApp) {
    if (window.sap && sap.ushell && sap.ushell.Container) {
      sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oNav) {
        oNav.toExternal({ target: { semanticObject: sApp, action: "display" } });
      });
      return;
    }
    window.location.href = appUrl(sApp);
  }

  // Adresse des CAP-Service RELATIV zur App (wie der Service-Pfad im manifest.json).
  // Auf BTP leitet der Work-Zone-Approuter <app>/service/generator/* ueber die
  // Destination srv-api weiter, lokal uebernimmt srv/server.js die Umschreibung.
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

  // Seite nach einer Aktion neu laden (defensiv ueber die FE-ExtensionAPI).
  function refresh(oApi) {
    try {
      if (oApi && typeof oApi.refresh === "function") { oApi.refresh(); }
    } catch (e) { /* notfalls Seite neu laden */ }
  }

  // Der Lauf, auf dessen Detailseite der Knopf gedrueckt wurde. Fiori Elements
  // uebergibt Kopfzeilen-Aktionen den Binding-Context der Seite.
  function currentRun(oContext) {
    var oRun = oContext && typeof oContext.getObject === "function" ? oContext.getObject() : null;
    if (!oRun || !oRun.ID) { MessageToast.show("Bitte zuerst einen Lauf öffnen."); return null; }
    return oRun;
  }

  // Systeme, in denen der Lauf aktuell liegt ("S4D, S4Q" -> ["S4D","S4Q"]).
  function runSystems(oRun) {
    return (oRun.systems || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function systemSelect(aSystems) {
    const oSel = new Select({ width: "100%" });
    aSystems.forEach(function (s) {
      oSel.addItem(new Item({
        key: s.ID,
        text: s.name + (s.description ? " – " + s.description : "")
      }));
    });
    return oSel;
  }

  return {
    // Kopiert die Geschaeftspartner DIESES Laufs aus einem System, in dem er
    // liegt, in ein weiteres System. Die Kopien haengen am selben Lauf.
    onCopy: function (oContext) {
      const oApi = this;
      const oRun = currentRun(oContext);
      if (!oRun) { return; }
      const aIn = runSystems(oRun);
      if (!aIn.length) { MessageToast.show("Der Lauf liegt in keinem System mehr."); return; }

      loadSystems().then(function (aSystems) {
        const aSources = aSystems.filter(function (s) { return aIn.indexOf(s.name) >= 0; });
        const aTargets = aSystems.filter(function (s) { return aIn.indexOf(s.name) < 0; });
        if (!aTargets.length) {
          MessageToast.show("Der Lauf liegt bereits in allen konfigurierten Systemen.");
          return;
        }
        const oFrom = systemSelect(aSources);
        const oTo = systemSelect(aTargets);

        const oDialog = new Dialog({
          title: "Lauf \"" + oRun.label + "\" kopieren",
          contentWidth: "28rem",
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
              oDialog.setBusy(true);
              callAction("copyRun", {
                run: oRun.ID, sourceSystem: oFrom.getSelectedKey(), targetSystem: oTo.getSelectedKey()
              }).then(function (msg) {
                oDialog.close();
                MessageToast.show(msg || "Kopiert");
                refresh(oApi);
              }).catch(function (e) {
                oDialog.setBusy(false);
                MessageBox.error("Kopieren fehlgeschlagen: " + e.message);
              });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Loescht die Objekte DIESES Laufs in einem System wieder aus dem Backend.
    // Das Protokoll bleibt erhalten (Status "deleted").
    onDelete: function (oContext) {
      const oApi = this;
      const oRun = currentRun(oContext);
      if (!oRun) { return; }
      const aIn = runSystems(oRun);
      if (!aIn.length) { MessageToast.show("Der Lauf ist bereits überall gelöscht."); return; }

      loadSystems().then(function (aSystems) {
        const oSelect = systemSelect(aSystems.filter(function (s) { return aIn.indexOf(s.name) >= 0; }));

        const oDialog = new Dialog({
          title: "Lauf \"" + oRun.label + "\" löschen",
          state: "Warning",
          contentWidth: "28rem",
          content: new VBox({
            items: [
              new Text({ text: "Löscht alle Objekte dieses Laufs im gewählten System unwiderruflich aus dem SAP-System. Das Protokoll bleibt erhalten (Status \"deleted\")." }).addStyleClass("sapUiSmallMarginBottom"),
              new Label({ text: "System:", labelFor: oSelect }), oSelect
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Löschen",
            type: "Reject",
            press: function () {
              oDialog.setBusy(true);
              callAction("deleteRun", { run: oRun.ID, system: oSelect.getSelectedKey() })
                .then(function (msg) {
                  oDialog.close();
                  MessageToast.show(msg || "Gelöscht");
                  refresh(oApi);
                }).catch(function (e) {
                  oDialog.setBusy(false);
                  MessageBox.error("Löschen fehlgeschlagen: " + e.message);
                });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Zurueck zum Generator.
    onBackToGenerator: function () {
      navigateTo("generator");
    }
  };
});
