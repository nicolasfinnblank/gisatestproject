# Projekt-Übergabe: GISA Master Data Generator

> Stand-Dokument für die Weiterarbeit / neue Chat-Sessions. Bei vollem
> Context-Fenster einfach den relevanten Teil in den neuen Chat kopieren.

## Was es ist
SAP CAP (Node.js) Web-App auf SAP BTP. Generiert realistische Test-Stammdaten
(Business Partner, Adressen, Namen) aus Daten-Pools und pusht sie per OData an
SAP S/4HANA-Backends. Kann mehrere Zielsysteme verwalten, das Angelegte tracken,
Daten zwischen Systemen kopieren und im System wieder löschen. Uni-Projekt mit
GISA. Lokal SQLite, in Prod HANA. Fiori Elements UI. Aufgabenstellung: GISA-
Präsentation vom 07.04.2026 (Folie 16 „The idea", Folie 17 „The goal"), siehe
Abschnitt „Fachliche Logik".

## Fachliche Logik (Stand 09.09.2026, Branch `feat/runs`)
Zentraler Begriff ist der **Lauf** (`Runs`) = eine Testdaten-Erstellung mit
Bezeichnung („Testfall 4711"), Ersteller, Zeitpunkt, Systemen, Status.
- **Generator-App:** EIN Dialog (Anzahl, Bezeichnung, Zielsysteme mit
  Mehrfachauswahl, Standard vorbelegt) → Aktion `generateAndCreate` würfelt die
  Personen aus den Pools UND legt sie sofort in allen gewählten Systemen an
  (Street→City→Address→BusinessPartner je System). Kein separater Push mehr.
  Die Liste darunter ist nur die **Quittung des letzten Laufs** (`GeneratorData`,
  per Nutzer, wird beim nächsten Lauf ersetzt); Detailseite zeigt je Person, in
  welchem System sie mit welcher Nummer liegt (`placements`).
- **Tracking-App:** Liste = Läufe (alle Nutzer sehen alle, Spalte „Erstellt
  von" — „Centralized"), Standard-Sortierung neueste zuerst. Detailseite =
  Kopf (Bezeichnung, Systeme, Status) + Tabelle **Geschäftspartner** (eine Zeile
  je Person UND System, mit Nummer) + Tabelle **Alle angelegten Objekte**
  (System | Objekttyp | Schlüssel | Status | Kopiert aus — Folie 16).
  Kopfzeilen-Knöpfe: „In weiteres System kopieren" (`copyRun`, Quelle = System
  in dem der Lauf liegt, Ziel = eines in dem er nicht liegt; Kopien hängen am
  SELBEN Lauf mit `sourceSystem`) und „In System löschen" (`deleteRun`, löscht
  im Backend, setzt im Protokoll `status='deleted'` + `deletedAt` — Historie
  bleibt). Beides nur für eigene Läufe (sonst 403). Lauf-Status:
  created | partially deleted | deleted; `Runs.systems` = Systeme mit noch
  aktiven Objekten (vom Service nach jeder Aktion neu berechnet).
- **Systeme-App:** Katalog; „Neues System" mit Freitext „Technischer Name
  (Destination)" (Vorschläge BackendAPI_2/3). Für GISA: hier den Namen der
  echten Destination eintragen.
- Bewusst NICHT umgesetzt: Kopieren/Löschen einzelner Personen (Granularität =
  Lauf, so denken Tester); weitere Objekttypen (die API bietet genau vier).

## Setup & Befehle
- Pfad: `/Users/magnusbuchwald/Desktop/Coding/Generator`
- GitHub: `github.com/nicolasfinnblank/gisatestproject`
- `cds` CLI aus `@sap/cds-dk` (global installiert)
- Starten: `cds watch` → http://localhost:4004
- FE-Apps: `/generator/webapp/index.html`, `/tracking/webapp/index.html`,
  `/systems/webapp/index.html`
- Tests: `npm test` (18 Integrationstests, jest + cds.test)
- Browser-Test lokal: `.claude/launch.json` (Config `cap-local`, Port 4004,
  `--with-mocks --in-memory`); Server ggf. per Shell im Hintergrund starten.

## Git-Stand
- `main` = Original (unberührt), auf GitHub.
- `improvements` = **aktueller Hauptstand, auf GitHub gepusht** (origin/improvements).
  Enthält ALLES: echter OData-Push, Backend-Mock+Validierung, Auth+Multi-User,
  Fiori-Elements-UI, **Tracking**, **Multi-System (2 Backends)**, **Copy**,
  **Löschen im System**.
