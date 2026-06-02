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
            fetch("/service/generator/Systems", {
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
      window.location.href = "/generator/webapp/index.html";
    }
  };
});
