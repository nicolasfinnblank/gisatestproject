# GISA Master Data Generator

SAP CAP-Anwendung, die realistische Test-Stammdaten (Business Partner, Adressen,
Namen) aus Daten-Pools generiert und per OData in SAP S/4HANA-Systeme überträgt.
Sie kann mehrere Zielsysteme verwalten, das Angelegte protokollieren, Daten
zwischen Systemen kopieren und im System wieder löschen.

## Features

- **Generieren** – würfelt aus den Pools (Straßen, Städte, Namen, PLZ …) eine
  einstellbare Anzahl Testkunden zusammen (`generateTestCustomers`).
- **Pushen in mehrere Systeme** – überträgt die Datensätze per OData ins gewählte
  Zielsystem (`pushToBackend`), Reihenfolge `Street → City → Address →
  BusinessPartner`.
- **Tracking** – protokolliert je angelegtem Objekt `System | Objekttyp |
  Schlüssel` (Entity `CreatedObjects`).
- **Kopieren** – überträgt die eigenen Datensätze von einem System in ein anderes
  (`copyData`).
- **Löschen** – entfernt die eigenen, im System angelegten Objekte wieder
  (`deleteFromBackend`).
- **Mehrbenutzer-sicher** – jede Zeile gehört ihrem Ersteller (`createdBy =
  $user`); Nutzer sehen und verändern nur ihre eigenen Daten.
- **Fiori-Elements-UIs** – drei Oberflächen: Generator, Tracking, Zielsysteme.

## Projektstruktur

| Ordner / Datei | Inhalt |
|---|---|
| `db/schema.cds` | Datenmodell: Pools, `GeneratorData`, `CreatedObjects`, `Systems` |
| `db/data/*.csv` | Startdaten (Pools + Zielsysteme), beim Start geladen |
| `srv/service.cds` | OData-Service-Definition (Entities + Actions) |
| `srv/service.js` | Geschäftslogik (Generieren, Push, Copy, Delete) |
| `srv/external/_mockBackend.js` | Gemeinsame Mock-Logik der Backends (nur Entwicklung) |
| `srv/external/BackendAPI_2.*` | Modell + Mock des Zielsystems **S4D** |
| `srv/external/BackendAPI_3.*` | Modell + Mock des Zielsystems **S4Q** |
| `app/annotations.cds` | Fiori-Elements-Annotationen (Tabellen/Spalten) |
| `app/generator/webapp/` | UI 1: Daten generieren + alle Aktionen |
| `app/tracking/webapp/` | UI 2: Protokoll der angelegten Objekte |
| `app/systems/webapp/` | UI 3: Zielsysteme verwalten |
| `test/integration.test.js` | Integrationstests (17) |

## Lokale Entwicklung

Voraussetzung: Node.js und die CAP-Tools (`npm i -g @sap/cds-dk`).

```bash
npm install        # Abhängigkeiten installieren
npm run watch      # App starten (cds watch)
```

Der Server läuft auf <http://localhost:4004>. `cds watch` startet lokal mit
SQLite und **mockt beide Zielsysteme automatisch** (unter
`/odata/v4/backend-api-2` bzw. `…-3`), sodass Push, Copy und Delete vollständig
funktionieren. Die Mock-Logik in `srv/external/_mockBackend.js` bildet die
Validierungen und die vom Backend vergebenen Nummern des echten Systems nach.

Die Oberflächen sind erreichbar unter:

- Generator: `/generator/webapp/index.html`
- Tracking: `/tracking/webapp/index.html`
- Zielsysteme: `/systems/webapp/index.html`

## Tests

```bash
npm test           # 17 Integrationstests (jest + cds.test)
```

Geprüft werden u. a. Authentifizierung/Rollen, Mehrbenutzer-Isolation,
Generieren, Push ins richtige System, Copy und Delete.

## Umgebungen

| | Datenbank | Authentifizierung | Backends |
|---|---|---|---|
| **Entwicklung** | SQLite (`db.sqlite`) | dummy | lokale Mocks |
| **Produktion** | SAP HANA | XSUAA | echte S/4HANA-Systeme (per Destination) |

## Dokumentation

Eine ausführliche, einsteigerfreundliche Erklärung des gesamten Projekts liegt
als PDF bei: [`GISA-Projekt-Erklaerung.pdf`](GISA-Projekt-Erklaerung.pdf)
(erzeugbar mit `python3 scripts/build_doc.py`).

## Mehr zu CAP

<https://cap.cloud.sap>
