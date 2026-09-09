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
- **Löschen** – entfernt die Objekte eines Laufs in einem System wieder
  (`deleteRun`); das Protokoll bleibt mit Status „deleted" erhalten.
- **Mehrbenutzer-sicher** – Kopieren und Löschen nur für eigene Läufe; die
  Quittung des letzten Laufs sieht nur der Ersteller.
- **Fiori-Elements-UIs** – drei Oberflächen: Generator, Tracking, Zielsysteme.

## Projektstruktur

| Ordner / Datei | Inhalt |
|---|---|
| `db/schema.cds` | Datenmodell: Pools, `Runs`, `CreatedObjects`, `GeneratorData` (Quittung), `Systems` |
| `db/data/*.csv` | Startdaten (Pools + Zielsysteme), beim Start geladen |
| `srv/service.cds` | OData-Service-Definition (Entities + Actions) |
| `srv/service.js` | Geschäftslogik (Generieren & anlegen, Kopieren, Löschen je Lauf) |
| `srv/external/_mockBackend.js` | Gemeinsame Mock-Logik der Backends (nur Entwicklung) |
| `srv/external/BackendAPI_2.*` | Modell + Mock des Zielsystems **S4D** |
| `srv/external/BackendAPI_3.*` | Modell + Mock des Zielsystems **S4Q** |
| `app/annotations.cds` | Fiori-Elements-Annotationen (Tabellen/Spalten) |
| `app/generator/webapp/` | UI 1: Lauf anlegen (Dialog) + Quittung des letzten Laufs |
| `app/tracking/webapp/` | UI 2: Läufe mit Geschäftspartnern und Objekten; Kopieren/Löschen |
| `app/systems/webapp/` | UI 3: Zielsysteme verwalten |
| `test/integration.test.js` | Integrationstests (22) |
| `mta.yaml` | Deployment-Beschreibung für SAP BTP (Backend, DB, Fiori-Apps) |

## Lokale Entwicklung

Voraussetzung: Node.js und die CAP-Tools (`npm i -g @sap/cds-dk`).

```bash
npm install        # Abhängigkeiten installieren
npm run watch      # App starten (cds watch)
```

Der Server läuft auf <http://localhost:4004>. `cds watch` startet lokal mit
SQLite und **mockt beide Zielsysteme automatisch** (unter
`/odata/v4/backend-api-2` bzw. `…-3`), sodass Push, Copy und Delete vollständig
funktionieren. Für den Browser-Test ohne persistente Datei:
`npx cds serve all --with-mocks --in-memory`. Die Mock-Logik in
`srv/external/_mockBackend.js` bildet die
Validierungen und die vom Backend vergebenen Nummern des echten Systems nach.

Die Oberflächen sind erreichbar unter:

- Generator: `/generator/webapp/index.html`
- Tracking: `/tracking/webapp/index.html`
- Zielsysteme: `/systems/webapp/index.html`

## Tests

```bash
npm test           # 22 Integrationstests (jest + cds.test)
```

Geprüft werden u. a. Authentifizierung/Rollen, Generieren & anlegen in einem
und in mehreren Systemen, zentrales Tracking, Kopieren und Löschen je Lauf
(inkl. Status), Ablehnung fremder Läufe.

## Umgebungen

| | Datenbank | Authentifizierung | Backends |
|---|---|---|---|
| **Entwicklung** | SQLite (`db.sqlite`) | dummy | lokale Mocks |
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

## Dokumentation

Ein ausführliches Stand-Dokument für die Weiterarbeit (Architektur, verifizierte
Funktionen, bekannte Stolperfallen) liegt unter [`HANDOFF.md`](HANDOFF.md).

## Mehr zu CAP

<https://cap.cloud.sap>
