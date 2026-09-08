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
- Tests: `npm test` (19 Integrationstests, jest + cds.test)

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
- Backend: **19/19 Tests grün** (Auth, Generieren, Multi-User-Isolation, Push,
  Validierung, Tracking, Multi-System, Copy, Löschen).
- FE-UI (mit Playwright/headless Chrome objektiv getestet):
  - Generator-List-Report rendert; "Generieren" (Anzahl-Prompt) erzeugt Daten.
  - "An Backend pushen" → Dialog mit **Mehrfachauswahl** der Zielsysteme →
    Push in alle gewählten Backends.
  - **Tracking-App:** "Daten kopieren" (Dialog **Von/Nach**, kopiert die eigenen
    Partner ins Zielsystem) und "Im System löschen" (Warn-Dialog, löscht die
    eigenen Objekte wieder). Seit 07.09. dort statt im Generator — beide
    arbeiten auf den Tracking-Einträgen (`CreatedObjects`).
  - "Tracking anzeigen" / "Systeme verwalten" / "Zurück" navigieren zwischen
    den Apps (Ersatz fürs Launchpad).
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
  `pushToBackend(systems : many String)` (Mehrfachauswahl, leer = Default-System),
  `copyData(sourceSystem, targetSystem)`, `deleteFromBackend(system)`.
  Entities: Pools, `GeneratorData` (per-user), `CreatedObjects` (read-only,
  per-user), `Systems` (CRUD, gemeinsam) sowie die beiden Tracking-Sichten
  `TrackedPartners` (PARENT: eine Zeile je Person, `group by sourceConcatID`) und
  `PartnerSystems` (CHILD: je System eine Zeile mit der dort vergebenen Nummer)
  — zusammen bilden sie das 1:n-Tracking Person → Systeme.
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
  ihnen per `window.location.href` über `appUrl()`: erkennt am eigenen Pfad
  BTP (`/gisamdg<app>/index.html`) vs. lokal (`/<app>/webapp/index.html`).
  Jede App hat einen eigenen Intent (`generator|tracking|systems` / `display`).

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
- **Destination zum echten S/4-System** (URL + Auth kommen von Betreuer
  Christian). Bis dahin laufen Push/Copy/Delete gegen die lokalen Mocks.

## BTP-Deployment (Branch `feat/approuter`, Stand 07.09.2026)
Konto: Global Account `eb23aca2trial`, Subaccount `trial`
(ID `123c2a99-96c7-4c66-8a0e-22b7b94f2aad`), Region us10, Org `eb23aca2trial`,
Space `dev`, CF-API `https://api.cf.us10-001.hana.ondemand.com`. Der alte Trial
`f08f5f0etrial` ist gelöscht (war defekt, siehe unten).

Als MTA beschrieben (`mta.yaml`):
```bash
npm install                                              # Lockfile synchron halten
npx mbt build                                            # -> mta_archives/*.mtar
cf deploy mta_archives/gisa-master-data-generator_1.0.0.mtar -f
```
Module: `srv` (CAP), `db-deployer` (HANA-Schema), `app-deployer` (drei Fiori-Apps
ins HTML5-Repo), `approuter` (Standalone) + Ressourcen XSUAA (mit
`redirect-uris`!), HANA hdi-shared, Destination, HTML5-Repo `app-host` +
`app-runtime`. Vor dem ersten Deploy HANA anlegen:
`cf create-service hana-cloud hana-free gisa-hana -c '{"data":{"memory":16,"systempassword":"…","whitelistIPs":["0.0.0.0/0"]}}'`

**Läuft (verifiziert 07.09.):**
- HANA `gisa-hana`, Backend (`/service/generator/` -> 401), HDI-Schema deployt.
- Drei Apps im HTML5-Repo: `gisamdggenerator`, `gisamdgtracking`, `gisamdgsystems`
  — **Name = `sap.app.id` ohne Punkt**, nicht `gisamdg.generator` (das war der
  503-Fehler des Approuters). Prüfen: `cf html5-list` (Plugin `html5-plugin`).
- Standalone-Approuter (Login über IAS, Generator-Oberfläche lädt):
  `https://eb23aca2trial-dev-gisa-master-data-generator-approuter.cfapps.us10-001.hana.ondemand.com`
  Apps: `/gisamdggenerator/index.html`, `/gisamdgtracking/…`, `/gisamdgsystems/…`
- **Work Zone läuft:** IAS-Tenant `a9jpmbquf`, Trust `sap.custom` aktiv,
  Subscription `SUBSCRIBED`, Site mit drei Kacheln.
  Site Manager (Verwaltung, `dt`): `https://eb23aca2trial.dt.launchpad.cfapps.us10.hana.ondemand.com`
  Launchpad (Nutzer): `https://eb23aca2trial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b9e6e59a-45d1-4b51-b3b7-34b263823079`
- Rollen an `magnusbuchwald279@gmail.com` über `--of-idp sap.custom` (IAS!):
  `Generator (gisa-master-data-generator eb23aca2trial-dev)`, `Launchpad_Admin`.

**Zielsysteme in der Cloud = Mocks (bis Christians S/4-Destination kommt):**
Generieren lief auf BTP, Push/Kopieren/Löschen brachen mit „Internal Server
Error" ab — im Produktionsmodus gibt es weder Mocks noch Destinations für
`BackendAPI_2/3`. Lösung (07.09.): `db/mocks.cds` hebt `@cds.persistence.skip`
für die Mock-Entities auf (-> 8 Tabellen im HANA-Build), `package.json` erlaubt
Mocks in Produktion (`cds.features.[production].with_mocks`) und startet mit
`cds-serve --with-mocks`. Der Mock-Code selbst ist unverändert. Sobald die echte
Destination da ist: `[production]`-Credentials für `BackendAPI_2/3` eintragen,
`--with-mocks` aus dem Start-Skript nehmen, `db/mocks.cds` löschen.

