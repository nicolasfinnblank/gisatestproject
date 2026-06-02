# Projekt-Übergabe: GISA Master Data Generator

> Stand-Dokument für die Weiterarbeit / neue Chat-Sessions. Bei vollem
> Context-Fenster einfach den relevanten Teil in den neuen Chat kopieren.

## Was es ist
SAP CAP (Node.js) Web-App auf SAP BTP. Generiert realistische Test-Stammdaten
(Business Partner, Adressen, Namen) aus Daten-Pools und pusht sie per OData an
SAP S/4HANA-Backends. Kann mehrere Zielsysteme verwalten, das Angelegte tracken,
Daten zwischen Systemen kopieren und im System wieder löschen. Uni-Projekt mit
GISA. Lokal SQLite, in Prod HANA. Fiori Elements UI. Aufgabenstellung als PDF
(siehe "Offene Features").

## Setup & Befehle
- Pfad: `/Users/magnusbuchwald/Desktop/Coding/Generator`
- GitHub: `github.com/nicolasfinnblank/gisatestproject`
- `cds` CLI aus `@sap/cds-dk` (global installiert)
- Starten: `cds watch` → http://localhost:4004
- FE-Apps: `/generator/webapp/index.html`, `/tracking/webapp/index.html`,
  `/systems/webapp/index.html`
- Tests: `npm test` (17 Integrationstests, jest + cds.test)

## Git-Stand
- `main` = Original (unberührt), auf GitHub.
- `improvements` = **aktueller Hauptstand, auf GitHub gepusht** (origin/improvements).
  Enthält ALLES: echter OData-Push, Backend-Mock+Validierung, Auth+Multi-User,
  Fiori-Elements-UI, **Tracking**, **Multi-System (2 Backends)**, **Copy**,
  **Löschen im System**.
- Erledigte Feature-Branches (bereits in improvements gemergt, können weg):
  `feat/fiori-elements-ui`, `feat/tracking`, `feat/multi-system`, `feat/copy`,
  `feat/delete`.
- Arbeitsweise: pro Thema eigener Branch → in `improvements` mergen (Fast-Forward)
  wenn fertig → pushen. Erst lokal committen, später pushen.

## Was funktioniert (verifiziert)
- Backend: **17/17 Tests grün** (Auth, Generieren, Multi-User-Isolation, Push,
  Validierung, Tracking, Multi-System, Copy, Löschen).
- FE-UI (mit Playwright/headless Chrome objektiv getestet):
  - Generator-List-Report rendert; "Generieren" (Anzahl-Prompt) erzeugt Daten.
  - "An Backend pushen" → Dialog mit **Zielsystem-Dropdown** → Push ins gewählte
    Backend.
  - "Daten kopieren" → Dialog **Von/Nach** → kopiert die eigenen Partner ins
    Zielsystem (verifiziert: backend-3 0→2).
  - "Im System löschen" → Warn-Dialog (System-Auswahl) → löscht die eigenen
    Objekte wieder aus dem Backend (verifiziert: backend-2 2→0).
  - "Tracking anzeigen" / "Systeme verwalten" navigieren zu den anderen Apps.
  - Systeme-App: Liste + "Neues System" (Dialog) legt per POST an.

## Architektur / Schlüsseldateien
- `db/schema.cds`: Namespace `gisa.mdg`. Pools (StreetNames, Cities, …),
  `GeneratorData` (key concatID, + createdBy für Multi-User), `CreatedObjects`
  (Tracking: system|objectType|objectKey|sourceConcatID|createdBy|createdAt),
  `Systems` (Zielsystem-Katalog: name|description|serviceName|isDefault).
- `db/data/gisa.mdg-Systems.csv`: Seed → **S4D** (Default, BackendAPI_2) und
  **S4Q** (BackendAPI_3).
- `srv/service.cds`: Service `GeneratorService`, @path `/service/generator`,
  @requires `Generator`. Actions: `generateTestCustomers(anzahl)`,
  `pushToBackend(system)`, `copyData(sourceSystem, targetSystem)`,
  `deleteFromBackend(system)`.
  Entities: Pools, `GeneratorData` (per-user), `CreatedObjects` (read-only,
  per-user), `Systems` (CRUD, gemeinsam).