- Erledigte Feature-Branches (bereits in improvements gemergt, können weg):
  `feat/fiori-elements-ui`, `feat/tracking`, `feat/multi-system`, `feat/copy`,
  `feat/delete`.
- `feat/approuter` (von improvements): BTP-Deployment, Work Zone, Navigation,
  Cloud-Mocks. `feat/runs` (von feat/approuter, 09.09.): Umbau auf Läufe (s.o.).
  Reihenfolge zum Abschluss: feat/runs → feat/approuter → improvements mergen.
- Arbeitsweise: pro Thema eigener Branch → in `improvements` mergen (Fast-Forward)
  wenn fertig → pushen. Erst lokal committen, später pushen (**nur auf Zuruf**).

## Was funktioniert (verifiziert 09.09.2026, lokal)
- Backend: **18/18 Tests grün** (Auth, Generieren+Anlegen in 1 und 2 Systemen,
  Quittung, zentrales Tracking, Kopieren je Lauf, Löschen mit Status, 403 bei
  fremden Läufen, Validierung).
- FE-UI (im eingebauten Browser durchgeklickt): Generator-Dialog → Lauf in
  S4D+S4Q → MessageBox „Zum Tracking" → Lauf-Liste → Detailseite → Löschen in
  S4D (Status „partially deleted", Systeme „S4Q") → Kopieren S4Q→S4D (30
  Partner-Zeilen, 120 Objekte) → Quittungs-Detail im Generator → Systeme-Dialog.
- **Auf BTP noch NICHT deployt** (cf-Token war abgelaufen). Cloud läuft noch mit
  dem Stand 63beb3a (alte Logik: Generieren/Pushen getrennt).

## Architektur / Schlüsseldateien
- `db/schema.cds`: Namespace `gisa.mdg`. Pools (StreetNames, Cities, …),
  `Runs` (label|createdBy|createdAt|partnerCount|systems|status, Composition
  `objects`), `CreatedObjects` (run|system|sourceSystem|objectType|objectKey|
  sourceConcatID|createdBy|createdAt|status|deletedAt + BP-Stammdaten),
  `GeneratorData` (Quittung: key concatID, createdBy, run),
  `Systems` (Zielsystem-Katalog: name|description|serviceName|isDefault).
- `db/data/gisa.mdg-Systems.csv`: Seed → **S4D** (Default, BackendAPI_2) und
  **S4Q** (BackendAPI_3).
- `srv/service.cds`: Service `GeneratorService`, @path `/service/generator`,
  @requires `Generator`. Actions: `generateAndCreate(anzahl, label, systems : many
  String)` (leer = Default-System), `copyRun(run, sourceSystem, targetSystem)`,
  `deleteRun(run, system)`. Entities: Pools, `GeneratorData` (Quittung,
  per-user, mit `placements`), `Runs` (read-only, ALLE Nutzer, mit `partners`
  und `objects`), `CreatedObjects` (read-only, `@cds.redirection.target`),
  `RunPartners` (= CreatedObjects where objectType='BusinessPartner'),
  `Systems` (CRUD). Alle drei Protokoll-Sichten haben ein berechnetes
  `statusCriticality` (3 grün/2 gelb/1 rot) für die Farbanzeige.
- `srv/service.js`: Logik. Gemeinsame Helfer `createPersonIn(backend, sys,
  person, meta)` (legt Street→City→Address→BP an, liefert 4 Protokoll-Zeilen),
  `refreshRun(runId)` (berechnet `systems`/`status` des Laufs neu), `ownRun(req,
  id)` (lädt Lauf, `req.reject(403)` bei fremdem Lauf — wird VOR dem try/catch
  aufgerufen, damit der 500er-Catch den Status nicht verschluckt).
  - generateAndCreate: validiert Anzahl 1..1000, legt `Runs`-Zeile an, würfelt
    Personen, ersetzt eigene Quittung, legt je System an, protokolliert.
    *Number-Felder NICHT mitsenden (server-vergeben). Hausnummer im Muster
    `[0-9]{1,4}[a-z]` (Pool-Werte wie „88k" bleiben unverändert, sonst wird ein
    Buchstabe angehängt) — je Person EINMAL festgelegt, gleich in allen Systemen.
  - copyRun: BP-Keys des Laufs im Quellsystem (status created) aus dem
    Protokoll, liest BP→Address→Street/City **flach** (kein $expand!) aus dem
    Quell-Backend, legt im Ziel neu an, protokolliert am selben Lauf mit
    `sourceSystem`.
  - deleteRun: je Objekttyp die *Number → Backend-IDs → **key-basiert** löschen
    (BP→Address→Street→City); setzt Protokoll auf `deleted`/`deletedAt`.
