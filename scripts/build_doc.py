# -*- coding: utf-8 -*-
"""Erzeugt die ausfuehrliche Projekt-Dokumentation als PDF (reportlab).

Hinweis: Der Fliesstext ist im Quelltext mit ae/oe/ue/ss geschrieben und wird
beim Bauen automatisch zu echten Umlauten (de()). CODE-Bloecke bleiben unberuehrt.
"""
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Preformatted, Table, TableStyle, KeepTogether,
                                ListFlowable, ListItem, HRFlowable)

# ---------- Farben ----------
SAP_BLUE   = colors.HexColor("#0a3d62")
SAP_ACCENT = colors.HexColor("#1565c0")
LIGHT_BG   = colors.HexColor("#f4f6f8")
CODE_BG    = colors.HexColor("#0f1b2d")
CODE_FG    = colors.HexColor("#e6edf3")
CALL_BG    = colors.HexColor("#fff8e1")
CALL_BORDER= colors.HexColor("#f0c000")
GREEN_BG   = colors.HexColor("#e8f5e9")
GREEN_BD   = colors.HexColor("#43a047")

styles = getSampleStyleSheet()
def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

body   = S("body", fontName="Helvetica", fontSize=10, leading=15,
           alignment=TA_JUSTIFY, spaceAfter=6, textColor=colors.HexColor("#1a1a1a"))
h1     = S("h1", fontName="Helvetica-Bold", fontSize=18, leading=22,
           textColor=SAP_BLUE, spaceBefore=18, spaceAfter=8, keepWithNext=True)
h2     = S("h2", fontName="Helvetica-Bold", fontSize=13.5, leading=18,
           textColor=SAP_ACCENT, spaceBefore=12, spaceAfter=5, keepWithNext=True)
h3     = S("h3", fontName="Helvetica-Bold", fontSize=11, leading=15,
           textColor=colors.HexColor("#2c2c2c"), spaceBefore=8, spaceAfter=3, keepWithNext=True)
bullet = S("bullet", parent=body, spaceAfter=3, leading=14)
small  = S("small", fontName="Helvetica", fontSize=8.5, leading=12,
           textColor=colors.HexColor("#555555"))
codest = S("code", fontName="Courier", fontSize=8.2, leading=11.2,
           textColor=CODE_FG, spaceBefore=2, spaceAfter=2)
toc    = S("toc", parent=body, spaceAfter=2, leading=15)
titlexl= S("titlexl", fontName="Helvetica-Bold", fontSize=30, leading=36,
           textColor=SAP_BLUE, alignment=TA_LEFT, spaceAfter=6)
subtit = S("subtit", fontName="Helvetica", fontSize=13, leading=18,
           textColor=colors.HexColor("#444"), spaceAfter=2)

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# --- Umlaut-Wiederherstellung NUR fuer Fliesstext (nie fuer CODE) ---
_UML_BASE = {
 'fuer':'für','dafuer':'dafür','wofuer':'wofür','ueber':'über','ueberhaupt':'überhaupt',
 'zurueck':'zurück','koennen':'können','koennte':'könnte','koenntest':'könntest',
 'koenne':'könne','muehsam':'mühsam','naechste':'nächste','naechstes':'nächstes',
 'naechsten':'nächsten','oberflaeche':'oberfläche','oberflaechen':'oberflächen',
 'aendern':'ändern','aendert':'ändert','aenderst':'änderst','aenderung':'änderung',
 'aenderungen':'änderungen','waehlen':'wählen','waehlt':'wählt','gewaehlte':'gewählte',
 'gewaehlt':'gewählt','gewaehlten':'gewählten','schluessel':'schlüssel',
 'uebertragen':'übertragen','uebertraegt':'überträgt','uebergabe':'übergabe',
 'haelt':'hält','enthaelt':'enthält','laeuft':'läuft','gehoert':'gehört',
 'gehoeren':'gehören','loeschen':'löschen','loescht':'löscht','moechte':'möchte',
 'praefix':'präfix','waere':'wäre','waeren':'wären','haette':'hätte','spaeter':'später',
 'spaetere':'spätere','verknuepfungen':'verknüpfungen','verknuepft':'verknüpft',
 'fuehlt':'fühlt','anfuehlt':'anfühlt','fuehrt':'führt','ausgefuehrt':'ausgeführt',
 'moeglich':'möglich','ermoeglicht':'ermöglicht','verschoenern':'verschönern',
 'schoenere':'schönere','schoeneren':'schöneren','stueck':'stück','zusaetzlich':'zusätzlich',
 'zusaetzlichen':'zusätzlichen','tuersteher':'türsteher','knoepfe':'knöpfe',
 'loesung':'lösung','faelle':'fälle','wuerfelt':'würfelt','wuerde':'würde',
 'wuerden':'würden','zufaellig':'zufällig','zufaellige':'zufällige','staedte':'städte',
 'staedten':'städten','strassen':'straßen','strasse':'straße','grosse':'große',
 'groesser':'größer','grosser':'großer','grossen':'großen','weisse':'weiße',
 'heisst':'heißt','heissen':'heißen','regulaerer':'regulärer','geschaeftsdaten':'geschäftsdaten',
 'geschaefte':'geschäfte','veraendern':'verändern','veraendert':'verändert',
 'eintraege':'einträge','eintraegen':'einträgen','datensaetze':'datensätze',
 'pruefung':'prüfung','pruefungen':'prüfungen','prueft':'prüft',
 'pruefen':'prüfen','raeumt':'räumt','aufraeumt':'aufräumt','aufraeumen':'aufräumen',
 'erklaerung':'erklärung','vollstaendige':'vollständige','naemlich':'nämlich',
 'groesse':'große','muessen':'müssen','ausfuehrliche':'ausführliche','ausfuehrlich':'ausführlich',
 'datentoepfe':'datentöpfe','funktionsfaehige':'funktionsfähige','haeufig':'häufig',
 'naeher':'näher','grossteils':'großteils','vergroessern':'vergrößern',
 'unterstuetzt':'unterstützt','fuellt':'füllt','befuellt':'befüllt','befuellen':'befüllen',
 'vorbefuellt':'vorbefüllt','verfuegbar':'verfügbar','natuerlich':'natürlich',
 'schliesslich':'schließlich','zugehoerigen':'zugehörigen','benoetigt':'benötigt',
 'benoetigen':'benötigen','hierfuer':'hierfür','grundsaetzlich':'grundsätzlich',
 'tatsaechlich':'tatsächlich','waehrend':'während','ueblich':'üblich','fuenf':'fünf',
 'erzaehlt':'erzählt','ueberzeugend':'überzeugend','rueckgabe':'rückgabe',
 'vertraege':'verträge','erklaeren':'erklären','schoen':'schön','schoene':'schöne',
 'aehnlich':'ähnlich','aehnliche':'ähnliche','geprueft':'geprüft',
 'spaeteren':'späteren','naechster':'nächster','komfort':'komfort','toepfe':'töpfe',
 'verschoenern':'verschönern','ueblicherweise':'üblicherweise','laesst':'lässt',
 'haengt':'hängt','abhaengt':'abhängt','abhaengig':'abhängig','wuerdest':'würdest',
 'erfuellen':'erfüllen','erfuellt':'erfüllt','muss':'muss',
}
def _form(w, repl):
    return (repl[:1].upper() + repl[1:]) if w[:1].isupper() else repl
def de(s):
    def r(m):
        w = m.group(0)
        lo = w.lower()
        return _form(w, _UML_BASE[lo]) if lo in _UML_BASE else w
    return re.sub(r"[A-Za-zäöüÄÖÜ]+", r, s)

story = []
def P(t, st=body):   story.append(Paragraph(de(t), st))
def H1(t):
    story.append(Paragraph(de(t), h1))
    story.append(HRFlowable(width="100%", thickness=1.1, color=SAP_BLUE, spaceAfter=6, spaceBefore=1))
def H2(t):           story.append(Paragraph(de(t), h2))
def H3(t):           story.append(Paragraph(de(t), h3))
def SP(h=6):         story.append(Spacer(1, h))
def PB():            story.append(PageBreak())

def CODE(t, title=None):
    flow = []
    if title:
        flow.append(Paragraph(esc(title), S("ct", fontName="Courier-Bold", fontSize=8.2,
                    leading=11, textColor=colors.HexColor("#8ab4f8"), spaceAfter=2)))
    flow.append(Preformatted(esc(t.rstrip("\n")), codest))
    tbl = Table([[flow]], colWidths=[16.4*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),CODE_BG),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
        ("ROUNDEDCORNERS",[3,3,3,3]),
    ]))
    story.append(KeepTogether(tbl) if len(t) < 1400 else tbl)
    SP(6)

def BULLETS(items, st=bullet):
    lis = [ListItem(Paragraph(de(it), st), leftIndent=6, value="•") for it in items]
    story.append(ListFlowable(lis, bulletType="bullet", start="•",
                 bulletColor=SAP_ACCENT, leftIndent=12, bulletFontSize=8))
    SP(4)

def NUMBERS(items, st=bullet):
    lis = [ListItem(Paragraph(de(it), st), leftIndent=6) for it in items]
    story.append(ListFlowable(lis, bulletType="1", leftIndent=14, bulletColor=SAP_ACCENT))
    SP(4)

