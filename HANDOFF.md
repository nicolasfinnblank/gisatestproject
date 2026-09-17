# Projekt-Übergabe: GISA Master Data Generator

> Technisches Arbeitsdokument für die Weiterarbeit (Stand 17.09.2026, Zweig
> `improvements`). Einstieg und Startanleitung stehen im `readme.md`.

## Was es ist
SAP-CAP-Anwendung (Node.js) auf SAP BTP. Sie würfelt Test-Geschäftspartner aus
Datenpools (Namen, Straßen, Städte, PLZ, Hausnummern), legt sie per OData in
einem oder mehreren SAP-S/4HANA-Systemen an, protokolliert jedes angelegte
Objekt, kopiert Läufe in weitere Systeme und löscht sie dort wieder. Drei
Fiori-Elements-Apps im Launchpad von SAP Build Work Zone. Uni-Projekt mit GISA,
Aufgabenstellung: Präsentation vom 07.04.2026 (Folie 16 „The idea", Folie 17
„The goal"). Abgabe 25.09.2026.

## Fachliche Logik
Zentraler Begriff ist der **Lauf** (`Runs`): eine Testdaten-Erstellung mit
Bezeichnung, Ersteller, Zeitpunkt, Systemen und Status.

- **Generator-App**
  - Dialog „Generieren & anlegen": Anzahl (1–500), Bezeichnung, Zielsysteme
    (Mehrfachauswahl, Standard vorbelegt). Aktion `generateAndCreate` würfelt die
    Personen und legt sie sofort in allen gewählten Systemen an
    (Street → City → Address → BusinessPartner je System).
  - Startseite **„Meine letzten Läufe"**: fest die 5 neuesten eigenen Läufe
    (`MyRuns`), ohne Filterleiste und Suche. Klick auf eine Zeile öffnet die
    **Detailseite des Laufs im Tracking** (`ext/MyRunsNavigation.js`).
- **Tracking-App**
  - Liste aller Läufe aller Nutzer (zentral), neueste zuerst.
  - Detailseite: Laufdaten + Tabelle Geschäftspartner (eine Zeile je Person UND
    System). Klick auf eine Person → ihre vier Objekte mit Nummern.
  - Kopfknöpfe „In weiteres System kopieren" (`copyRun`, Kopien hängen am selben
    Lauf mit `sourceSystem`) und „In System löschen" (`deleteRun`, löscht im
    Backend, Protokoll bleibt mit `status = 'deleted'` + `deletedAt`). Beides nur
    für eigene Läufe (sonst 403).
  - Reiter „Alle angelegten Objekte" (Folie 16) ist **ausgeblendet**, Entscheidung
    mit Christian offen. Wieder einblenden = eine Facet-Zeile in `annotations.cds`.
- **Systeme-App:** Katalog der Zielsysteme. Anlegen mit Name, Beschreibung,
  technischem Service (Schlüssel unter `cds.requires`), Standard-Kennzeichen.
  Schlüssel = Name in Kleinbuchstaben (`Systems.ID` ist String). Löschen in der
  UI gesperrt, weil Läufe auf ihr System verweisen.
