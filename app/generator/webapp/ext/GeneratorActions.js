sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/StepInput",
  "sap/m/MultiComboBox",
  "sap/ui/core/Item",
  "sap/m/Label",
  "sap/m/VBox"
], function (MessageToast, MessageBox, Dialog, Button, Input, StepInput, MultiComboBox, Item, Label, VBox) {
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
  // Wechsel zu einer Schwester-App. Im Launchpad ueber die Shell (Intent
  // <app>-display, wie in manifest.json/Work Zone hinterlegt) - dann bleibt
  // die App eingebettet. Ohne Shell (Standalone-Approuter, lokal) per Adresse.
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
  // Auf BTP leitet der jeweilige Approuter <app>/service/generator/* an das
  // Backend weiter, lokal uebernimmt srv/server.js die Umschreibung.
  function serviceUrl(sPath) {
    return sap.ui.require.toUrl("gisamdg/generator/service/generator/") + (sPath || "");
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

  // Vorschlag fuer die Bezeichnung: "Testdaten 09.09.2026 14:30".
  function defaultLabel() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return "Testdaten " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear()
      + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  return {
    // EIN Schritt: Anzahl + Bezeichnung + Zielsysteme waehlen, dann generiert
    // der Service die Personen aus den Pools und legt sie sofort in allen
    // gewaehlten Systemen an. Ergebnis ist ein Lauf (siehe Tracking).
    onGenerate: function () {
      const oApi = this;
      loadSystems().then(function (aSystems) {
        if (!aSystems.length) {
          MessageToast.show("Keine Zielsysteme konfiguriert (siehe 'Systeme verwalten').");
          return;
        }

        const oCount = new StepInput({ value: 10, min: 1, max: 1000, step: 1, width: "100%" });
        const oLabel = new Input({ value: defaultLabel(), placeholder: "z.B. Testfall 4711", width: "100%" });
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
          title: "Testdaten generieren & anlegen",
          contentWidth: "28rem",
          content: new VBox({
            items: [
              new Label({ text: "Anzahl Geschäftspartner:", labelFor: oCount }), oCount,
              new Label({ text: "Bezeichnung des Laufs:", labelFor: oLabel }), oLabel,
              new Label({ text: "Zielsysteme (Mehrfachauswahl):", labelFor: oBox }), oBox
            ]
          }).addStyleClass("sapUiContentPadding"),
          beginButton: new Button({
            text: "Anlegen",
            type: "Emphasized",
            press: function () {
              const aIds = oBox.getSelectedKeys();
              if (!aIds.length) { MessageToast.show("Bitte mindestens ein Zielsystem wählen."); return; }
              oDialog.setBusy(true);
              callAction("generateAndCreate", {
                anzahl: oCount.getValue(),
                label: (oLabel.getValue() || "").trim(),
                systems: aIds
              }).then(function (msg) {
                oDialog.close();
                refresh(oApi);
                MessageBox.success(msg || "Angelegt.", {
                  title: "Fertig",
                  actions: ["Zum Tracking", MessageBox.Action.OK],
                  emphasizedAction: "Zum Tracking",
                  onClose: function (sAction) {
                    if (sAction === "Zum Tracking") { navigateTo("tracking"); }
                  }
                });
              }).catch(function (e) {
                oDialog.setBusy(false);
                MessageBox.error("Anlegen fehlgeschlagen: " + e.message);
              });
            }
          }),
          endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
          afterClose: function () { oDialog.destroy(); }
        });
        oDialog.open();
      }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
    },

    // Zur Tracking-Liste (Laeufe). Dort liegen Kopieren und Loeschen.
    onShowTracking: function () {
      navigateTo("tracking");
    },

    // Zur Zielsystem-Verwaltung.
    onShowSystems: function () {
      navigateTo("systems");
    }
  };
});
