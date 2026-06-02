# Projekt-Übergabe: GISA Master Data Generator

> Stand-Dokument für die Weiterarbeit / neue Chat-Sessions. Bei vollem
> Context-Fenster einfach den relevanten Teil in den neuen Chat kopieren.

## Was es ist
SAP CAP (Node.js) Web-App auf SAP BTP. Generiert realistische Test-Stammdaten
(Business Partner, Adressen, Namen) aus Daten-Pools und pusht sie per OData an
ein SAP S/4HANA-Backend. Uni-Projekt mit GISA. Lokal SQLite, in Prod HANA.
Fiori Elements UI. Aufgabenstellung als PDF (siehe "Offene Features").

## Setup & Befehle
- Pfad: `/Users/magnusbuchwald/Desktop/Coding/Generator`
- GitHub: `github.com/nicolasfinnblank/gisatestproject`
- `cds` CLI aus `@sap/cds-dk` (global installiert)
- Starten: `cds watch` → http://localhost:4004
- FE-App: http://localhost:4004/generator/webapp/index.html
- Tests: `npm test` (9 Integrationstests, jest + cds.test)

## Git-Stand
- `main` = Original (unberührt), auf GitHub
- `improvements` = **aktueller Hauptstand, auf GitHub gepusht** (origin/improvements).
  Enthält ALLES: Datentyp-Fixes, echter OData-Push, Backend-Mock+Validierung,
  Auth+Multi-User, 9 Tests, Renaming Test1→gisa.mdg, Hardening, npm-Fixes,
  readme, und die funktionierende Fiori-Elements-UI.
- `feat/fiori-elements-ui` = bereits in improvements gemergt (redundant, kann weg).
- Arbeitsweise: pro Thema eigener Branch → in `improvements` mergen wenn fertig →
  pushen. Erst lokal committen, später pushen.

## Was funktioniert (verifiziert)
- Backend: **9/9 Tests grün** (Auth, Generieren, Multi-User-Isolation, Push, Validierung)
- FE-UI (mit Playwright/headless Chrome objektiv getestet):
  List Report rendert; "Generieren" (Anzahl-Dialog) erzeugt Daten (0→5);
  "Go" zeigt sie; "An Backend pushen" pusht ans gemockte Backend.

## Architektur / Schlüsseldateien
- `db/schema.cds`: Namespace `gisa.mdg`. Pools (StreetNames, Cities, …) +
  `GeneratorData` (key concatID, + createdBy für Multi-User-Isolation).
- `srv/service.cds`: Service `GeneratorService`, @path `/service/generator`,
  @requires `Generator`. Actions `generateTestCustomers(anzahl)`, `pushToBackend`.
- `srv/service.js`: Logik. Push = echter OData-Call an BackendAPI_2
  (Street→City→Address→BusinessPartner). *Number-Felder NICHT mitsenden
  (server-vergeben). Hausnummer muss Muster `[0-9]{1,4}[a-z]` erfüllen.
- `srv/external/BackendAPI_2.js`: lokale Mock-Logik (vergibt Nummern, erzwingt
  Validierung). Echtes Backend-Modell: `srv/external/BackendAPI_2.edmx` (Partner).
- `app/annotations.cds`: Fiori-Elements-Annotationen für GeneratorData + Pools.
- `app/generator/webapp/`: die FE-App (manifest.json, Component.js, index.html,
  ext/GeneratorActions.js).

## KRITISCHE Gotchas (NICHT wiederholen!)
1. **Höhe-0-Bug**: FE-App rendert sonst in Container mit Höhe 0 = weiße Seite.
   FIX (drin): `index.html` nutzt EXPLIZITES JS-Bootstrap mit
   `new ComponentContainer({height:"100%"}).placeAt("content")` + CSS
   `html,body,#content{height:100%}`. NICHT auf `data-height`/ComponentSupport
   verlassen (wurde ignoriert → Auto-ID, Höhe 0).
2. **Custom-Action-Buttons**: FE ruft unbound Actions NICHT über
   `DataFieldForAction`-Annotation auf (Button da, tut nichts). Lösung (drin):
   manifest `controlConfiguration`-Actions + Handler `ext/GeneratorActions.js`
   (ruft Action per fetch).
3. **Console-"Fehler"** (Component-preload 404, i18n_en 404, lrep/flex 404,
   [FUTURE FATAL] PropertyInfo, DeleteEntry) sind ALLE harmlos/normal im Dev.
   NICHT verfolgen.
4. **`-dbg.js` in Console** = nur Source-Map-Namen, KEIN langsamer Debug-Modus.
5. **UI selbst verifizieren** (statt Nutzer testen lassen): Playwright
   (`playwright-core` + System-Chrome via `executablePath`) gegen
   `cds-serve --with-mocks --in-memory` mit `PORT=4005` (kein Livereload).
   NICHT `chrome --virtual-time-budget` (hängt wegen Livereload-WebSocket).
   Beispielskript-Idee: Seite laden, auf "Generierte Stammdaten" warten,
   Buttons klicken, `page.on('dialog', d=>d.accept('5'))` für window.prompt,
   danach `/service/generator/GeneratorData/$count` prüfen.
6. UI5 lädt vom CDN ui5.sap.com (erstmalig evtl. langsam, dann gecacht).

## Offene Features (aus der PDF-Aufgabenstellung)
Noch NICHT gebaut – die nächsten großen Schritte (bauen aufeinander auf):
1. **Mehrere SAP-Systeme** als Ziele verwalten.
2. **Tracking** der angelegten Entitäten pro System (Tabelle System|Objekt|Key).
3. **Kopieren** von Daten aus einem System in ein anderes.
- Später: **Building Blocks** zur UI-Verschönerung (Design nach Funktion).
- Optional: Löschen der Daten im SAP-System.
- `xsappname` in `xs-security.json` an echte XSUAA-Instanz anpassen (Deployment).

## Nutzer-Kontext
Git-/SAP-Einsteiger. Kurz erklären, einfach halten (keine Überkomplizierung),
Schritt für Schritt, Fehler benennen.
```
