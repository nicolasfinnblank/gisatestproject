# GISA Master Data Generator

SAP CAP-Anwendung, die realistische Test-Stammdaten (Business Partner, Adressen,
Namen) aus Daten-Pools generiert und per OData in SAP S/4HANA-Systeme überträgt.
Sie kann mehrere Zielsysteme verwalten, das Angelegte protokollieren, Daten
zwischen Systemen kopieren und im System wieder löschen.

## Features

- **Lauf** – jede Testdaten-Erstellung ist ein Lauf mit Bezeichnung (z. B.
  „Testfall 4711"), Ersteller, Zeitpunkt, Systemen und Status. Kopieren und
  Löschen wirken pro Lauf – so, wie Tester denken.
- **Generieren & anlegen in einem Schritt** – Anzahl, Bezeichnung und ein oder
  mehrere Zielsysteme wählen; die Personen werden aus den Pools (Straßen,
  Städte, Namen, PLZ …) gewürfelt und sofort per OData angelegt
  (`generateAndCreate`), Reihenfolge `Street → City → Address → BusinessPartner`
  je System.
- **Tracking** – zentral für alle Nutzer: Liste der Läufe, Detailseite mit den
  Geschäftspartnern je System (Name, Adresse, Nummer, Status); je Person eine
  Seite mit den vier im System angelegten Objekten und ihren Schlüsseln.
- **Kopieren** – überträgt die Geschäftspartner eines Laufs aus einem System in
  ein weiteres (`copyRun`); die Kopien hängen am selben Lauf.
- **Löschen** – entfernt die Objekte eines Laufs in einem oder mehreren Systemen
  wieder (`deleteRun` je System); das Protokoll bleibt mit Status „Gelöscht" erhalten.
- **Mehrbenutzer-sicher** – Kopieren und Löschen nur für eigene Läufe; die
  Startseite des Generators zeigt nur die eigenen Läufe.
- **Fiori-Elements-UIs** – drei Oberflächen: Generator, Tracking, Zielsysteme.

## Projektstruktur

| Ordner / Datei | Inhalt |
|---|---|
| `db/schema.cds` | Datenmodell: Pools, `Runs`, `CreatedObjects`, `Systems` |
| `db/data/*.csv` | Startdaten (Pools + Zielsysteme), beim Start geladen |
| `srv/service.cds` | OData-Service-Definition (Entities + Actions) |
| `srv/service.js` | Geschäftslogik (Generieren & anlegen, Kopieren, Löschen je Lauf) |
| `srv/external/_mockBackend.js` | Gemeinsame Mock-Logik der Backends (nur Entwicklung) |
| `srv/external/BackendAPI_2.*` | Modell + Mock des Zielsystems **S4D** |
| `srv/external/BackendAPI_3.*` | Modell + Mock des Zielsystems **S4Q** |
| `app/annotations.cds` | Fiori-Elements-Annotationen (Tabellen/Spalten) |
| `app/generator/webapp/` | UI 1: Lauf anlegen (Dialog) + meine letzten 5 Läufe (`MyRuns`, Klick → Tracking) |
| `app/tracking/webapp/` | UI 2: Läufe mit Geschäftspartnern und Objekten; Kopieren/Löschen |
| `app/systems/webapp/` | UI 3: Zielsysteme verwalten |
| `test/integration.test.js` | Integrationstests (24) |
| `mta.yaml` | Deployment-Beschreibung für SAP BTP (Backend, DB, Fiori-Apps) |

## Lokal starten (auch für Kollegen)

Voraussetzung: **Node.js 20 oder neuer** (`node -v`). Die CAP-Tools werden als
Projekt-Abhängigkeit mitinstalliert, eine globale Installation ist nicht nötig.

```bash
git clone <Repository-URL>
cd Generator
npm install
npm run watch
```

Der Server läuft auf <http://localhost:4004>, die drei Oberflächen unter:

- Generator: <http://localhost:4004/generator/webapp/index.html>
- Tracking: <http://localhost:4004/tracking/webapp/index.html>
- Zielsysteme: <http://localhost:4004/systems/webapp/index.html>

Lokal ist **keine Anmeldung** nötig (Entwicklungs-Authentifizierung `dummy`,
Nutzername `privileged`). `cds watch` mockt beide Zielsysteme automatisch (unter
`/odata/v4/backend-api-2` bzw. `…-3`), sodass Anlegen, Kopieren und Löschen
vollständig funktionieren. Die Datenbank liegt nur im Arbeitsspeicher: Jeder
Start beginnt frisch mit den Startdaten aus `db/data/`, angelegte Läufe sind nach
einem Neustart weg. Die Mock-Logik in `srv/external/_mockBackend.js` bildet die
Validierungen und die vom Backend vergebenen Nummern des echten Systems nach.

Die Navigation zwischen den drei Apps funktioniert lokal über die Adresszeile;
im Launchpad läuft sie über die Kacheln bzw. die Shell.

## Tests

```bash
npm test           # 24 Integrationstests (jest + cds.test)
```

Geprüft werden u. a. Authentifizierung/Rollen, Generieren & anlegen in einem
und in mehreren Systemen, zentrales Tracking, Kopieren und Löschen je Lauf
(inkl. Status), Ablehnung fremder Läufe.

## Umgebungen

| | Datenbank | Authentifizierung | Backends |
|---|---|---|---|
| **Entwicklung** | SQLite im Arbeitsspeicher | dummy | lokale Mocks |
| **Produktion** | SAP HANA | XSUAA | echte S/4HANA-Systeme (per Destination) |

## Deployment auf SAP BTP

Das Projekt ist als MTA (`mta.yaml`) beschrieben und wird in einen Cloud-Foundry-
Space deployt. Bauen und ausrollen:

```bash
npm install                                              # Lockfile synchron halten
npx mbt build                                            # erzeugt mta_archives/*.mtar
cf deploy mta_archives/gisa-master-data-generator_1.0.0.mtar -f
```

Bestandteile: `srv` (CAP-Service, Node.js), `db-deployer` (HANA-Schema),
`app-deployer` (lädt die drei Fiori-Apps ins HTML5-Repository), `destinations`
sowie die Ressourcen XSUAA, HANA (hdi-shared), Destination und HTML5-Repo-Host.

**Stand:** Backend, Datenbank und die drei Fiori-Apps laufen auf BTP. Die Apps
werden über SAP Build Work Zone ausgeliefert (Launchpad mit drei Kacheln,
Anmeldung über SAP Cloud Identity Services); einen eigenen Application Router
enthält das Projekt bewusst nicht. Bis eine Destination zum echten S/4HANA-System
vorliegt, laufen die Zielsysteme auch in der Cloud als Mocks. Details, Adressen
und Stolperfallen stehen in [`HANDOFF.md`](HANDOFF.md).

## Übergabe: was im Zielsystem anzupassen ist

Der Code ist umgebungsneutral. Anzupassen sind nur Konfiguration und
Berechtigungen:

1. **Destination zum S/4HANA-System** im BTP-Cockpit anlegen (Connectivity →
   Destinations): URL des OData-Service und die dort übliche Authentifizierung.
2. **Remote-Service verdrahten** in `package.json` unter `cds.requires`. Der
   Eintrag trägt den technischen Namen, den die App kennt, und verweist in
   Produktion auf die Destination:

   ```json
   "BackendAPI_2": {
     "kind": "odata",
     "model": "srv/external/BackendAPI_2",
     "[production]": {
       "credentials": { "destination": "S4D", "path": "/<Pfad des OData-Service>" }
     }
   }
   ```

   Weitere Systeme bekommen weitere Einträge (z. B. `BackendAPI_4`). Aufwand und
   Voraussetzungen siehe „Bekannte Grenzen und nächste Schritte".
3. **Mocks entfernen**, sobald die echten Systeme hängen:
   `cds.features["[production]"].with_mocks` löschen, im `start`-Skript
   `--with-mocks` streichen, `db/mocks.cds` löschen. Wichtig: die acht dann
   überflüssigen Tabellen in `db/undeploy.json` eintragen
   (`src/gen/BackendAPI_*.hdbtable`), sonst bleiben sie in der HANA-Datenbank
   zurück.
4. **Zielsysteme pflegen** in der Systeme-App: Name (z. B. `S4D`), Beschreibung
   und als *technischen Service* den Schlüssel aus Schritt 2. Vorbelegt sind die
   beiden Mock-Systeme in `db/data/gisa.mdg-Systems.csv`.
5. **Berechtigungen**: die Rollensammlung `Generator (…)` einer Benutzergruppe
   aus dem Firmenverzeichnis zuweisen. Ohne sie sind die Apps sichtbar, liefern
   aber keine Daten (bewusst: nur berechtigte Personen legen Testdaten an).
6. **Launchpad**: Site in SAP Build Work Zone anlegen und die drei Apps als
   Kacheln aufnehmen — in einer regulären Umgebung über den Content Explorer
   des HTML5-Repositories, sonst manuell im Content Manager.

## Bekannte Grenzen und nächste Schritte

Die Anwendung ist gegen nachgebildete Zielsysteme entwickelt und getestet. Für den
Anschluss eines echten S/4HANA-Systems ist Folgendes bekannt.

**Bereits vorbereitet**

- **CSRF-Token:** Für beide Remote-Services ist `"csrf": true` gesetzt. SAP-Gateway-
  Dienste verlangen das Token bei Schreibzugriffen, CAP holt es damit automatisch.
- **Filter in Blöcken:** Kopieren und Löschen fragen Nummern und Kennungen in Blöcken
  zu höchstens 50 Werten ab (`selectIn` in `srv/service.js`). CAP schreibt eine
  Filterliste für OData als `feld eq a or feld eq b …` in die Adresse, ohne Blöcke
  würde sie bei großen Läufen zu lang. Abgesichert durch einen eigenen Test.

**Offen, weil nur mit einem echten System prüfbar**

- **Zugang ins Firmennetz:** Für ein S/4 im eigenen Netz braucht es den SAP Cloud
  Connector und eine Instanz des Connectivity-Dienstes, gebunden an `srv`. Die
  Destination bekommt `ProxyType: OnPremise`. Beides fehlt in `mta.yaml`.
- **Laufzeit großer Läufe:** Alle Aufrufe an das Zielsystem laufen nacheinander in
  einer einzigen Anfrage, vier je Person und System. Die Obergrenze von 500 Personen
  ist gegen die Nachbildung bemessen. Gegen ein echtes System die Laufzeit messen und
  bei Bedarf auf Hintergrundverarbeitung mit Statusanzeige oder OData-`$batch`
  umstellen.
- **Kein Test über das Netz:** Die Nachbildungen laufen im selben Prozess wie der
  Dienst, dabei entstehen keine HTTP-Aufrufe. Adressbau, Anmeldung und Laufzeiten
  werden erst beim ersten Anschluss geprüft.
- **Schnittstelle:** Das Zielsystem muss die von GISA beschriebene Schnittstelle
  anbieten (`srv/external/BackendAPI_2.edmx`). Die Standard-API von S/4HANA für
  Geschäftspartner ist anders aufgebaut.
- **Aufwand je weiterem System:** Im jetzigen Aufbau eine eigene, umbenannte Kopie
  des Modells in `srv/external/` (Dienstname gleich Schlüssel in `cds.requires`),
  ein Eintrag in `package.json`, eine Destination, neu ausrollen, danach der Eintrag
  in der Systeme-App.

**Empfehlung für den ersten Anschluss:** ein Testsystem, ein Lauf mit einer Person,
danach schrittweise größer und dabei die Laufzeit messen.

## Dokumentation

Ein ausführliches Stand-Dokument für die Weiterarbeit (Architektur, verifizierte
Funktionen, bekannte Stolperfallen) liegt unter [`HANDOFF.md`](HANDOFF.md).

## Mehr zu CAP

<https://cap.cloud.sap>
