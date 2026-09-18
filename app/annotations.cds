using { GeneratorService } from '../srv/service.cds';

//
// --- Tracking: Laeufe (Liste) mit Geschaeftspartnern und Objekten (Detail) ---
//
annotate GeneratorService.Runs with @UI.HeaderInfo: {
  TypeName: 'Lauf',
  TypeNamePlural: 'Testdaten-Läufe',
  Title: { Value: label },
  Description: { Value: systems }
};

annotate GeneratorService.Runs with {
  ID           @UI.Hidden;
  label        @title: 'Bezeichnung';
  createdBy    @title: 'Erstellt von';
  createdAt    @title: 'Erstellt am';
  partnerCount @title: 'Geschäftspartner';
  systems      @title: 'Systeme';
  status       @UI.Hidden;
  statusText   @title: 'Status';
  // Ja/Nein-Filter, vorbelegt mit Nein: nur Laeufe, die noch in Systemen liegen.
  // Leer = alle Laeufe, Ja = nur vollstaendig geloeschte.
  isDeleted    @title: 'Gelöscht'  @Common.FilterDefaultValue: false;
};

// Importance High: Spalten auch bei schmalem Fenster zeigen (sonst blendet
// Fiori Elements z.B. den Status aus).
annotate GeneratorService.Runs with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: label,        ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: createdAt,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: createdBy,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: systems,      ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: partnerCount, ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality, ![@UI.Importance]: #High }
];

annotate GeneratorService.Runs with @UI.PresentationVariant: {
  SortOrder: [{ Property: createdAt, Descending: true }],
  Visualizations: ['@UI.LineItem']
};

annotate GeneratorService.Runs with @UI.SelectionFields: [
  createdBy, statusText, label, isDeleted
];

annotate GeneratorService.Runs with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: label },
    { $Type: 'UI.DataField', Value: createdAt },
    { $Type: 'UI.DataField', Value: createdBy },
    { $Type: 'UI.DataField', Value: systems },
    { $Type: 'UI.DataField', Value: partnerCount },
    { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality }
  ]
};

// Reiter "Alle angelegten Objekte" (technisches Protokoll System|Objekt|
// Schluessel, Folie 16) ist seit 09.09. ausgeblendet - Entscheidung mit Christian
// offen. Zum Wiedereinblenden die dritte Zeile ergaenzen:
//   { $Type: 'UI.ReferenceFacet', ID: 'Objects', Label: 'Alle angelegten Objekte', Target: 'objects/@UI.PresentationVariant' }
annotate GeneratorService.Runs with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main',     Label: 'Lauf',             Target: '@UI.FieldGroup#Main' },
  { $Type: 'UI.ReferenceFacet', ID: 'Partners', Label: 'Geschäftspartner', Target: 'partners/@UI.PresentationVariant' }
];

//
// --- Generator-Startseite: die 5 neuesten eigenen Laeufe ---
// Uebernimmt die Runs-Annotationen (Sortierung neueste zuerst); hier nur, was
// abweicht: Titel und keine Spalte "Erstellt von". Filterleiste ist im
// manifest.json ausgeblendet, der Klick fuehrt ins Tracking.
//
annotate GeneratorService.MyRuns with @UI.HeaderInfo: {
  TypeName: 'Lauf',
  TypeNamePlural: 'Meine letzten Läufe',
  Title: { Value: label },
  Description: { Value: systems }
};

// Bei 5 Zeilen keine Suche (sonst erscheint ein Suchfeld in der Tabellenleiste).
annotate GeneratorService.MyRuns with @Capabilities.SearchRestrictions.Searchable: false;

annotate GeneratorService.MyRuns with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: label,        ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: createdAt,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: systems,      ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: partnerCount, ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality, ![@UI.Importance]: #High }
];

// Geschaeftspartner des Laufs: eine Zeile je Person UND System.
annotate GeneratorService.RunPartners with {
  ID             @UI.Hidden;
  run            @UI.Hidden;
  sourceConcatID @UI.Hidden;
  objectType     @UI.Hidden;
  firstName      @title: 'Vorname';
  lastName       @title: 'Nachname';
  streetName     @title: 'Straße';
  houseNumber    @title: 'Hausnummer';
  postCode       @title: 'PLZ';
  cityName       @title: 'Stadt';
  system         @title: 'System';
  objectKey      @title: 'Geschäftspartner-Nr.';
  sourceSystem   @title: 'Kopiert aus';
  status         @UI.Hidden;
  statusText     @title: 'Status';
  createdAt      @title: 'Angelegt am';
  deletedAt      @title: 'Gelöscht am';
};

// Eine Zeile je Geschaeftspartner (und System) mit ALLEN Daten der Person.
// ![@UI.Importance]: #High sorgt dafuer, dass Fiori Elements die Spalten auch
// in der Detailseiten-Tabelle alle anzeigt (statt sie als "unwichtig" auszublenden).
annotate GeneratorService.RunPartners with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: firstName,   ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: lastName,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: streetName,  ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: houseNumber, ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: postCode,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: cityName,    ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: system,      ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: objectKey,   ![@UI.Importance]: #High },
  { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality, ![@UI.Importance]: #High }
];

annotate GeneratorService.RunPartners with @UI.PresentationVariant: {
  SortOrder: [
    { Property: lastName }, { Property: firstName }, { Property: system }
  ],
  Visualizations: ['@UI.LineItem']
};