def CALLOUT(title, text, kind="info"):
    bg, bd = (CALL_BG, CALL_BORDER) if kind == "info" else (GREEN_BG, GREEN_BD)
    head = Paragraph("<b>%s</b>" % de(esc(title)), S("co_h", parent=body, spaceAfter=3,
                     textColor=colors.HexColor("#333")))
    para = Paragraph(de(text), S("co_b", parent=body, spaceAfter=0))
    tbl = Table([[[head, para]]], colWidths=[16.4*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),bg),
        ("LINEBEFORE",(0,0),(-1,-1),3,bd),
        ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    story.append(KeepTogether(tbl)); SP(8)

def TABLE(rows, header=True, widths=None, fontsize=9):
    data = [[Paragraph(de(esc(c)) if not c.startswith("<") else de(c),
             S("tc", fontName="Helvetica", fontSize=fontsize, leading=fontsize+3))
             for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    st = [
        ("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#cfd8dc")),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LIGHT_BG]),
    ]
    if header:
        st += [("BACKGROUND",(0,0),(-1,0),SAP_BLUE),
               ("TEXTCOLOR",(0,0),(-1,0),colors.white),
               ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold")]
    t.setStyle(TableStyle(st))
    story.append(t); SP(8)

# =====================================================================
#  TITELSEITE
# =====================================================================
SP(70)
story.append(Paragraph("GISA Master Data Generator", titlexl))
story.append(HRFlowable(width="38%", thickness=3, color=SAP_ACCENT, spaceBefore=2, spaceAfter=14, hAlign="LEFT"))
story.append(Paragraph(de("Die vollstaendige Projekt-Erklaerung"), subtit))
story.append(Paragraph(de("Wie die App aufgebaut ist, wie die Dateien zusammenspielen und wie du sie selbst bauen koenntest."), subtit))
SP(26)
story.append(Paragraph(de("<b>Fuer Coding-Einsteiger geschrieben.</b> Es geht um das Verstehen der Konzepte "
            "und Zusammenhaenge &ndash; die Syntax im Detail nimmt dir der Computer ab. "
            "Nach dem Lesen sollst du erklaeren koennen, <i>warum</i> jede Datei existiert und "
            "<i>was</i> bei jedem Klick im Hintergrund passiert."), body))
SP(40)
TABLE([
    ["Thema", "Inhalt"],
    ["Technologie", "SAP CAP (Node.js), OData, SAP Fiori Elements, SQLite/HANA"],
    ["Aufgabe", "Test-Stammdaten generieren, in SAP-Systeme pushen, tracken, kopieren, loeschen"],
    ["Umfang", "3 Schichten (Datenbank, Service, UI) + 2 gemockte SAP-Backends"],
    ["Stand", "Alle Kern-Features + optionales Loeschen, 17/17 Tests gruen"],
], widths=[3.4*cm, 13*cm])
SP(20)
story.append(Paragraph(de("Lies das Dokument von vorne nach hinten &ndash; jedes Kapitel baut auf dem "
            "vorigen auf. Code-Ausschnitte sind <font name='Courier'>so</font> formatiert und "
            "bewusst kurz gehalten; du musst sie nicht auswendig koennen."), small))
PB()

# =====================================================================
#  INHALT
# =====================================================================
H1("Inhalt")
toc_items = [
    "1. Das grosse Bild &ndash; was die App ueberhaupt tut",
    "2. Grundbegriffe einfach erklaert (CAP, OData, Fiori, BTP &hellip;)",
    "3. Das mentale Modell: drei Schichten + externes SAP",
    "4. Projektstruktur &ndash; welche Datei wofuer da ist",
    "5. Schicht 1: Das Datenmodell (db/schema.cds)",
    "6. Die Daten-Pools als CSV (db/data/)",
    "7. Schicht 2a: Der Service-Vertrag (srv/service.cds)",
    "8. Schicht 2b: Die Service-Logik (srv/service.js)",
    "9. Die zwei gemockten SAP-Backends (srv/external/)",
    "10. Schicht 3a: Annotationen &ndash; das Aussehen (app/annotations.cds)",
    "11. Schicht 3b: Die drei Fiori-Apps (app/&hellip;/webapp/)",
    "12. Feature-Durchlaeufe: was bei jedem Klick passiert",
    "13. Sicherheit &amp; Mehrbenutzer (Auth, Rollen, $user)",
    "14. Tests &ndash; woher wir wissen, dass es funktioniert",
    "15. Die wichtigsten Stolperfallen (Gotchas)",
    "16. Bauanleitung: das Projekt selbst von null aufbauen",
    "17. Glossar &ndash; Begriffe zum Nachschlagen",
]
for it in toc_items:
    P(it, toc)
PB()

# 1.
H1("1. Das grosse Bild &ndash; was die App ueberhaupt tut")
P("Stell dir vor, du arbeitest bei einer Firma, die SAP-Systeme betreut. Bevor neue "
  "Software live geht, muss sie getestet werden &ndash; und zwar mit <b>Daten, die echt "
  "aussehen</b>: Personen mit Namen, Adressen, Postleitzahlen, Staedten. Sich diese Daten "
  "von Hand auszudenken ist muehsam und langweilig. Genau hier setzt das Projekt an.")
P("Der <b>GISA Master Data Generator</b> ist eine Web-Anwendung, die solche Test-Stammdaten "
  "<b>automatisch erzeugt</b> und sie dann per Knopfdruck in ein oder mehrere SAP-Systeme "
  "uebertraegt. Konkret kann die App:")
BULLETS([
    "<b>Generieren:</b> Aus Daten-Pools (Listen von Vornamen, Nachnamen, Strassen, Staedten &hellip;) "
    "werden zufaellige, realistische Datensaetze zusammengewuerfelt.",
    "<b>Pushen:</b> Die erzeugten Daten werden ueber eine standardisierte Schnittstelle (OData) "
    "in ein SAP-Backend geschrieben &ndash; als Business Partner mit Adresse.",
    "<b>Tracken:</b> Die App merkt sich, <i>welches</i> Objekt in <i>welchem</i> System mit "
    "<i>welchem</i> Schluessel angelegt wurde (ein Protokoll).",
    "<b>Mehrere Systeme:</b> Es gibt nicht nur ein Ziel, sondern mehrere SAP-Systeme, die man "
    "verwalten und gezielt ansteuern kann.",
    "<b>Kopieren:</b> Daten, die in System A liegen, koennen nach System B uebertragen werden.",
    "<b>Loeschen:</b> Was angelegt wurde, kann auch wieder aus dem SAP-System entfernt werden.",
])
P("Das Ganze hat eine grafische Oberflaeche (UI), damit man nicht programmieren muss, um die "
  "Funktionen zu nutzen &ndash; man klickt Buttons.")
CALLOUT("Merke",
  "Die App ist im Kern eine <b>Bruecke</b>: Auf der einen Seite erzeugt sie Daten aus Pools, "
  "auf der anderen Seite spricht sie SAP-Systeme an. Alles andere (Tracking, Kopieren, "
  "Loeschen, mehrere Systeme) sind Komfort- und Verwaltungsfunktionen drumherum.")

# 2.
H1("2. Grundbegriffe einfach erklaert")
P("Bevor wir in die Dateien schauen, ein paar Begriffe &ndash; bewusst in Alltagssprache.")
H3("SAP")
P("Ein riesiges Software-Unternehmen. Viele grosse Firmen verwalten ihre Geschaeftsdaten "
  "(Kunden, Rechnungen, Material &hellip;) in SAP-Systemen. Unser &bdquo;Business Partner&ldquo; "
  "ist so ein Geschaeftsdaten-Objekt: eine Person oder Firma, mit der man Geschaefte macht.")
H3("SAP BTP (Business Technology Platform)")
P("Die <b>Cloud-Plattform</b> von SAP, auf der man eigene Apps betreiben kann &ndash; vergleichbar "
  "mit einem Hosting-Anbieter, aber speziell fuer die SAP-Welt. Unsere App ist dafuer gebaut, "
  "auf der BTP zu laufen.")
H3("SAP CAP (Cloud Application Programming Model)")
P("Das <b>Baukasten-Framework</b>, mit dem unsere App geschrieben ist. CAP gibt dir eine feste "
  "Struktur vor (wo das Datenmodell hingehoert, wo die Logik, wo die UI) und nimmt dir sehr viel "
  "Standard-Arbeit ab. Statt eine Datenbank-Verbindung, eine REST-API und die Web-Schnittstelle "
  "alles selbst zu programmieren, beschreibst du nur, <i>was</i> du willst &ndash; CAP baut das "
  "<i>wie</i> grossteils automatisch. CAP-Projekte laufen auf <b>Node.js</b> (JavaScript auf dem "
  "Server).")
CALLOUT("Wichtiges CAP-Prinzip: &bdquo;Convention over Configuration&ldquo;",
  "CAP erkennt Dinge an <b>festen Ordnernamen</b>. Was in <font name='Courier'>db/</font> liegt, ist "
  "das Datenmodell. Was in <font name='Courier'>srv/</font> liegt, sind die Services (die Logik). Was in "
  "<font name='Courier'>app/</font> liegt, ist die Oberflaeche. Du musst CAP also nicht erklaeren, wo was "
  "ist &ndash; du haeltst dich nur an die Konvention, und es funktioniert.")
H3("CDS (Core Data Services)")
P("Die kleine, eigene <b>Beschreibungssprache</b> von CAP (Dateien mit Endung "
  "<font name='Courier'>.cds</font>). Damit beschreibt man Tabellen (&bdquo;Entities&ldquo;) und "
  "Services in wenigen Zeilen. CDS ist <i>deklarativ</i>: du sagst, <i>was</i> existieren soll, "
  "nicht <i>wie</i> es technisch umgesetzt wird.")
H3("OData")
P("Ein <b>standardisierter Weg, ueber das Internet mit Daten zu reden</b> &ndash; eine besondere "
  "Art von Web-Schnittstelle (API). Wenn unsere App Daten in SAP anlegt, schickt sie OData-"
  "Anfragen (z.B. &bdquo;erzeuge einen neuen Business Partner mit diesen Feldern&ldquo;). Der grosse "
  "Vorteil: SAP-Systeme &bdquo;sprechen&ldquo; OData, und CAP erzeugt fuer unseren eigenen Service "
  "automatisch auch eine OData-Schnittstelle. Beide Seiten reden also dieselbe Sprache.")
H3("SAP Fiori / Fiori Elements")
P("<b>Fiori</b> ist der Design-Stil von SAP-Oberflaechen (das einheitliche Aussehen aller "
  "modernen SAP-Apps). <b>Fiori Elements</b> ist ein cleverer Trick: Statt jede Tabelle und "
  "jedes Formular von Hand zu programmieren, beschreibt man nur per <b>Annotationen</b> "
  "(Markierungen am Datenmodell), welche Felder wie angezeigt werden sollen &ndash; und Fiori "
  "Elements baut die fertige Oberflaeche daraus. Darunter laeuft die Technik <b>SAPUI5</b> "
  "(SAPs JavaScript-Baukasten fuer Oberflaechen).")
H3("SQLite und HANA")
P("Zwei <b>Datenbanken</b>. <b>SQLite</b> ist winzig und liegt einfach als Datei auf dem "
  "Laptop &ndash; perfekt zum lokalen Entwickeln. <b>HANA</b> ist die grosse Datenbank von SAP "
  "fuer den echten Betrieb in der Cloud. Das Schoene an CAP: Dieselbe App laeuft lokal auf "
  "SQLite und in der Cloud auf HANA, <b>ohne dass man den Code aendern muss</b>.")
H3("Git, Branch, Commit")
P("<b>Git</b> ist die &bdquo;Versionsverwaltung&ldquo; &ndash; ein Werkzeug, das jede Aenderung am "
  "Code speichert, sodass man nichts verliert und zu jedem Stand zurueck kann. Ein <b>Commit</b> "
  "ist ein gespeicherter Schnappschuss. Ein <b>Branch</b> ist eine Abzweigung, auf der man ein "
  "neues Feature in Ruhe baut, ohne den Hauptstand kaputtzumachen; ist es fertig, wird der "
  "Branch in den Hauptstand &bdquo;gemergt&ldquo; (zusammengefuehrt).")
PB()

# 3.
H1("3. Das mentale Modell: drei Schichten + externes SAP")
P("Fast jede Daten-App ist in <b>Schichten</b> aufgebaut. Wenn du dieses Bild im Kopf hast, "
  "ordnet sich jede Datei automatisch ein. Unsere App hat drei eigene Schichten und spricht "
  "ausserdem mit externen SAP-Systemen:")
CODE(
"""+-----------------------------------------------------------+
|  SCHICHT 3:  UI  (was der Mensch sieht)                   |
|  Fiori-Apps im Browser - Tabellen, Buttons, Dialoge       |
|  Ordner:  app/                                            |
+----------------------------|------------------------------+
                             |  Klick -> OData-Aufruf
                             v
+-----------------------------------------------------------+
|  SCHICHT 2:  SERVICE  (die Logik / das Gehirn)            |
|  Was darf man tun? Was passiert bei einer Aktion?         |
|  Ordner:  srv/  (service.cds = Vertrag, service.js = Code)|
+--------|--------------------------------|------------------+
         |  liest/schreibt                |  ruft per OData
         v                                v
+----------------------+      +----------------------------+
|  SCHICHT 1: DATEN    |      |  EXTERNE SAP-BACKENDS       |
|  eigene Datenbank    |      |  (hier lokal "gemockt")     |
|  Pools, Tracking,    |      |  S4D, S4Q - legen Business  |
|  Systeme             |      |  Partner + Adresse an       |
|  Ordner: db/         |      |  Ordner: srv/external/      |
+----------------------+      +----------------------------+""")
P("Die <b>goldene Regel</b>: Anfragen fliessen von oben nach unten (UI ruft Service, Service "
  "liest/schreibt Daten), Antworten fliessen von unten nach oben zurueck. Die UI redet "
  "<b>nie direkt</b> mit der Datenbank &ndash; immer ueber den Service. Das haelt die Logik an "
  "einer Stelle und macht die App sicher und wartbar.")
CALLOUT("Warum &bdquo;externe&ldquo; Backends?",
  "Das eigentliche Ziel der App ist, Daten in <b>fremde SAP-Systeme</b> zu schreiben. Diese "
  "Systeme gehoeren nicht zu unserer App. Beim lokalen Entwickeln haben wir aber kein echtes "
  "SAP zur Hand &ndash; deshalb <b>simulieren</b> (&bdquo;mocken&ldquo;) wir zwei davon. Fuer unsere "
  "App fuehlt sich das genauso an wie echte Systeme; nur laeuft die Simulation mit auf dem Laptop.")

# 4.
H1("4. Projektstruktur &ndash; welche Datei wofuer da ist")
P("Hier der Ordnerbaum mit dem Zweck jeder wichtigen Datei. Diese Tabelle ist dein "
  "&bdquo;Inhaltsverzeichnis des Codes&ldquo; &ndash; bei Unklarheit immer hierher zurueck.")
CODE(
"""Generator/
|
+-- db/                         SCHICHT 1: Datenmodell + Startdaten
|   +-- schema.cds              Definition aller eigenen Tabellen
|   +-- data/                   Start-Inhalte als CSV (Pools, Systeme)
|       +-- gisa.mdg-Cities.csv, ...-FirstNames.csv, ...-Systems.csv
|
+-- srv/                        SCHICHT 2: Services (Logik)
|   +-- service.cds             "Vertrag": welche Daten/Aktionen gibt es
|   +-- service.js              "Code": was passiert bei jeder Aktion
|   +-- external/               Die simulierten SAP-Backends
|       +-- _mockBackend.js     gemeinsame Simulations-Logik
|       +-- BackendAPI_2.csn/.edmx/.js   Backend 1 (System "S4D")
|       +-- BackendAPI_3.csn/.js         Backend 2 (System "S4Q")
|
+-- app/                        SCHICHT 3: Oberflaeche (UI)
|   +-- annotations.cds         Wie sehen die Tabellen/Spalten aus
|   +-- generator/webapp/       App 1: Daten generieren + alle Aktionen
|   +-- tracking/webapp/        App 2: Protokoll der angelegten Objekte
|   +-- systems/webapp/         App 3: Zielsysteme verwalten
|
+-- test/integration.test.js    Automatische Tests (17 Stueck)
+-- package.json                Projekt-Steckbrief + Konfiguration
+-- HANDOFF.md                  Kurz-Uebergabe fuer neue Mitarbeiter""")
P("Jede der drei Fiori-Apps hat denselben inneren Aufbau (dazu spaeter mehr):")
BULLETS([
    "<font name='Courier'>manifest.json</font> &ndash; der Bauplan der App (welche Tabelle, welche Buttons).",
    "<font name='Courier'>Component.js</font> &ndash; der Startpunkt der App (winzig, immer fast gleich).",
    "<font name='Courier'>index.html</font> &ndash; die HTML-Seite, die alles startet.",
    "<font name='Courier'>ext/&hellip;.js</font> &ndash; eigener JavaScript-Code fuer die Buttons.",
    "<font name='Courier'>i18n/i18n.properties</font> &ndash; Texte (Titel etc.), zentral an einer Stelle.",
])
PB()

# 5.
H1("5. Schicht 1: Das Datenmodell (db/schema.cds)")
P("Hier wird beschrieben, welche <b>Tabellen</b> es in unserer eigenen Datenbank gibt. In CDS "
  "heisst eine Tabelle <b>Entity</b>. Schauen wir uns die wichtigsten an.")
H2("5.1 Die Daten-Pools")
P("Pools sind einfache Listen, aus denen spaeter zufaellig gezogen wird. Beispiel:")
CODE(
"""namespace gisa.mdg;                  // gemeinsamer "Nachname" aller Tabellen

using { cuid } from '@sap/cds/common'; // bringt eine fertige ID-Spalte mit

entity FirstNames : cuid {           // Tabelle "FirstNames", erbt cuid
    firstName : String(50) @mandatory;
}
entity StreetNames : cuid { streetName : String(100) @mandatory; }
entity Cities      : cuid { cityName   : String(100) @mandatory; }
// ... LastNames, Neighborhoods, PostCodes, HouseNumbers analog""", "db/schema.cds (Auszug)")
P("Was hier passiert, Zeile fuer Zeile:")
BULLETS([
    "<font name='Courier'>namespace gisa.mdg;</font> &ndash; ein Praefix, damit alle Tabellen eindeutig "
    "&bdquo;gisa.mdg.FirstNames&ldquo; usw. heissen. Verhindert Namens-Kollisionen.",
    "<font name='Courier'>using { cuid }</font> &ndash; wir leihen uns einen fertigen Baustein von CAP. "
    "<font name='Courier'>cuid</font> ergaenzt jede Tabelle automatisch um eine Spalte "
    "<font name='Courier'>ID</font>, die eine weltweit eindeutige Zufallsnummer (UUID) bekommt.",
    "<font name='Courier'>: cuid</font> hinter dem Entity-Namen heisst &bdquo;erbe die ID-Spalte&ldquo; "
    "(Vererbung, wie ein Bausatz).",
    "<font name='Courier'>String(50)</font> &ndash; Text mit hoechstens 50 Zeichen. "
    "<font name='Courier'>@mandatory</font> &ndash; Pflichtfeld, darf nicht leer sein.",
])
CALLOUT("Aha-Moment",
  "Du <i>beschreibst</i> nur die Tabelle &ndash; du schreibst nirgends &bdquo;CREATE TABLE&ldquo;. "
  "CAP liest diese Beschreibung und legt die echte Datenbank-Tabelle selbst an. Das ist der "
  "Kern von &bdquo;deklarativ&ldquo;: sagen <i>was</i>, nicht <i>wie</i>.")
H2("5.2 Die Ergebnis-Tabelle: GeneratorData")
P("Hier landen die fertig zusammengewuerfelten Datensaetze, bevor sie ins SAP gepusht werden.")
CODE(
"""entity GeneratorData {
    key concatID : String;       // eindeutiger Schluessel der Zeile
    streetName   : String(100);
    cityName     : String(100);
    firstName    : String(50);
    lastName     : String(50);
    postCode     : String(5);
    houseNumber  : String(3);
    // ... neighborhoodName
    createdBy    : String(255);  // WER hat diese Zeile erzeugt (Login-Name)
}""", "db/schema.cds (Auszug)")
BULLETS([
    "<font name='Courier'>key concatID</font> &ndash; das Wort <font name='Courier'>key</font> macht dieses "
    "Feld zum <b>Primaerschluessel</b> (die eindeutige Kennung jeder Zeile). "
    "<font name='Courier'>concatID</font> wird aus den IDs der gezogenen Pool-Eintraege "
    "zusammengesetzt (&bdquo;concatenated&ldquo; = verkettet).",
    "<font name='Courier'>createdBy</font> &ndash; der Login-Name des Nutzers. Damit weiss die App, "
    "<b>wem</b> eine Zeile gehoert &ndash; wichtig, wenn mehrere Leute gleichzeitig arbeiten "
    "(dazu Kapitel 13).",
])
H2("5.3 Die Tracking-Tabelle: CreatedObjects")
P("Das Protokoll: welches Objekt wurde in welchem System mit welchem Schluessel angelegt. "
  "Genau diese Tabelle hat die Aufgabenstellung verlangt (Spalten System | Objekt | Key).")
CODE(
"""entity CreatedObjects : cuid {
    system         : String(100);  // Ziel-System, z.B. "S4D"
    objectType     : String(50);   // "Street"/"City"/"Address"/"BusinessPartner"
    objectKey      : String(100);  // die vom SAP vergebene Nummer
    sourceConcatID : String;       // Verweis auf die GeneratorData-Zeile
    createdBy      : String(255);  // wer hat gepusht
    createdAt      : Timestamp;    // wann
}""", "db/schema.cds (Auszug)")
P("Diese Tabelle ist das Bindeglied fuer fast alles Spaetere: <b>Kopieren</b> und "
  "<b>Loeschen</b> schauen hier nach, was ein Nutzer in einem System angelegt hat.")
H2("5.4 Die Systeme-Tabelle: Systems")
P("Der Katalog der SAP-Zielsysteme. Ohne diese Tabelle gaebe es nur ein einziges festes Ziel.")
CODE(
"""entity Systems : cuid {
    name        : String(20)  @mandatory;  // Kuerzel, z.B. "S4D"
    description : String(200);
    serviceName : String(100) @mandatory;  // welcher CAP-Service spricht das System an
    isDefault   : Boolean default false;   // Standard-Ziel beim Push
}""", "db/schema.cds (Auszug)")
P("Der entscheidende Trick steckt in <font name='Courier'>serviceName</font>: Dieser Text sagt, "
  "<b>ueber welchen konfigurierten Verbindungskanal</b> das System angesprochen wird "
  "(&bdquo;BackendAPI_2&ldquo; oder &bdquo;BackendAPI_3&ldquo;). So kann der Code zur Laufzeit das "
  "richtige Backend waehlen, nur anhand eines Tabellen-Eintrags.")

# 6.
H1("6. Die Daten-Pools als CSV (db/data/)")
P("Eine leere Tabelle nuetzt nichts &ndash; die Pools brauchen Inhalt. Den liefern <b>CSV-Dateien</b> "
  "(einfache Textdateien mit Komma-getrennten Werten, wie eine Mini-Tabelle). CAP laedt sie "
  "automatisch in die passende Tabelle, <b>wenn der Dateiname zum Tabellennamen passt</b>.")
CODE(
"""Dateiname:  db/data/gisa.mdg-Cities.csv

ID,cityName
1cty,Albrechts bei Suhl
2cty,Allersdorf bei Ilmenau
...""", "Beispiel-CSV")
P("Die erste Zeile sind die <b>Spaltennamen</b> (muessen exakt den Feldern im Schema entsprechen), "
  "darunter die Datenzeilen. Der Dateiname <font name='Courier'>gisa.mdg-Cities.csv</font> verraet CAP: "
  "&bdquo;Das gehoert in die Tabelle <font name='Courier'>gisa.mdg.Cities</font>&ldquo;.")
P("Auch die <b>Zielsysteme</b> werden so vorbefuellt &ndash; dadurch existieren S4D und S4Q sofort, "
  "ohne dass jemand sie manuell anlegen muss:")
CODE(
"""Dateiname:  db/data/gisa.mdg-Systems.csv

ID,name,description,serviceName,isDefault
s4d,S4D,SAP S/4HANA Development (Mock),BackendAPI_2,true
s4q,S4Q,SAP S/4HANA Quality (Mock),BackendAPI_3,false""", "Seed der Zielsysteme")
CALLOUT("Begriff: &bdquo;Seed&ldquo;",
  "Daten, mit denen eine frische Datenbank von Anfang an befuellt wird, nennt man "
  "<b>Seed-Daten</b> (&bdquo;Saat&ldquo;). Pools und die zwei Systeme sind unser Seed.")
PB()

# 7.
H1("7. Schicht 2a: Der Service-Vertrag (srv/service.cds)")
P("Der Service ist das Tor zur Aussenwelt. Die <font name='Courier'>.cds</font>-Datei ist sein "
  "<b>Vertrag</b>: Sie legt fest, <i>welche</i> Daten nach aussen sichtbar sind und <i>welche "
  "Aktionen</i> es gibt &ndash; aber noch nicht, was die Aktionen tun (das kommt in der .js-Datei).")
CODE(
"""using { gisa.mdg as my } from '../db/schema.cds';   // Datenmodell einbinden

@path : '/service/generator'        // unter dieser URL ist der Service erreichbar
@requires : 'Generator'             // nur Nutzer mit Rolle "Generator" duerfen rein
service GeneratorService {

    entity StreetNames as projection on my.StreetNames;   // Pool sichtbar machen
    // ... weitere Pools

    // Jeder sieht/aendert nur SEINE eigenen Zeilen:
    @restrict: [{ grant:'*', to:'Generator', where:'createdBy = $user' }]
    entity GeneratorData as projection on my.GeneratorData;

    @readonly                       // Tracking nur lesen, nicht aendern
    @restrict: [{ grant:'READ', to:'Generator', where:'createdBy = $user' }]
    entity CreatedObjects as projection on my.CreatedObjects;

    entity Systems as projection on my.Systems;   // gemeinsam gepflegt

    // AKTIONEN (Knoepfe, die etwas tun):
    action generateTestCustomers(anzahl : Integer) returns String;
    action pushToBackend(system : String) returns String;
    action copyData(sourceSystem : String, targetSystem : String) returns String;
    action deleteFromBackend(system : String) returns String;
}""", "srv/service.cds (gekuerzt)")
H3("Die wichtigen Begriffe darin")
BULLETS([
    "<b>projection on</b> &ndash; eine &bdquo;Durchreiche&ldquo;: Die interne Tabelle "
    "<font name='Courier'>my.GeneratorData</font> wird nach aussen als Service-Tabelle sichtbar gemacht. "
    "Man kann dabei filtern oder Felder verstecken &ndash; hier reichen wir sie weitgehend 1:1 durch.",
    "<b>@path</b> &ndash; die Internet-Adresse des Service. Alles laeuft unter "
    "<font name='Courier'>/service/generator</font>.",
    "<b>@requires : 'Generator'</b> &ndash; ein Tuersteher: Nur eingeloggte Nutzer mit der Rolle "
    "&bdquo;Generator&ldquo; duerfen den Service ueberhaupt benutzen.",
    "<b>@restrict &hellip; where: 'createdBy = $user'</b> &ndash; eine Zeilen-Filter-Regel. "
    "<font name='Courier'>$user</font> ist der aktuell eingeloggte Nutzer. Die Regel sagt: &bdquo;Zeige "
    "jedem nur die Zeilen, deren <font name='Courier'>createdBy</font> sein eigener Name ist.&ldquo; "
    "So sehen sich mehrere Nutzer nicht gegenseitig in die Daten.",
    "<b>@readonly</b> &ndash; diese Tabelle darf von aussen nur gelesen, nicht veraendert werden "
    "(das Tracking-Protokoll fuellt nur der Server selbst).",
    "<b>action &hellip; returns String</b> &ndash; eine aufrufbare Funktion mit Eingaben in Klammern "
    "und einer Rueckgabe (hier eine Text-Meldung). Das sind die vier Knoepfe der App.",
])
CALLOUT("Vertrag vs. Umsetzung",
  "Die <font name='Courier'>.cds</font> sagt nur <b>dass</b> es z.B. <font name='Courier'>pushToBackend</font> gibt "
  "und welche Eingaben es nimmt. <b>Wie</b> der Push tatsaechlich ablaeuft, steht in der "
  "<font name='Courier'>.js</font>-Datei (naechstes Kapitel). Diese Trennung &ndash; Vertrag hier, Umsetzung "
  "dort &ndash; ist ein wiederkehrendes Muster in CAP.")
PB()

# 8.
H1("8. Schicht 2b: Die Service-Logik (srv/service.js)")
P("Diese Datei ist das <b>Gehirn</b> der App. Hier steht echter JavaScript-Code, der bei jeder "
  "Aktion ausgefuehrt wird. Der Grundaufbau:")
CODE(
"""const cds = require('@sap/cds');           // CAP-Werkzeugkasten laden

module.exports = class GeneratorService extends cds.ApplicationService {
  async init() {

    // Kurznamen fuer die Tabellen holen:
    const { GeneratorData, CreatedObjects, Systems, /* Pools... */ } = this.entities;

    // Fuer jede Aktion ein "Handler" = was bei Aufruf passiert:
    this.on('generateTestCustomers', async (req) => { /* ... */ });
    this.on('pushToBackend',        async (req) => { /* ... */ });
    this.on('copyData',             async (req) => { /* ... */ });
    this.on('deleteFromBackend',    async (req) => { /* ... */ });

    return super.init();
  }
}""", "srv/service.js (Geruest)")
BULLETS([
    "<b>this.on('name', handler)</b> &ndash; &bdquo;Wenn die Aktion <i>name</i> aufgerufen wird, fuehre "
    "diese Funktion aus.&ldquo; Das Muster heisst <b>Event-Handler</b> (auf ein Ereignis reagieren).",
    "<b>async / await</b> &ndash; Datenbank- und Netzwerk-Aufrufe dauern einen Moment. "
    "<font name='Courier'>await</font> heisst &bdquo;warte hier, bis das Ergebnis da ist&ldquo;, ohne die "
    "ganze App zu blockieren. <font name='Courier'>async</font> markiert eine Funktion, die solche "
    "Wartepunkte enthalten darf.",
    "<b>req</b> (request) &ndash; das Anfrage-Objekt. Darin steckt u.a. <font name='Courier'>req.data</font> "
    "(die Eingaben, z.B. <font name='Courier'>anzahl</font>) und <font name='Courier'>req.user.id</font> "
    "(wer fragt).",
])
H2("8.1 Aktion &bdquo;Generieren&ldquo;")
P("Ziel: <font name='Courier'>anzahl</font> zufaellige Datensaetze bauen und in "
  "<font name='Courier'>GeneratorData</font> speichern. Vereinfachter Ablauf:")
CODE(
"""this.on('generateTestCustomers', async (req) => {
  const anzahl = req.data.anzahl || 10;
  const owner  = req.user.id;                 // wer generiert

  // 1. Alte eigene Zeilen weg (nur die eigenen!):
  await DELETE.from(GeneratorData).where({ createdBy: owner });

  // 2. Alle Pools aus der DB lesen:
  const streets = await SELECT.from(StreetNames);
  const cities  = await SELECT.from(Cities);
  // ... firstNames, lastNames, postCodes, houseNumbers, neighborhoods

  // 3. anzahl-mal zufaellig kombinieren:
  const entries = [];
  for (let i = 0; i < anzahl; i++) {
    const s = streets[Math.floor(Math.random() * streets.length)];
    const c = cities [Math.floor(Math.random() * cities.length)];
    // ... f, l, p, h analog
    entries.push({ concatID: s.ID+'-'+c.ID+'-...', streetName: s.streetName,
                   cityName: c.cityName, /* ... */ createdBy: owner });
  }

  // 4. Alle auf einmal speichern:
  await INSERT.into(GeneratorData).entries(entries);
  return `Successfully generated ${anzahl} customers.`;
});""", "srv/service.js (sinngemaess)")
BULLETS([
    "<b>SELECT / INSERT / DELETE</b> &ndash; CAPs eingebaute Befehle, um mit der Datenbank zu reden. "
    "Sie lesen fast wie Englisch: <font name='Courier'>SELECT.from(X)</font>, "
    "<font name='Courier'>INSERT.into(X).entries(...)</font>, <font name='Courier'>DELETE.from(X).where(...)</font>.",
    "<b>Math.random()</b> liefert eine Zufallszahl zwischen 0 und 1; damit ziehen wir einen "
    "zufaelligen Eintrag aus jedem Pool.",
    "Wir loeschen nur <font name='Courier'>where createdBy = owner</font> &ndash; also nur die eigenen "
    "alten Zeilen, nie die von anderen.",
    "Wir sammeln erst alles in <font name='Courier'>entries</font> und speichern <b>einmal</b> &ndash; das "
    "ist schneller, als jede Zeile einzeln zu schreiben.",
])
H2("8.2 Aktion &bdquo;Pushen&ldquo; (mit Zielsystem-Wahl)")
P("Ziel: die eigenen <font name='Courier'>GeneratorData</font>-Zeilen ins gewaehlte SAP-Backend "
  "schreiben &ndash; und jedes angelegte Objekt im Tracking festhalten.")
CODE(
"""this.on('pushToBackend', async (req) => {
  // 1. Zielsystem bestimmen: gewaehltes ODER das Default-System:
  const sys = req.data.system
      ? await SELECT.one.from(Systems).where({ ID: req.data.system })
      : await SELECT.one.from(Systems).where({ isDefault: true });

  // 2. Verbindung zum passenden Backend aufbauen:
  const backend = await cds.connect.to(sys.serviceName);   // "BackendAPI_2" o. "_3"

  // 3. Eigene Zeilen holen:
  const owner = req.user.id;
  const rows  = await SELECT.from(GeneratorData).where({ createdBy: owner });

  const tracked = [];
  for (const cust of rows) {
    // 4. Im Backend anlegen - Reihenfolge wegen Verknuepfungen:
    const street = await backend.create('Street').entries({ name: cust.streetName });
    const city   = await backend.create('City').entries({ name: cust.cityName });
    const addr   = await backend.create('Address').entries({
        street_ID: street.ID, city_ID: city.ID,
        houseNumber: toBackendHouseNumber(cust.houseNumber), postalCode: cust.postCode });
    const bp     = await backend.create('BusinessPartner').entries({
        firstName: cust.firstName, surName: cust.lastName, address_ID: addr.ID });

    // 5. Jedes Objekt fuers Tracking vormerken (Key = vom Backend vergebene Nummer):
    tracked.push({ system: sys.name, objectType:'BusinessPartner',
                   objectKey: String(bp.businessPartnerNumber), createdBy: owner });
    // ... ebenso fuer Street, City, Address
  }
  // 6. Tracking-Zeilen speichern:
  await INSERT.into(CreatedObjects).entries(tracked);
  return `Successfully pushed ${rows.length} customers to ${sys.name}.`;
});""", "srv/service.js (gekuerzt)")
H3("Die Schluesselstellen verstanden")
BULLETS([
    "<b>cds.connect.to(sys.serviceName)</b> &ndash; baut eine Verbindung zum externen Backend auf. "
    "Welches, steht im Tabellen-Eintrag des Systems. <b>Genau hier</b> wird aus &bdquo;mehrere "
    "Systeme&ldquo; Realitaet: je nach Wahl verbindet sich der Code zu einem anderen Ziel.",
    "<b>Reihenfolge Street -> City -> Address -> BusinessPartner:</b> Eine Adresse verweist auf "
    "Strasse und Stadt; ein Business Partner verweist auf eine Adresse. Man muss also zuerst das "
    "anlegen, worauf spaeter verwiesen wird (<font name='Courier'>street.ID</font> wird in der Adresse "
    "gebraucht).",
    "<b>objectKey = businessPartnerNumber:</b> Die <i>Nummern</i> (Schluessel) vergibt das "
    "SAP-Backend selbst beim Anlegen. Wir lesen sie aus der Antwort und schreiben sie ins "
    "Tracking &ndash; so wissen wir spaeter genau, was wir wo erzeugt haben.",
    "<b>toBackendHouseNumber(...):</b> Das Backend verlangt Hausnummern im Format "
    "&bdquo;Ziffern + Kleinbuchstabe&ldquo; (z.B. <font name='Courier'>12a</font>). Eine kleine Hilfsfunktion "
    "bringt unsere reinen Zahlen in dieses Muster.",
])
H2("8.3 Aktion &bdquo;Kopieren&ldquo;")
P("Ziel: die eigenen Business Partner aus System A lesen und in System B neu anlegen. "
  "Der Clou: Wir wissen aus dem <b>Tracking</b>, welche BPs uns in System A gehoeren.")
NUMBERS([
    "Quell- und Zielsystem aus <font name='Courier'>Systems</font> nachschlagen (und pruefen, "
    "dass sie verschieden sind).",
    "Im Tracking die eigenen BusinessPartner-Schluessel im Quellsystem suchen.",
    "Mit diesen Schluesseln die vollstaendigen Datensaetze (BP, Adresse, Strasse, Stadt) aus dem "
    "Quell-Backend lesen &ndash; <b>flach</b>, Schritt fuer Schritt (der simulierte Server kann keine "
    "tief verschachtelten Abfragen).",
    "Im Ziel-Backend alles neu anlegen (gleiche Reihenfolge wie beim Push).",
    "Die neuen Objekte unter dem Zielsystem-Namen tracken.",
])
CALLOUT("Warum ueber das Tracking statt &bdquo;alles kopieren&ldquo;?",
  "Wenn man stumpf <i>alle</i> BPs aus System A kopieren wuerde, kopierte man auch die Daten "
  "anderer Nutzer. Indem wir nur die im Tracking als <i>eigene</i> markierten Schluessel nehmen, "
  "bleibt das Kopieren <b>mehrbenutzer-sicher</b>. Das Tracking ist also nicht nur Protokoll, "
  "sondern aktives Werkzeug.")
H2("8.4 Aktion &bdquo;Loeschen&ldquo;")
P("Ziel: die eigenen, im System angelegten Objekte wieder aus dem Backend entfernen und das "
  "Tracking aufraeumen.")
NUMBERS([
    "Im Tracking alle eigenen Eintraege fuer das gewaehlte System holen.",
    "Pro Objekttyp die gespeicherten Nummern nehmen und damit im Backend die zugehoerigen "
    "Datensaetze (ihre internen IDs) finden.",
    "Diese ueber ihren Schluessel loeschen &ndash; in der Reihenfolge BusinessPartner -> Address -> "
    "Street -> City (zuerst das, was auf anderes verweist).",
    "Zuletzt die Tracking-Eintraege dieses Nutzers/Systems entfernen.",
])
P("Auch hier ist das Tracking die Grundlage: Es liefert die Schluessel, die zum gezielten "
  "Loeschen noetig sind.")
CALLOUT("Das wiederkehrende Muster",
  "Push, Copy und Delete folgen alle demselben Dreischritt: <b>(1)</b> herausfinden, was zu tun "
  "ist (aus DB/Tracking lesen), <b>(2)</b> mit dem Backend reden (anlegen/lesen/loeschen), "
  "<b>(3)</b> das Tracking aktualisieren. Wer ein Feature versteht, versteht alle.")
PB()

# 9.
H1("9. Die zwei gemockten SAP-Backends (srv/external/)")
P("Diese Dateien <b>simulieren</b> echte SAP-Systeme, damit man lokal entwickeln und testen "
  "kann, ohne ein echtes SAP. &bdquo;Mock&ldquo; bedeutet Attrappe.")
H2("9.1 Woraus ein Backend besteht")
BULLETS([
    "<b>BackendAPI_2.edmx / .csn</b> &ndash; die <b>Beschreibung</b> der Backend-Tabellen (Business "
    "Partner, Address, Street, City) und ihrer Felder. Das <font name='Courier'>.edmx</font> ist das "
    "Original-Format von SAP; das <font name='Courier'>.csn</font> ist die von CAP genutzte Fassung.",
    "<b>BackendAPI_2.js</b> &ndash; die <b>Simulations-Logik</b> dieses Backends.",
    "<b>BackendAPI_3.csn / .js</b> &ndash; ein <b>zweites</b> Backend, fast identisch, aber mit "
    "eindeutigen Namen. Dadurch sind es wirklich zwei getrennte Datentoepfe (Voraussetzung "
    "dafuer, dass &bdquo;Kopieren von A nach B&ldquo; ueberhaupt sichtbar wird).",
])
H2("9.2 Gemeinsame Logik: _mockBackend.js")
P("Beide Backends verhalten sich gleich, also steht die Logik <b>einmal</b> in "
  "<font name='Courier'>_mockBackend.js</font> und wird von beiden genutzt (kein Doppel-Code). Sie ahmt "
  "zwei Verhaltensweisen des echten SAP nach:")
BULLETS([
    "<b>Nummern vergeben:</b> Echtes SAP vergibt beim Anlegen automatisch eindeutige Nummern "
    "(z.B. businessPartnerNumber). Der Mock wuerfelt eine solche Nummer, damit sich alles echt "
    "anfuehlt.",
    "<b>Validieren:</b> Das echte SAP lehnt ungueltige Eingaben ab. Der Mock prueft per "
    "Muster, dass die Hausnummer wie <font name='Courier'>12a</font> und die PLZ aus genau 5 Ziffern "
    "besteht &ndash; sonst gibt es einen Fehler (Code 400).",
])
CODE(
"""// _mockBackend.js (Kerngedanke)
const nextNumber = () => Math.floor(Math.random() * 9_999_999_999) + 1;
const HOUSE = /^[0-9]{1,4}[a-z]$/;     // erlaubtes Hausnummer-Muster
const PLZ   = /^[0-9]{5}$/;            // erlaubtes PLZ-Muster

this.before('CREATE', Street, req => { req.data.streetNumber ??= nextNumber(); });
this.before('CREATE', Address, req => {
    req.data.addressNumber ??= nextNumber();
    if (!HOUSE.test(req.data.houseNumber)) req.error(400, 'Hausnummer ungueltig');
    if (!PLZ.test(req.data.postalCode))    req.error(400, 'PLZ ungueltig');
});""", "srv/external/_mockBackend.js (Auszug)")
BULLETS([
    "<b>this.before('CREATE', ...)</b> &ndash; &bdquo;Tu das, <i>bevor</i> ein neuer Datensatz angelegt "
    "wird.&ldquo; Hier: Nummer setzen bzw. Eingaben pruefen.",
    "<b>/^[0-9]{5}$/</b> ist ein <b>regulaerer Ausdruck</b> (&bdquo;Regex&ldquo;) &ndash; ein "
    "Such-Muster fuer Text. Hier: &bdquo;genau fuenf Ziffern&ldquo;.",
    "<b>??=</b> heisst &bdquo;setze nur, falls noch leer&ldquo;.",
])
H2("9.3 Wie die Backends bekannt gemacht werden")
P("Damit der Code <font name='Courier'>cds.connect.to('BackendAPI_2')</font> sagen kann, muessen die "
  "Backends in <font name='Courier'>package.json</font> als Verbindungen eingetragen sein:")
CODE(
"""// package.json -> cds -> requires
"BackendAPI_2": { "kind": "odata", "model": "srv/external/BackendAPI_2" },
"BackendAPI_3": { "kind": "odata", "model": "srv/external/BackendAPI_3" }""", "package.json (Auszug)")
P("<font name='Courier'>kind: 'odata'</font> sagt: &bdquo;Sprich mit diesem System per OData.&ldquo; Lokal "
  "wird es gemockt, in der Cloud wuerde hier die Adresse des echten SAP stehen &ndash; <b>der "
  "App-Code bliebe gleich</b>.")
PB()

# 10.
H1("10. Schicht 3a: Annotationen &ndash; das Aussehen (app/annotations.cds)")
P("Erinnerung an Fiori Elements: Man programmiert die Oberflaeche nicht, man <b>beschreibt</b> "
  "sie. Diese Beschreibungen heissen <b>Annotationen</b> und stehen in "
  "<font name='Courier'>app/annotations.cds</font>. Beispiel fuer die Tracking-Tabelle:")
CODE(
"""// Welche Spalten in welcher Reihenfolge in der Tabelle erscheinen:
annotate GeneratorService.CreatedObjects with @UI.LineItem: [
  { $Type:'UI.DataField', Value: system },
  { $Type:'UI.DataField', Value: objectType },
  { $Type:'UI.DataField', Value: objectKey },
  { $Type:'UI.DataField', Value: createdAt }
];

// Schoenere Spalten-Ueberschriften:
annotate GeneratorService.CreatedObjects with {
  system     @title: 'System';
  objectType @title: 'Objekttyp';
  objectKey  @title: 'Schluessel';
};""", "app/annotations.cds (Auszug)")
BULLETS([
    "<b>@UI.LineItem</b> &ndash; die Liste der Spalten einer Tabelle (engl. &bdquo;line item&ldquo; = "
    "Zeilen-Eintrag). Die Reihenfolge hier ist die Reihenfolge in der Oberflaeche.",
    "<b>@title</b> &ndash; die Beschriftung, die der Nutzer sieht (statt des technischen Feldnamens).",
    "<b>@UI.SelectionFields</b> (nicht gezeigt) &ndash; welche Felder als Filter oben erscheinen.",
])
CALLOUT("Der Aha-Moment bei Fiori Elements",
  "Es gibt <b>keinen</b> handgeschriebenen Code, der die Tabelle, die Filter oder die "
  "Detailseite baut. Fiori Elements liest diese Annotationen und erzeugt daraus die komplette, "
  "voll funktionsfaehige Oberflaeche. Du beschreibst nur das <i>Was</i> &ndash; das <i>Wie</i> macht "
  "das Framework.")

# 11.
H1("11. Schicht 3b: Die drei Fiori-Apps (app/&hellip;/webapp/)")
P("Es gibt drei kleine Oberflaechen, die sich die Daten teilen (sie reden alle mit demselben "
  "Service):")
TABLE([
    ["App", "Ordner", "Zweck"],
    ["Generator", "app/generator/webapp/", "Daten generieren; alle Aktions-Buttons (Push, Copy, Delete)"],
    ["Tracking",  "app/tracking/webapp/",  "Protokoll der angelegten Objekte ansehen"],
    ["Systeme",   "app/systems/webapp/",   "Zielsysteme ansehen / neu anlegen / loeschen"],
], widths=[2.6*cm, 4.6*cm, 9.2*cm])
H2("11.1 manifest.json &ndash; der Bauplan")
P("Sagt der App, welche Datenquelle sie nutzt, welche Tabelle sie zeigt und welche "
  "<b>eigenen Buttons</b> es gibt:")
CODE(
""""dataSources": { "mainService": { "uri": "/service/generator/" } },
...
"entitySet": "GeneratorData",        // diese Tabelle zeigt die App
...
"controlConfiguration": {
  "@...UI.LineItem": { "actions": {
    "push": { "press": "...GeneratorActions.onPush", "text": "An Backend pushen" },
    "copy": { "press": "...GeneratorActions.onCopy", "text": "Daten kopieren" },
    "deleteInSystem": { "press": "...onDelete", "text": "Im System loeschen" }
  }}
}""", "app/generator/webapp/manifest.json (Auszug)")
P("Jeder Button verweist per <font name='Courier'>press</font> auf eine Funktion in unserer eigenen "
  "JavaScript-Datei. Klickt der Nutzer, wird genau diese Funktion aufgerufen.")
H2("11.2 ext/GeneratorActions.js &ndash; was die Buttons tun")
P("Hier steht der Code hinter den Buttons. Beispiel &bdquo;Pushen&ldquo;: erst die Systeme laden, "
  "dann einen Dialog mit Auswahl zeigen, dann die Service-Aktion aufrufen.")
CODE(
"""onPush: function () {
  loadSystems().then(function (systeme) {
    // ... Dialog mit Dropdown der Systeme bauen ...
    // beim Klick auf "Pushen":
    callAction("pushToBackend", { system: gewaehlteId })
      .then(msg => MessageToast.show(msg));   // Erfolgsmeldung anzeigen
  });
},

// Hilfsfunktion: ruft eine Service-Aktion per OData auf
function callAction(name, body) {
  return fetch("/service/generator/" + name, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json()).then(t => t.value);
}""", "app/generator/webapp/ext/GeneratorActions.js (gekuerzt)")
BULLETS([
    "<b>fetch(...)</b> &ndash; der Standard-Weg im Browser, eine Anfrage ans Internet/an den Server "
    "zu schicken. Hier ein <font name='Courier'>POST</font> an die Aktion &ndash; das ist der OData-Aufruf.",
    "<b>MessageToast.show(msg)</b> &ndash; blendet kurz die Rueckgabe-Meldung der Aktion ein "
    "(&bdquo;Successfully pushed 3 customers to S4D.&ldquo;).",
    "<b>Dialog mit Dropdown</b> &ndash; bauen wir hier selbst in JavaScript, weil wir dem Nutzer eine "
    "Auswahl (Zielsystem, Von/Nach) geben wollen.",
])
P("Die Navigation zwischen den drei Apps passiert einfach ueber Links auf die jeweils andere "
  "Adresse, z.B. <font name='Courier'>window.location.href = '/tracking/webapp/index.html'</font>.")
H2("11.3 index.html &ndash; der Start (und eine wichtige Falle)")
P("Diese HTML-Seite startet die App. Sie enthaelt absichtlich etwas mehr Code als ueblich, um "
  "einen typischen Anfaenger-Fehler zu vermeiden:")
CALLOUT("Gotcha: die &bdquo;weisse Seite&ldquo;",
  "Wenn die App in einen Bereich mit <b>Hoehe 0</b> geladen wird, sieht man nur eine weisse "
  "Seite &ndash; die App ist da, aber unsichtbar zusammengequetscht. Loesung (im Projekt drin): per "
  "CSS bekommen Seite und Container <font name='Courier'>height:100%</font>, und die App wird explizit "
  "mit voller Hoehe gestartet. Diese Falle kostet sonst Stunden Fehlersuche.")
PB()

# 12.
H1("12. Feature-Durchlaeufe: was bei jedem Klick passiert")
P("Jetzt verbinden wir alle Schichten. Hier der komplette Weg eines Klicks &ndash; von der "
  "Oberflaeche bis zur Datenbank und zurueck.")
H2("12.1 &bdquo;Generieren&ldquo;")
CODE(
"""[Nutzer] Klick "Generieren" -> Eingabe Anzahl (z.B. 5)
   |
   v
[UI]  GeneratorActions.onGenerate -> fetch POST .../generateTestCustomers
   |
   v
[Service]  service.js Handler 'generateTestCustomers'
   |   - loescht eigene alte Zeilen
   |   - liest alle Pools
   |   - wuerfelt 5x zusammen
   |   - INSERT in GeneratorData
   v
[Datenbank]  5 neue Zeilen (createdBy = ich)
   |
   v
[UI]  Tabelle aktualisiert sich -> 5 Zeilen sichtbar + Erfolgsmeldung""")
H2("12.2 &bdquo;Pushen&ldquo; (Multi-System)")
CODE(
"""[Nutzer] Klick "An Backend pushen" -> Dialog: Zielsystem S4Q -> "Pushen"
   |
   v
[UI]  onPush -> fetch POST .../pushToBackend  { system: "s4q" }
   |
   v
[Service]  Handler 'pushToBackend'
   |   - Systems nachschlagen: s4q -> serviceName "BackendAPI_3"
   |   - cds.connect.to("BackendAPI_3")
   |   - fuer jede eigene Zeile:
   |       Street -> City -> Address -> BusinessPartner anlegen
   |       Nummern aus Antwort merken
   |   - INSERT der Tracking-Zeilen (system = "S4Q")
   v
[Backend S4Q] legt Objekte an, vergibt Nummern
[Datenbank]   CreatedObjects: neue Zeilen mit system="S4Q"
   |
   v
[UI]  Meldung "Successfully pushed N customers to S4Q." """)
H2("12.3 &bdquo;Kopieren&ldquo; und &bdquo;Loeschen&ldquo;")
P("Beide folgen demselben Muster, nur mit anderer Backend-Operation:")
CODE(
"""KOPIEREN  (Von S4D Nach S4Q):
  Tracking lesen: meine BPs in S4D  ->  Daten aus S4D lesen
   ->  in S4Q neu anlegen  ->  Tracking fuer S4Q schreiben

LOESCHEN  (in S4D):
  Tracking lesen: meine Objekte in S4D  ->  im S4D-Backend per Key loeschen
   ->  Tracking-Eintraege fuer S4D entfernen""")
H2("12.4 Tracking ansehen")
P("Die Tracking-App ist eine reine Lese-Ansicht: Sie fragt ueber OData die Tabelle "
  "<font name='Courier'>CreatedObjects</font> ab (gefiltert auf den eigenen Nutzer durch die "
  "<font name='Courier'>@restrict</font>-Regel) und zeigt sie als Fiori-Tabelle &ndash; ganz ohne "
  "zusaetzlichen Code, nur dank Annotationen.")
CALLOUT("Der rote Faden",
  "<font name='Courier'>CreatedObjects</font> (das Tracking) ist das Herz, das alle Features verbindet: "
  "Push fuellt es, die Tracking-App zeigt es, Copy und Delete lesen daraus. Verstehst du diese "
  "eine Tabelle, verstehst du das Zusammenspiel der ganzen App.")
PB()

# 13.
H1("13. Sicherheit &amp; Mehrbenutzer (Auth, Rollen, $user)")
P("Die App ist fuer mehrere Nutzer gleichzeitig gedacht. Drei Bausteine sorgen dafuer, dass das "
  "sicher und sauber funktioniert:")
BULLETS([
    "<b>Authentifizierung (&bdquo;Auth&ldquo;):</b> Wer bist du? Man muss sich einloggen. Lokal beim "
    "Entwickeln nutzt CAP einen einfachen Test-Login (&bdquo;dummy&ldquo;), in der Cloud das echte "
    "SAP-Login-System (XSUAA).",
    "<b>Rolle 'Generator':</b> Nur wer diese Rolle hat, darf den Service ueberhaupt benutzen "
    "(<font name='Courier'>@requires</font>). Ohne Login: Fehler 401. Eingeloggt, aber ohne Rolle: "
    "Fehler 403.",
    "<b>$user-Filter:</b> Durch <font name='Courier'>where: 'createdBy = $user'</font> sieht und "
    "veraendert jeder nur seine eigenen Zeilen. Wenn Alice generiert, loescht sie nicht aus "
    "Versehen die Daten von Bob.",
])
P("Genau dieses <font name='Courier'>createdBy</font>-Feld zieht sich durch: beim Generieren gesetzt, "
  "beim Anzeigen gefiltert, beim Pushen/Kopieren/Loeschen als &bdquo;gehoert mir&ldquo;-Markierung "
  "genutzt.")

# 14.
H1("14. Tests &ndash; woher wir wissen, dass es funktioniert")
P("Es gibt 17 <b>automatische Tests</b> (Datei <font name='Courier'>test/integration.test.js</font>). Ein "
  "Test startet die App, fuehrt echte Aktionen aus und prueft das Ergebnis &ndash; alles per Knopf "
  "(<font name='Courier'>npm test</font>). Beispiele, was geprueft wird:")
BULLETS([
    "Ohne Login wird eine Aktion abgelehnt (401); mit Login ohne Rolle ebenfalls (403).",
    "Generieren erzeugt <i>genau</i> die angeforderte Anzahl Zeilen.",
    "Zwei Nutzer sehen nur ihre eigenen Daten und loeschen sich nicht gegenseitig.",
    "Push nach S4Q landet wirklich im zweiten Backend und wird als &bdquo;S4Q&ldquo; getrackt.",
    "Kopieren von S4D nach S4Q legt die Datensaetze im Ziel an.",
    "Loeschen entfernt die Objekte und raeumt das Tracking; im leeren System gibt es Fehler 400.",
])
CALLOUT("Warum Tests wichtig sind",
  "Tests sind ein <b>Sicherheitsnetz</b>. Aenderst du spaeter etwas und ein Test wird rot, weisst "
  "du sofort, dass du etwas kaputtgemacht hast &ndash; bevor es ein Nutzer merkt. &bdquo;17/17 gruen&ldquo; "
  "heisst: alle 17 Pruefungen bestanden.")

# 15.
H1("15. Die wichtigsten Stolperfallen (Gotchas)")
P("Diese Punkte haben beim Bauen echt Zeit gekostet &ndash; gut, sie zu kennen:")
TABLE([
    ["Falle", "Was passiert / Loesung"],
    ["Weisse Seite (Hoehe 0)",
     "Fiori-App rendert unsichtbar. Loesung: index.html startet die App explizit mit voller Hoehe + CSS height:100%."],
    ["Buttons tun nichts",
     "Fiori ruft eigene Aktionen nicht automatisch auf. Loesung: Buttons im manifest definieren + eigene Handler (ext/*.js) die per fetch aufrufen."],
    ["Lokaler Push schlaegt fehl",
     "'no such table' bzw. 'no credentials': Server muss mit '--with-mocks --in-memory' laufen, sonst fehlen die Mock-Tabellen."],
    ["Kopieren bricht ab",
     "Der Mock kann keine tief verschachtelten Abfragen ($expand). Loesung: flach in Schritten lesen (BP, dann Adresse, dann Strasse/Stadt)."],
    ["Harmlose Konsolen-'Fehler'",
     "Einige 404/Warnungen im Browser sind im Entwicklungsmodus normal und koennen ignoriert werden."],
], widths=[4.4*cm, 12*cm], fontsize=8.5)

# 16.
H1("16. Bauanleitung: das Projekt selbst von null aufbauen")
P("Wenn du es selbst nachbauen wolltest, waere das die sinnvolle Reihenfolge. Jeder Schritt "
  "baut auf dem vorigen auf &ndash; genau so ist das Projekt auch entstanden.")
NUMBERS([
    "<b>Projekt anlegen:</b> Mit dem CAP-Werkzeug ein leeres Projekt erzeugen "
    "(<font name='Courier'>cds init</font>). Es gibt dir die Ordner <font name='Courier'>db/ srv/ app/</font> vor.",
    "<b>Datenmodell schreiben</b> (<font name='Courier'>db/schema.cds</font>): die Pool-Tabellen, "
    "<font name='Courier'>GeneratorData</font>. Erst spaeter <font name='Courier'>CreatedObjects</font> und "
    "<font name='Courier'>Systems</font> ergaenzen.",
    "<b>Pools mit CSV befuellen</b> (<font name='Courier'>db/data/</font>): pro Tabelle eine CSV mit "
    "passendem Namen.",
    "<b>Service-Vertrag schreiben</b> (<font name='Courier'>srv/service.cds</font>): Tabellen sichtbar "
    "machen, Rolle/Filter setzen, die Aktionen deklarieren.",
    "<b>Service-Logik schreiben</b> (<font name='Courier'>srv/service.js</font>): mit "
    "<font name='Courier'>generateTestCustomers</font> starten &ndash; das laeuft komplett ohne Backend "
    "und gibt schnell ein Erfolgserlebnis.",
    "<b>Lokal starten</b> (<font name='Courier'>cds watch</font>) und im Browser ausprobieren. CAP "
    "baut die Datenbank automatisch.",
    "<b>Backend anbinden:</b> ein externes OData-Backend (echt oder gemockt) in "
    "<font name='Courier'>package.json</font> eintragen, dann <font name='Courier'>pushToBackend</font> bauen.",
    "<b>Oberflaeche verschoenern:</b> Annotationen (<font name='Courier'>app/annotations.cds</font>) und "
    "eine Fiori-App anlegen; eigene Buttons ueber manifest + Handler.",
    "<b>Erweitern:</b> Tracking-Tabelle, dann mehrere Systeme, dann Kopieren, dann Loeschen &ndash; "
    "jeweils Schema + Service + UI + Test.",
    "<b>Absichern:</b> fuer jedes Feature einen automatischen Test schreiben.",
])
CALLOUT("Die wichtigste Gewohnheit",
  "<b>Schritt fuer Schritt, klein halten, nach jedem Schritt testen.</b> Lieber zehnmal etwas "
  "Kleines, das funktioniert, als einmal etwas Grosses, das nirgends laeuft. Genau so wurde "
  "dieses Projekt gebaut &ndash; ein Feature pro Branch, getestet, dann zusammengefuehrt.")

# 17.
H1("17. Glossar &ndash; Begriffe zum Nachschlagen")
TABLE([
    ["Begriff", "Kurz erklaert"],
    ["CAP", "SAPs Baukasten-Framework fuer Daten-Apps (laeuft auf Node.js)."],
    ["CDS", "Beschreibungssprache von CAP fuer Tabellen und Services (.cds-Dateien)."],
    ["Entity", "Eine Tabelle im Datenmodell."],
    ["Service", "Das Tor nach aussen: stellt Daten und Aktionen bereit."],
    ["Action", "Eine aufrufbare Funktion eines Service (ein 'Knopf')."],
    ["Handler", "Code, der bei einem Ereignis (z.B. Aktion) ausgefuehrt wird."],
    ["OData", "Standard-Web-Schnittstelle, ueber die mit Daten geredet wird."],
    ["Projection", "Eine Durchreiche/Sicht einer internen Tabelle nach aussen."],
    ["Annotation", "Markierung am Modell, die das UI-Aussehen beschreibt (@UI...)."],
    ["Fiori Elements", "Erzeugt fertige Oberflaechen aus Annotationen."],
    ["Mock", "Eine Attrappe/Simulation eines echten Systems zum Testen."],
    ["Seed", "Startdaten, mit denen eine frische DB befuellt wird (CSV)."],
    ["cuid", "Fertiger Baustein, der jeder Tabelle eine eindeutige ID gibt."],
    ["UUID", "Eine weltweit eindeutige Zufalls-Kennung."],
    ["$user", "Platzhalter fuer den aktuell eingeloggten Nutzer."],
    ["Rolle", "Berechtigung eines Nutzers (hier: 'Generator')."],
    ["async/await", "Sprachmittel, um auf langsame Aufrufe zu warten."],
    ["Branch / Commit", "Git: Abzweigung zum Entwickeln / gespeicherter Stand."],
], widths=[3.4*cm, 13*cm], fontsize=9)
SP(6)
P("<b>Geschafft.</b> Wenn dir die drei Schichten, der Weg eines Klicks und die Rolle der "
  "Tracking-Tabelle klar sind, hast du das Projekt im Kern verstanden &ndash; und koenntest es "
  "Schritt fuer Schritt selbst nachbauen.")

# ---------- Kopf-/Fusszeile ----------
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#9aa6b2"))
    canvas.drawString(2*cm, 1.1*cm, "GISA Master Data Generator  –  Projekt-Erklärung")
    canvas.drawRightString(A4[0]-2*cm, 1.1*cm, "Seite %d" % doc.page)
    canvas.setStrokeColor(colors.HexColor("#dde3e8"))
    canvas.line(2*cm, 1.5*cm, A4[0]-2*cm, 1.5*cm)
    canvas.restoreState()

out = "/Users/magnusbuchwald/Desktop/Coding/Generator/GISA-Projekt-Erklaerung.pdf"
doc = SimpleDocTemplate(out, pagesize=A4,
                        leftMargin=2*cm, rightMargin=2*cm,
                        topMargin=1.8*cm, bottomMargin=2*cm,
                        title="GISA Master Data Generator - Projekt-Erklaerung",
                        author="Projekt-Dokumentation")
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("OK ->", out)
