# GISA Master Data Generator

SAP CAP-Anwendung, die realistische Testdaten (Business Partner, Adressen, Namen)
generiert und per OData an ein SAP S/4HANA-Backend übergibt.

## Funktionsweise

1. **Stammdaten-Pools** (Straßen, Städte, Vor-/Nachnamen, PLZ, Hausnummern …)
   liegen als CSV in `db/data/` und werden beim Start in die Datenbank geladen.
2. **Generieren** (`generateTestCustomers`): würfelt aus den Pools eine
   einstellbare Anzahl Testkunden zusammen und legt sie in `GeneratorData` ab.
3. **Push** (`pushToBackend`): überträgt die generierten Datensätze per echtem
   OData-Call an den Backend-Service `BackendAPI_2`
   (`Street → City → Address → BusinessPartner`).

## Projektstruktur

| Ordner / Datei | Inhalt |
|---|---|
| `db/schema.cds` | Datenmodell (Stammdaten-Entities + `GeneratorData`) |
| `db/data/*.csv` | Stammdaten, die beim Start geladen werden |
| `srv/service.cds` | OData-Service-Definition + Actions |
| `srv/service.js` | Geschäftslogik (Generieren + Push) |
| `srv/external/BackendAPI_2.*` | Modell des Backend-Service (vom Partner) |
| `srv/external/BackendAPI_2.js` | Lokale Mock-Logik des Backends (nur Entwicklung) |
| `app/` | Fiori-Elements-Oberfläche (Annotationen) |

## Lokal starten

Voraussetzung: Node.js und die CAP-Tools (`npm i -g @sap/cds-dk`).

```bash
npm install        # Abhängigkeiten installieren
cds watch          # App starten (lokal mit SQLite, Backend wird gemockt)
```

Der Server läuft auf <http://localhost:4004>. Das Backend wird lokal unter
`/odata/v4/backend-api-2` automatisch gemockt; die Mock-Logik in
`srv/external/BackendAPI_2.js` bildet die Validierungen und vom Server
vergebenen Nummern des echten Backends nach.

### Actions ausprobieren

Siehe [srv/test.http](srv/test.http) – Generieren und Push lassen sich dort
direkt auslösen.

## Umgebungen

| | Datenbank | Authentifizierung | Backend |
|---|---|---|---|
| **Entwicklung** | SQLite (`db.sqlite`) | dummy | lokaler Mock |
| **Produktion** | SAP HANA | XSUAA | echtes S/4HANA (per Destination) |

## Mehr zu CAP

<https://cap.cloud.sap>
