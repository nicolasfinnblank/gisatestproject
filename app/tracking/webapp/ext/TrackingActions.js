sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Select",
  "sap/m/MultiComboBox",
  "sap/ui/core/Item",
  "sap/m/Label",
  "sap/m/Text",
  "sap/m/VBox"
], function (MessageToast, MessageBox, Dialog, Button, Select, MultiComboBox, Item, Label, Text, VBox) {
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

  // Fuehrt eine Aktion nacheinander je gewaehltem System aus (Kopieren/Loeschen).
  // Scheitert ein System, wird gestoppt und genau gesagt, was schon erledigt ist.
  function runEach(aIds, fnCall, aSystems, sWhat, oDialog, oApi, sDefault) {
    const aDone = [];
    const nameOf = function (sId) {
      const o = aSystems.find(function (s) { return s.ID === sId; });
      return o ? o.name : sId;
    };
    aIds.reduce(function (p, sId) {
      return p.then(function () {
        return fnCall(sId)
          .then(function (msg) { aDone.push(msg); })
          .catch(function (e) { e.system = sId; throw e; });
      });
    }, Promise.resolve()).then(function () {
      oDialog.close();
      MessageToast.show(aDone.join("\n") || sDefault);
      refresh(oApi);
    }).catch(function (e) {
      oDialog.close();
      refresh(oApi);
      MessageBox.error(sWhat + " in " + nameOf(e.system) + " fehlgeschlagen: " + e.message
        + (aDone.length ? "\n\nBereits erledigt:\n" + aDone.join("\n") : ""));
    });
  }

  return {
    // Kopiert die Geschaeftspartner DIESES Laufs aus einem System, in dem er
    // liegt, in ein oder mehrere weitere Systeme. Die Kopien haengen am selben Lauf.
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
        // Ziele wie beim Anlegen/Loeschen als Mehrfachauswahl; nur ein moegliches
        // Ziel ist gleich vorbelegt.
        const oTo = new MultiComboBox({ width: "100%" });
        aTargets.forEach(function (s) {
          oTo.addItem(new Item({ key: s.ID, text: s.name + (s.description ? " – " + s.description : "") }));
        });
        if (aTargets.length === 1) { oTo.setSelectedKeys([aTargets[0].ID]); }

        const oDialog = new Dialog({
          title: "Lauf \"" + oRun.label + "\" kopieren",
          contentWidth: "28rem",
          content: new VBox({
            items: [
              new Label({ text: "Von (Quelle):", labelFor: oFrom }), oFrom,
              new Label({ text: "Nach (Ziele, Mehrfachauswahl):", labelFor: oTo }), oTo
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Kopieren",
            type: "Emphasized",
            press: function () {
              const aIds = oTo.getSelectedKeys();
              if (!aIds.length) { MessageToast.show("Bitte mindestens ein Zielsystem wählen."); return; }
              oDialog.setBusy(true);
              runEach(aIds, function (sId) {
                return callAction("copyRun", {
                  run: oRun.ID, sourceSystem: oFrom.getSelectedKey(), targetSystem: sId
                });
              }, aTargets, "Kopieren", oDialog, oApi, "Kopiert");
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Loescht die Objekte DIESES Laufs in einem oder mehreren Systemen wieder
    // aus dem Backend. Das Protokoll bleibt erhalten (Status "Gelöscht").
    onDelete: function (oContext) {
      const oApi = this;
      const oRun = currentRun(oContext);
      if (!oRun) { return; }
      const aIn = runSystems(oRun);
      if (!aIn.length) { MessageToast.show("Der Lauf ist bereits überall gelöscht."); return; }

      loadSystems().then(function (aSystems) {
        // Mehrfachauswahl wie beim Anlegen. Nur bei genau einem System vorbelegt:
        // Loeschen ist unwiderruflich, mehrere Systeme soll man bewusst anklicken.
        const aSources = aSystems.filter(function (s) { return aIn.indexOf(s.name) >= 0; });
        const oBox = new MultiComboBox({ width: "100%" });
        aSources.forEach(function (s) {
          oBox.addItem(new Item({ key: s.ID, text: s.name + (s.description ? " – " + s.description : "") }));
        });
        if (aSources.length === 1) { oBox.setSelectedKeys([aSources[0].ID]); }

        const oDialog = new Dialog({
          title: "Lauf \"" + oRun.label + "\" löschen",
          state: "Warning",
          contentWidth: "28rem",
          content: new VBox({
            items: [
              new Text({ text: "Löscht alle Objekte dieses Laufs in den gewählten Systemen unwiderruflich aus dem SAP-System. Das Protokoll bleibt erhalten (Status \"Gelöscht\")." }).addStyleClass("sapUiSmallMarginBottom"),
              new Label({ text: "Systeme (Mehrfachauswahl):", labelFor: oBox }), oBox
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Löschen",
            type: "Reject",
            press: function () {
              const aIds = oBox.getSelectedKeys();
              if (!aIds.length) { MessageToast.show("Bitte mindestens ein System wählen."); return; }
              oDialog.setBusy(true);
              runEach(aIds, function (sId) {
                return callAction("deleteRun", { run: oRun.ID, system: sId });
              }, aSources, "Löschen", oDialog, oApi, "Gelöscht");
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
