sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/CheckBox",
  "sap/m/Label",
  "sap/m/VBox"
], function (MessageToast, Dialog, Button, Input, Select, Item, CheckBox, Label, VBox) {
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
    return sap.ui.require.toUrl("gisamdg/systems/service/generator/") + (sPath || "");
  }

  // Liste neu laden (defensiv ueber die FE-ExtensionAPI).
  function refresh(oApi) {
    try {
      if (oApi && typeof oApi.refresh === "function") { oApi.refresh(); }
    } catch (e) { /* notfalls 'Go' druecken */ }
  }

  return {
    // Neues Zielsystem ueber einen Dialog anlegen (POST auf /Systems).
    onCreateSystem: function () {
      const oApi = this;
      const oName = new Input({ placeholder: "z.B. S4P" });
      const oDesc = new Input({ placeholder: "Beschreibung (optional)" });
      // serviceName muss einem konfigurierten CAP-Remote-Service entsprechen.
      const oService = new Select({ width: "100%" });
      oService.addItem(new Item({ key: "BackendAPI_2", text: "BackendAPI_2" }));
      oService.addItem(new Item({ key: "BackendAPI_3", text: "BackendAPI_3" }));
      const oDefault = new CheckBox({ text: "Als Standard-Ziel verwenden" });

      const oDialog = new Dialog({
        title: "Neues Zielsystem",
        content: new VBox({
          items: [
            new Label({ text: "Name / Code:", labelFor: oName, required: true }), oName,
            new Label({ text: "Beschreibung:", labelFor: oDesc }), oDesc,
            new Label({ text: "Service:", labelFor: oService }), oService,
            oDefault
          ]
        }).addStyleClass("sapUiContentPadding"),
        beginButton: new Button({
          text: "Anlegen",
          type: "Emphasized",
          press: function () {
            const sName = (oName.getValue() || "").trim();
            if (!sName) { oName.setValueState("Error"); return; }
            const oBody = {
              name: sName,
              description: (oDesc.getValue() || "").trim(),
              serviceName: oService.getSelectedKey(),
              isDefault: oDefault.getSelected()
            };
            oDialog.close();
            fetch(serviceUrl("Systems"), {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify(oBody)
            }).then(async function (r) {
              const t = await r.json().catch(function () { return {}; });
              if (!r.ok) { throw new Error((t.error && t.error.message) || ("HTTP " + r.status)); }
              MessageToast.show("System '" + sName + "' angelegt.");
              refresh(oApi);
            }).catch(function (e) { MessageToast.show("Fehler: " + e.message); });
          }
        }),
        endButton: new Button({ text: "Abbrechen", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    },

    // Zurueck zur Generator-Liste.
    onBackToGenerator: function () {
      navigateTo("generator");
    }
  };
});