**Noch nicht verifiziert:** fachlicher Durchlauf auf BTP mit den Cloud-Mocks
(Generieren -> Push -> Tracking -> Kopieren -> Löschen).

**Warum Work Zone wochenlang scheiterte:** Work Zone verlangt seit 20.03.2025
zwingend IAS über OIDC (SAP-Hinweis **KBA 3600432**), SAML genügt nicht. Der
Site-Manager-Fehler *"No client with requested id: sb-launchpad-dt-approuter"*
ist nur das letzte Glied: IAS-Tenant nicht mit Kundennummer verknüpft -> kein
Trust -> Subscribe scheitert (422 `OIDC trust missing`) -> Anmeldekomponente
fehlt. Der Site Manager gehört zur **Subscription**, nicht zur Instanz —
`cf` zeigt Subscriptions nicht, dafür `~/bin/btp` nutzen. Im alten Trial kam die
Verknüpfung nach 3,5 Std. nicht; im neuen Trial nach **5 Minuten**.

**Work Zone neu aufsetzen (z. B. wenn der IAS-Tenant abläuft):**
1. `btp subscribe accounts/subaccount --subaccount <id> --to-app sap-identity-services-onboarding --plan default`
   -> Aktivierungsmail -> Admin-Passwort setzen
2. `btp list security/available-idp` bis der Tenant erscheint, dann
   `btp create security/trust --subaccount <id> --idp <VOLLER Host>` (nicht nur Kürzel)
3. `btp subscribe accounts/subaccount --subaccount <id> --to-app SAPLaunchpadSMS --plan standard`
4. `btp assign security/role-collection <Rolle> --to-user <mail> --of-idp sap.custom --subaccount <id>`

**Apps laufen im Launchpad (seit 07.09., 16:30):** Die drei App-Einträge in
Work Zone sind **manuell** angelegt (Content Manager -> Create -> App), mit
Intent `generator|tracking|systems` / `display` und als URL die Work-Zone-
Laufzeitadresse der jeweiligen App:
`https://eb23aca2trial.launchpad.cfapps.us10.hana.ondemand.com/gisamasterdatageneratorservice.gisamdg<app>-1.0.0/index.html`
(Muster: `<sap.cloud.service ohne Punkte>.<sap.app.id ohne Punkt>-<Version>`).
„Auf neuer Registerkarte öffnen" AUS, beide Parameter-Häkchen AUS -> die Apps
öffnen **eingebettet** im Launchpad (`#generator-display`). Voraussetzung dafür
war der relative Service-Pfad `service/generator/` im manifest.json (absolut
-> weiße Seite hinter Work Zones Approuter). Die Standalone-Approuter-Adresse
funktioniert weiterhin als direkter Zugang.

**Bekannte Einschränkung:** Content Manager -> Content Explorer -> HTML5 Apps
zeigt **(0)**, Report `total 0, failed 0`, obwohl alle Pflichtangaben erfüllt sind
(Apps in `cf html5-list`, im Cockpit unter „Managed Application Router provided
by SAP Build Work Zone", eindeutige Intents, `sap.cloud.service`, explizite
`minUI5Version`, App läuft über die Work-Zone-Laufzeit). Getestet ohne Erfolg:
Intents eindeutig, `sap.cloud.service` beide Werte, relative Service-Pfade,
app-host-Instanz gelöscht und neu angelegt (Experiment 1, 07.09. 16:11),
mehrfach Channel-Update. Community: klappt in Trials teils Tage später, teils
nie. Folge: nur **Pflegekomfort** (automatische statt manueller App-Einträge).
Gelegentlich Channel Manager -> Update -> Content Explorer prüfen; erscheinen
die Apps, die manuellen Einträge dagegen tauschen. Abschließend geklärt (08.09.): Der Content Explorer liest einen serverseitigen
Schnappschuss (`getSnapshotEntities`, contextId `saas_approuter_eb23aca2trial`),
den `POST /provider/html5` (Update) füllt — bei uns mit `[]`, ohne Fehler; der
Browser spricht nie mit dem Repository. Der Provider ist `providerType: cf` mit
unserer Subdomain: Work Zone läuft auf Landschaft **cf-us10**, unsere CF-Org nur
auf **cf-us10-001**, und `btp list accounts/available-environment` bietet dem
Trial ausschließlich cf-us10-001 an. Ein Neu-Abonnieren oder eine neue
CF-Umgebung würden daran nichts ändern. **Entscheidung: abgehakt** — für Code,
Deployment-Paket und Vorführung ohne Unterschied; bei GISA (reguläre Umgebung)
ist der Content-Explorer-Weg der Normalfall, der manuelle Weg der Rückfall.

**Fristen:** IAS-Trial-Tenant gilt **14 Tage** (angelegt 07.09. -> ca. 21.09.),
**Abgabe 25.09.2026** — vor der Präsentation IAS nach obiger Anleitung neu
aufsetzen. BTP-Trial ~90 Tage.

**Trial-Verhalten:** CF-Apps werden bei Inaktivität *gestoppt* (nicht gelöscht):
HTTP 404 auf der Route heißt `cf start gisa-master-data-generator-srv` (und
`…-approuter`). HANA schaltet ab: `cf update-service gisa-hana -c '{"data":{"serviceStopped":false}}'`
(10–15 Min). `cf service gisa-hana` zeigt nur den *letzten Vorgang*, nicht den
Betriebszustand — die Deployer-Logs sagen „HANA Database instance is stopped".

## Nutzer-Kontext
Git-/SAP-Einsteiger. Kurz erklären, einfach halten (keine Überkomplizierung),
Schritt für Schritt, Fehler benennen.