// Detailseite einer Person: Stammdaten + die vier Objekte im System.
annotate GeneratorService.RunPartners with @UI.HeaderInfo: {
  TypeName: 'Geschäftspartner',
  TypeNamePlural: 'Geschäftspartner',
  Title: { Value: lastName },
  Description: { Value: firstName }
};

annotate GeneratorService.RunPartners with @UI.FieldGroup #Person: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: firstName },
    { $Type: 'UI.DataField', Value: lastName },
    { $Type: 'UI.DataField', Value: streetName },
    { $Type: 'UI.DataField', Value: houseNumber },
    { $Type: 'UI.DataField', Value: postCode },
    { $Type: 'UI.DataField', Value: cityName },
    { $Type: 'UI.DataField', Value: system },
    { $Type: 'UI.DataField', Value: objectKey },
    { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality },
    { $Type: 'UI.DataField', Value: sourceSystem },
    { $Type: 'UI.DataField', Value: createdAt },
    { $Type: 'UI.DataField', Value: deletedAt }
  ]
};

annotate GeneratorService.RunPartners with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Person',  Label: 'Geschäftspartner',        Target: '@UI.FieldGroup#Person' },
  { $Type: 'UI.ReferenceFacet', ID: 'Objects', Label: 'Angelegte Objekte im System', Target: 'objects/@UI.PresentationVariant#Object' }
];

// Objekte EINER Person (System ist auf der Seite schon bekannt).
annotate GeneratorService.CreatedObjects with @UI.LineItem #Object: [
  { $Type: 'UI.DataField', Value: objectType },
  { $Type: 'UI.DataField', Value: objectKey },
  { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality },
  { $Type: 'UI.DataField', Value: createdAt },
  { $Type: 'UI.DataField', Value: deletedAt }
];

// Feste Reihenfolge: Geschaeftspartner, Adresse, Strasse, Stadt (alphabetisch
// nach Objekttyp waere City zuerst - unpraktisch).
annotate GeneratorService.CreatedObjects with @UI.PresentationVariant #Object: {
  SortOrder: [{ Property: objectOrder }],
  Visualizations: ['@UI.LineItem#Object']
};

// Alle Objekte des Laufs: die Tabelle System | Objekt | Schluessel.
annotate GeneratorService.CreatedObjects with {
  ID             @UI.Hidden;
  objectOrder    @UI.Hidden;
  run            @UI.Hidden;
  sourceConcatID @UI.Hidden;
  system         @title: 'System';
  objectType     @title: 'Objekttyp';
  objectKey      @title: 'Schlüssel';
  sourceSystem   @title: 'Kopiert aus';
  status         @UI.Hidden;
  statusText     @title: 'Status';
  createdBy      @title: 'Erstellt von';
  createdAt      @title: 'Angelegt am';
  deletedAt      @title: 'Gelöscht am';
};

// Nur fuer den ausgeblendeten Reiter "Alle angelegten Objekte" (s.o.): flache
// Tabelle ueber ALLE Objekte eines Laufs. Wird aktuell von keiner Seite
// gerendert - zusammen mit der Facet-Zeile oben wieder aktivierbar.
annotate GeneratorService.CreatedObjects with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: system },
  { $Type: 'UI.DataField', Value: objectType },
  { $Type: 'UI.DataField', Value: objectKey },
  { $Type: 'UI.DataField', Value: statusText, Criticality: statusCriticality },
  { $Type: 'UI.DataField', Value: sourceSystem },
  { $Type: 'UI.DataField', Value: createdAt },
  { $Type: 'UI.DataField', Value: deletedAt }
];

annotate GeneratorService.CreatedObjects with @UI.PresentationVariant: {
  SortOrder: [
    { Property: system }, { Property: objectType }, { Property: objectKey }
  ],
  Visualizations: ['@UI.LineItem']
};

//
// --- Ziel-Systeme (Verwaltung) ---
//
// Kein Loeschen von Systemen ueber die UI: Laeufe verweisen per Name auf
// ihr System, ein geloeschtes System liesse sie ohne Ziel zurueck.
annotate GeneratorService.Systems with @Capabilities.DeleteRestrictions.Deletable: false;

annotate GeneratorService.Systems with @UI.HeaderInfo: {
  TypeName: 'Zielsystem',
  TypeNamePlural: 'Zielsysteme',
  Title: { Value: name },
  Description: { Value: description }
};

annotate GeneratorService.Systems with {
  ID          @UI.Hidden;
  name        @title: 'System';
  description @title: 'Beschreibung';
  serviceName @title: 'Technischer Service';
  isDefault   @title: 'Standard';
};

annotate GeneratorService.Systems with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: name },
  { $Type: 'UI.DataField', Value: description },
  { $Type: 'UI.DataField', Value: serviceName },
  { $Type: 'UI.DataField', Value: isDefault }
];

annotate GeneratorService.Systems with @UI.SelectionFields: [
  name, isDefault
];

annotate GeneratorService.Systems with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: name },
    { $Type: 'UI.DataField', Value: description },
    { $Type: 'UI.DataField', Value: serviceName },
    { $Type: 'UI.DataField', Value: isDefault }
  ]
};

annotate GeneratorService.Systems with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'Allgemein', Target: '@UI.FieldGroup#Main' }
];