- `srv/external/_mockBackend.js`: **geteilte** Mock-Logik (vergibt Nummern,
  erzwingt Validierung) für beide Backends.
- `srv/external/BackendAPI_2.{csn,edmx,js}` + `BackendAPI_3.{csn,js}`: die zwei
  gemockten Ziel-Backends (eindeutige Namen, getrennte In-Memory-Tabellen).
  In `package.json` unter `cds.requires` als zwei `odata`-Services registriert.
- `app/annotations.cds`: FE-Annotationen für GeneratorData (+ `placements`),
  Pools, Runs (LineItem, PresentationVariant createdAt desc, Facets Lauf /
  Geschäftspartner / Alle Objekte), RunPartners (+ `#Placement`-Variante),
  CreatedObjects, Systems. Facets zeigen auf `partners/@UI.PresentationVariant`
  bzw. `objects/@UI.PresentationVariant` (sortiert).
- `app/generator/webapp/`, `app/tracking/webapp/`, `app/systems/webapp/`: drei
  eigenständige FE-Apps. Custom-Aktionen in je `ext/*.js`. Tracking:
  Kopieren/Löschen sind **Object-Page-Kopfaktionen** (manifest
  `content.header.actions`), der Handler bekommt den Binding-Context des Laufs
  als 1. Parameter (`oContext.getObject()`). Navigation zwischen den Apps über
  `navigateTo()`: im Launchpad per `CrossApplicationNavigation` (Intent
  `<app>-display`), sonst per `appUrl()` (BTP `/gisamdg<app>/index.html` vs.
  lokal `/<app>/webapp/index.html`).

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
7. **UI selbst verifizieren** (statt Nutzer testen lassen): Server per Shell
   `node_modules/.bin/cds serve all --with-mocks --in-memory --port 4004` im
   Hintergrund, dann eingebauter Browser (`preview_start` mit URL; die
   launch.json-Variante scheitert an fehlendem Desktop-Zugriff des Preview-
   Prozesses). **Nach Code-Änderungen echten Reload erzwingen**
   (`location.reload()`): eine `navigate` auf dieselbe URL mit anderem Hash lädt
   NICHT neu — alte JS/Metadaten bleiben im Speicher.
8. UI5 lädt vom CDN ui5.sap.com (erstmalig evtl. langsam, dann gecacht).

## Abgleich mit der Aufgabenstellung (Folien 16/17, geprüft 09.09.2026)
Folie 17 Punkt für Punkt erfüllt: BTP-Web-App, mehrere Entitäten (die vier, die
die gelieferte API kennt: Street, City, Address, BusinessPartner — Contract
Account/Country gibt es in der API nicht), Datenpools, OData-Anlage,
Massenanlage, Tracking für mehrere Systeme, Kopieren, UIs für Generierung und
angelegte Entitäten, optional Löschen. Folie 16: Generator legt direkt im S/4 an
(kein Zwischenschritt), Tabelle System|Object|Key mit eigener UI = Detailseite
des Laufs. Einzige Ergänzung: der **Lauf** als Ordnungseinheit.
Noch offen (Ausbau): **Destination zum echten S/4-System** (URL + Auth von
Christian) — bis dahin laufen Anlegen/Kopieren/Löschen gegen die Mocks.

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

**Nächster Schritt (offen, 09.09.):** `cf login` (Token abgelaufen), dann
`npx mbt build` + `cf deploy … -f` mit dem Stand `feat/runs`. Das HDI-Deploy
legt `Runs` an, erweitert `CreatedObjects`/`GeneratorData` um Spalten und
entfernt die alten Views (`undeploy.json`). Danach fachlicher Durchlauf im
Launchpad: Generieren & anlegen -> Tracking -> Kopieren -> Löschen. Tracking-
und Systeme-Kachel müssen auf die Work-Zone-Laufzeitadressen zeigen (s.u.).

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