- `srv/service.js`: Logik.
  - Push: wählt Zielsystem (oder Default) aus `Systems`, verbindet zu dessen
    `serviceName`, legt Street→City→Address→BusinessPartner an, trackt unter
    `sys.name`. *Number-Felder NICHT mitsenden (server-vergeben). Hausnummer
    muss Muster `[0-9]{1,4}[a-z]` erfüllen.
  - Copy: ermittelt aus `CreatedObjects` die eigenen BP-Keys im Quellsystem,
    liest BP→Address→Street/City **flach** (kein $expand!) aus dem Quell-Backend,
    legt sie im Ziel-Backend neu an, trackt unter Zielsystem.
  - Delete: ermittelt aus `CreatedObjects` je Objekttyp die *Number, holt damit
    die Backend-IDs und löscht **key-basiert** (BP→Address→Street→City); räumt
    danach die Tracking-Einträge.
- `srv/external/_mockBackend.js`: **geteilte** Mock-Logik (vergibt Nummern,
  erzwingt Validierung) für beide Backends.
- `srv/external/BackendAPI_2.{csn,edmx,js}` + `BackendAPI_3.{csn,js}`: die zwei
  gemockten Ziel-Backends (eindeutige Namen, getrennte In-Memory-Tabellen).
  In `package.json` unter `cds.requires` als zwei `odata`-Services registriert.
- `app/annotations.cds`: FE-Annotationen für GeneratorData, Pools, CreatedObjects,
  Systems.
- `app/generator/webapp/`, `app/tracking/webapp/`, `app/systems/webapp/`: drei
  eigenständige FE-Apps. Custom-Aktionen in je `ext/*.js`. Navigation zwischen
  ihnen per `window.location.href` (eigene URLs).

## KRITISCHE Gotchas (NICHT wiederholen!)
1. **Höhe-0-Bug**: FE-App rendert sonst in Container mit Höhe 0 = weiße Seite.
   FIX (drin): `index.html` nutzt EXPLIZITES JS-Bootstrap mit
   `new ComponentContainer({height:"100%"}).placeAt("content")` + CSS
   `html,body,#content{height:100%}`. NICHT auf `data-height`/ComponentSupport
   verlassen. Gilt für ALLE drei Apps.
2. **Custom-Action-Buttons**: FE ruft unbound Actions NICHT über
   `DataFieldForAction`-Annotation auf (Button da, tut nichts). Lösung (drin):
   manifest `controlConfiguration`-Actions + Handler in `ext/*.js` (ruft Action
   bzw. macht POST per `fetch`). Auch Dialoge (Select/Input) werden hier in JS
   gebaut, nicht über FE-Parameterdialoge.
3. **Lokaler Push/Copy braucht `--in-memory`**: `cds serve all --with-mocks`
   gegen die persistente `db.sqlite` → Fehler `no such table: BackendAPI_2_Street`
   (Mock-Tabellen nur bei `--in-memory` deployt). Auch `No credentials configured`
   wenn `--with-mocks` fehlt. Für Verifikation immer
   `cds serve all --with-mocks --in-memory --port 4005`.
4. **Copy: kein tiefes `$expand`** im OData-Mock (`Not supported: "houseNumber"`).
   Stattdessen flach in Schritten lesen (BP → Address → Street/City), siehe
   `copyData` in service.js.
5. **Console-"Fehler"** (Component-preload 404, i18n_en 404, lrep/flex 404,
   [FUTURE FATAL] PropertyInfo, DeleteEntry) sind ALLE harmlos/normal im Dev.
6. **`-dbg.js` in Console** = nur Source-Map-Namen, KEIN langsamer Debug-Modus.
7. **UI selbst verifizieren** (statt Nutzer testen lassen): Playwright
   (`playwright-core` + System-Chrome via `executablePath`) gegen Port 4005
   (kein Livereload). NICHT `chrome --virtual-time-budget` (hängt wegen
   Livereload-WebSocket). `page.on('dialog', d=>d.accept('5'))` für window.prompt;
   Aktions-Dialoge sind In-Page (`.sapMDialog`), kein Browser-Dialog.
8. UI5 lädt vom CDN ui5.sap.com (erstmalig evtl. langsam, dann gecacht).

## Offene Features (aus der PDF-Aufgabenstellung)
Alle Kern-Features UND das optionale **Löschen** sind umgesetzt: Generierung,
Pools, OData-Push, Mass-Creation, **Tracking für mehrere Systeme**,
**Multi-System**, **Copy**, **Löschen im System**, UIs. Noch offen (alles
optional / Ausbau):
- **mehr Objekttypen** ("multiple different master data entities"; aktuell
  BusinessPartner + Adresse, von der PDF als Beispiele genannt).
- **Building Blocks** zur UI-Verschönerung (Design nach Funktion).
- `xsappname` in `xs-security.json` an echte XSUAA-Instanz anpassen (Deployment).

## Nutzer-Kontext
Git-/SAP-Einsteiger. Kurz erklären, einfach halten (keine Überkomplizierung),
Schritt für Schritt, Fehler benennen.