- **Status:** technisch `created | partially deleted | deleted`, in der UI über
  `statusText` auf Deutsch („Angelegt", „Teilweise gelöscht", „Gelöscht") und
  über `statusCriticality` farbig. `Runs.systems` = Systeme mit noch aktiven
  Objekten, nach jeder Aktion neu berechnet (`refreshRun`).
- **Teilabbruch:** Bricht ein Zielsystem mittendrin ab, wirft `generateAndCreate`
  KEINEN Fehler (der würde Lauf und Protokoll zurückrollen, die schon im S/4
  angelegten Objekte blieben unbekannt). Stattdessen: Protokoll sichern, Lauf
  heißt „… (abgebrochen)", Antwort `ok: false`, UI zeigt Warnung.
- Bewusst nicht umgesetzt: Kopieren/Löschen einzelner Personen (Granularität =
  Lauf); weitere Objekttypen (die API kennt genau vier).

## Architektur / Schlüsseldateien
- `db/schema.cds` (Namespace `gisa.mdg`): Pools, `Runs` (Composition `objects`),
  `CreatedObjects` (Protokoll: run, system, sourceSystem, objectType, objectKey,
  sourceConcatID, status, deletedAt + Stammdaten beim BP), `Systems`.
- `db/data/*.csv`: Pools + Startsysteme **S4D** (Standard, `BackendAPI_2`) und
  **S4Q** (`BackendAPI_3`).
- `db/mocks.cds`: macht die Mock-Tabellen der Backends auch auf HANA persistent.
- `srv/service.cds`: `GeneratorService`, Pfad `/service/generator`,
  `@requires: 'Generator'`. Sichten `Runs` (alle), `MyRuns` (5 neueste eigene,
  `where createdBy = $user order by createdAt desc limit 5`), `CreatedObjects`,
  `RunPartners` (nur BusinessPartner, mit `objects`), `Systems` (CRUD).
  Berechnet: `statusText`, `statusCriticality`, `objectOrder`.
- `srv/service.js`:
  - `generateAndCreate`: holt aus jeder Namensliste per `ORDER BY RAND()/RANDOM()
    LIMIT anzahl` nur eine Stichprobe (nicht die ganze Liste, Straßen allein
    ~20.600 Zeilen); ist eine Liste kürzer, werden gezogene Einträge wiederholt.
    Hausnummer im Backend-Muster `[0-9]{1,4}[a-z]`, je Person einmal festgelegt.
    `*Number`-Felder vergibt das Backend, nie mitsenden.
  - `copyRun`: liest BP → Address → Street/City **flach** aus dem Quellsystem
    (kein tiefes `$expand`, der Mock kann es nicht), legt im Ziel neu an.
  - `deleteRun`: je Objekttyp Nummern → Backend-IDs → key-basiert löschen
    (BP → Address → Street → City).
  - Helfer: `createPersonIn`, `refreshRun`, `ownRun` (403 per `req.reject`, VOR dem
    try/catch), `selectIn` (Filterlisten an Remote-Services in Blöcken zu 50, leere
    Liste = keine Anfrage).
- `srv/external/`: Modelle der Ziel-API + Mocks (`_mockBackend.js` vergibt Nummern
  und prüft wie das echte System).
- `srv/server.js`: lokal `/<app>/webapp/service/generator/*` → `/service/generator/*`.
- `app/annotations.cds`: alle Fiori-Annotationen.
- `app/<app>/webapp/`: drei FE-Apps, eigene Knöpfe in `ext/*.js` (manifest
  `controlConfiguration` bzw. `content.header.actions`). Navigation zwischen Apps:
  im Launchpad `CrossApplicationNavigation` (Intent `<app>-display`), lokal per
  Adresse. Die Hilfsfunktionen sind je App kopiert, weil jede App einzeln
  ausgeliefert wird.
- `test/integration.test.js`: 24 Tests (jest + `cds.test`, mocked Auth mit
  alice…frank und mallory ohne Rolle).

## Setup & Befehle
- Repo: `github.com/nicolasfinnblank/gisatestproject`, Zweig **`improvements`**
  (`main` = alter Stand vom Juni, unberührt).
- Lokal: `npm install`, `npm run watch` → http://localhost:4004,
  Apps unter `/generator|tracking|systems/webapp/index.html`. Datenbank liegt im
  **Arbeitsspeicher**: jeder Start frisch, keine `db.sqlite`.
- Tests: `npm test`.
- Deploy: `npx mbt build`, dann
  `cf deploy mta_archives/gisa-master-data-generator_1.0.0.mtar -f`.
- Arbeitsweise: je Thema eigener Zweig → Fast-Forward in `improvements`.
  Pushen nur auf Zuruf.

## BTP-Umgebung (Trial)
- Global Account/Org `eb23aca2trial`, Subaccount `trial`
  (`123c2a99-96c7-4c66-8a0e-22b7b94f2aad`), Region us10, Space `dev`,
  CF-API `https://api.cf.us10-001.hana.ondemand.com`.
- MTA-Module: `srv`, `db-deployer`, `app-deployer` (drei Apps ins HTML5-Repo),
  drei `html5`-Module, `destinations`. Ressourcen: XSUAA, HANA hdi-shared,
  Destination, HTML5-Repo `app-host`. Kein eigener Application Router: Die Apps
  liefert der managed Approuter von Work Zone aus.
- HANA: `gisa-hana` (hana-free).
- Work Zone: IAS-Tenant `a9jpmbquf` (Trust `sap.custom`), Site mit drei **manuell
  angelegten** Kacheln (Intent `<app>-display`, URL
  `https://eb23aca2trial.launchpad.cfapps.us10.hana.ondemand.com/gisamasterdatageneratorservice.gisamdg<app>-1.0.0/index.html`).
  - Site Manager: `https://eb23aca2trial.dt.launchpad.cfapps.us10.hana.ondemand.com`
  - Launchpad: `https://eb23aca2trial.launchpad.cfapps.us10.hana.ondemand.com/site?siteId=b9e6e59a-45d1-4b51-b3b7-34b263823079`
- Rollen: Rollensammlung `Generator (gisa-master-data-generator eb23aca2trial-dev)`
  und `Launchpad_Admin`, zugewiesen über `--of-idp sap.custom`.
- Zielsysteme in der Cloud sind die **Mocks** (`[production].with_mocks`,
  `db/mocks.cds`). Für ein echtes System: Destination + `[production]`-Credentials
  für `BackendAPI_2/3`, `--with-mocks` und `db/mocks.cds` entfernen, Cloud
  Connector für On-Premise. Offene Grenzen: readme „Bekannte Grenzen".
- **Fristen:** IAS-Trial-Tenant ca. 21.09. abgelaufen → neu aufsetzen (unten).
  Abgabe 25.09.2026.

## KRITISCHE Gotchas
1. **Trial schläft nachts:** App gestoppt → Route 404 →
   `cf start gisa-master-data-generator-srv`. HANA gestoppt → HTTP 500 mit
   `ResourceRequest timed out` → `cf update-service gisa-hana -c
   '{"data":{"serviceStopped":false}}'` (10–15 Min). `cf service gisa-hana` zeigt nur
   den letzten Vorgang, nicht den Betriebszustand.
2. **Browser-Cache nach Deploys:** Wird eine Entity entfernt oder umbenannt, hält
   der Browser die alte `manifest.json` → „Error while processing building block
   FilterBar". Privates Fenster oder Cache leeren. Die App-Version (1.0.0) steckt
   in den Kachel-URLs, deshalb nicht hochzählen.
3. **`cf deploy` endet stumm:** multiapps-Plugin ist die Intel-Version („bad CPU
   type"). Fix: `cf install-plugin https://github.com/cloudfoundry/multiapps-cli-plugin/releases/download/v3.11.1/multiapps-plugin.osxarm64 -f`.
4. **HTML5-App-Namen ohne Punkt** (`gisamdggenerator`), sonst 503 „Service Tag
   unknown". Service-Pfad im manifest **relativ** (`service/generator/`), sonst
   weiße Seite hinter dem Work-Zone-Approuter.
5. **Weiße Seite / Höhe 0:** `index.html` nutzt expliziten `ComponentContainer`
   mit `height: "100%"` + CSS `html, body, #content { height: 100% }`.
6. **Eigene Knöpfe:** FE ruft unbound Actions über `DataFieldForAction` nicht auf.
   Knöpfe im manifest + Handler in `ext/*.js` (POST per `fetch`).
7. **Controller-Erweiterung im Generator:** `Component.js` muss
   `ext/MyRunsNavigation` vorab laden, sonst „Attempt to load Extension Controller
   … not successful" und die Startseite bleibt leer. Die Route `MyRunsObjectPage`
   bleibt nur, damit FE Zeilen klickbar macht.
8. **Zweite DB-Transaktion im Handler** ist keine Option (SQLite: eine Verbindung
   → hängt). Deshalb `ok: false` statt Fehler beim Teilabbruch.
9. **Console-„Fehler" lokal** (Component-preload 404, lrep/flex 404, i18n_en 404)
   sind harmlos.
10. **UI selbst prüfen:** Server per Shell starten, eingebauter Browser mit URL;
    nach Änderungen `location.reload()` erzwingen (Hash-Wechsel lädt nicht neu).
11. **Content Explorer zeigt keine Apps (0):** Trial-Eigenheit (Work Zone auf
    Landschaft cf-us10, unsere Org auf cf-us10-001). Abgehakt, deshalb manuelle
    Kacheln. Bei GISA ist der Content Explorer der Normalfall.

## Work Zone neu aufsetzen (z. B. wenn der IAS-Tenant abläuft)
Work Zone verlangt IAS über OIDC (KBA 3600432). `~/bin/btp` nutzen, `cf` zeigt
Subscriptions nicht.
1. `btp subscribe accounts/subaccount --subaccount <id> --to-app sap-identity-services-onboarding --plan default`
   → Aktivierungsmail → Admin-Passwort setzen
2. `btp list security/available-idp` bis der Tenant erscheint, dann
   `btp create security/trust --subaccount <id> --idp <voller Host>`
3. `btp subscribe accounts/subaccount --subaccount <id> --to-app SAPLaunchpadSMS --plan standard`
4. `btp assign security/role-collection <Rolle> --to-user <mail> --of-idp sap.custom --subaccount <id>`
5. Site und die drei Kacheln wie oben anlegen.

## Nutzer-Kontext
Git-/SAP-Einsteiger. Auf Deutsch, kurz und einfach erklären, Schritt für
Schritt, Fehler offen benennen.
