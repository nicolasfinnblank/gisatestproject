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
  // sRoute (optional): Seite innerhalb der Ziel-App, z.B. "Runs(<ID>)".
  function navigateTo(sApp, sRoute) {
    if (window.sap && sap.ushell && sap.ushell.Container) {
      sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oNav) {
        oNav.toExternal({
          target: { semanticObject: sApp, action: "display" },
          appSpecificRoute: sRoute ? "&/" + sRoute : undefined
        });
      });
      return;
    }
    window.location.href = appUrl(sApp) + (sRoute ? "#/" + sRoute : "");
  }

  // Adresse des CAP-Service RELATIV zur App (wie der Service-Pfad im manifest.json).
  // Auf BTP leitet der Work-Zone-Approuter <app>/service/generator/* ueber die
  // Destination srv-api weiter, lokal uebernimmt srv/server.js die Umschreibung.
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
      // Unbound Actions liefern entweder { value: "..." } oder direkt ein Objekt.
      return t.value !== undefined ? t.value : t;
    });
  }

  // Liste der konfigurierten Zielsysteme laden.
  function loadSystems() {
    return fetch(serviceUrl("Systems?$select=ID,name,description,isDefault&$orderby=name"), {
      headers: { "Accept": "application/json" }
    }).then(function (r) { return r.json(); }).then(function (j) { return j.value || []; });
  }

  // Tabelle "Meine letzten Läufe" nach dem Anlegen neu laden. oApi.refresh()
  // allein genuegt nicht: ohne Filterleiste loest es keine neue Suche aus.
  function refresh(oApi) {
    try {
      const oTable = oApi && oApi.byId && oApi.byId("fe::table::MyRuns::LineItem::Table");
      if (oTable && typeof oTable.refresh === "function") { oTable.refresh(); }
      else if (oApi && typeof oApi.refresh === "function") { oApi.refresh(); }
    } catch (e) { /* notfalls Seite neu laden */ }
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

        const oCount = new StepInput({ value: 10, min: 1, max: 500, step: 1, width: "100%" });
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
              }).then(function (res) {
                oDialog.close();
                refresh(oApi);
                // "Lauf öffnen": direkt die Detailseite des neuen Laufs im Tracking.
                // Ein Klick auf "Anlegen" ergibt immer genau EINEN Lauf, auch bei
                // mehreren Systemen (und auch bei Abbruch, dann "… (abgebrochen)").
                const sOpen = "Lauf öffnen";
                const oOpts = {
                  actions: [sOpen, MessageBox.Action.OK],
                  emphasizedAction: sOpen,
                  onClose: function (sAction) {
                    if (sAction !== sOpen) { return; }
                    if (res && res.runID) { navigateTo("tracking", "Runs(" + res.runID + ")"); }
                    else { navigateTo("tracking"); }
                  }
                };
                if (res && res.ok === false) {
                  // Teil-Erfolg: das Zielsystem hat mittendrin abgebrochen.
                  oOpts.title = "Abgebrochen";
                  MessageBox.warning(res.message, oOpts);
                } else {
                  oOpts.title = "Fertig";
                  MessageBox.success((res && res.message) || "Angelegt.", oOpts);
                }
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

    // Klick auf einen eigenen Lauf: direkt dessen Detailseite im Tracking
    // oeffnen (dort liegen Kopieren und Loeschen). Aufruf aus MyRunsNavigation.js.
    openRun: function (sRunId) {
      navigateTo("tracking", "Runs(" + sRunId + ")");
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
