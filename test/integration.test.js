const cds = require('@sap/cds');

// Auth fuer die Tests: mehrere Nutzer mit/ohne Rolle (wie beim manuellen Test).
// Wird vor cds.test gesetzt, damit der Test-Server unter mocked-Auth laeuft.
cds.env.requires.auth = {
  kind: 'mocked',
  users: {
    alice:   { password: 'alice',   roles: ['Generator'] },
    bob:     { password: 'bob',     roles: ['Generator'] },
    carol:   { password: 'carol',   roles: ['Generator'] },
    dave:    { password: 'dave',    roles: ['Generator'] },
    erin:    { password: 'erin',    roles: ['Generator'] },
    frank:   { password: 'frank',   roles: ['Generator'] },
    mallory: { password: 'mallory', roles: [] }
  }
};

// 'serve all --with-mocks' startet den Server inkl. lokaler Backend-Mocks
// (genau wie 'cds watch'); '--in-memory' gibt jedem Testlauf eine frische DB.
const { GET, POST, expect } = cds.test('serve', 'all', '--with-mocks', '--in-memory');

const asAlice   = { auth: { username: 'alice',   password: 'alice'   } };
const asBob     = { auth: { username: 'bob',     password: 'bob'     } };
const asCarol   = { auth: { username: 'carol',   password: 'carol'   } };
const asDave    = { auth: { username: 'dave',    password: 'dave'    } };
const asErin    = { auth: { username: 'erin',    password: 'erin'    } };
const asFrank   = { auth: { username: 'frank',   password: 'frank'   } };
const asMallory = { auth: { username: 'mallory', password: 'mallory' } };

const SRV = '/service/generator';
const BACKEND2 = '/odata/v4/backend-api-2';   // S4D
const BACKEND3 = '/odata/v4/backend-api-3';   // S4Q

// Hilfsfunktion: Status-Code einer erwartet fehlschlagenden Anfrage pruefen
async function expectStatus(promise, status) {
  try {
    await promise;
    expect.fail(`Anfrage haette mit ${status} fehlschlagen sollen`);
  } catch (e) {
    expect(e.response?.status).to.equal(status);
  }
}

// Neuesten Lauf des Nutzers (mit Objekten) holen.
async function latestRun(auth, user) {
  const { data } = await GET(
    `${SRV}/Runs?$filter=createdBy eq '${user}'&$orderby=createdAt desc&$top=1&$expand=objects,partners`, auth);
  return data.value[0];
}

describe('GISA Master Data Generator', () => {

  describe('Autorisierung', () => {
    it('lehnt Anfragen ohne Login ab (401)', async () => {
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 1 }), 401);
    });

    it('lehnt Nutzer ohne Rolle ab (403)', async () => {
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 1 }, asMallory), 403);
    });

    it('erlaubt Nutzer mit Rolle Generator', async () => {
      const { data } = await POST(`${SRV}/generateAndCreate`, { anzahl: 3, label: 'Auth-Test' }, asAlice);
      expect(data.ok).to.equal(true);
      expect(data.message).to.match(/3 Geschäftspartner in S4D/);
    });
  });

  describe('Generieren und Anlegen (ein Schritt)', () => {
    it('legt einen Lauf mit der angeforderten Anzahl im Default-System an', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 5, label: 'Testfall 4711' }, asAlice);
      const run = await latestRun(asAlice, 'alice');

      expect(run.label).to.equal('Testfall 4711');
      expect(run.partnerCount).to.equal(5);
      expect(run.systems).to.equal('S4D');            // Default-System
      expect(run.status).to.equal('created');
      expect(run.partners.length).to.equal(5);         // eine Zeile je Person
      expect(run.objects.length).to.equal(20);         // 5 x (Street, City, Address, BP)

      const types = [...new Set(run.objects.map(o => o.objectType))].sort();
      expect(types).to.eql(['Address', 'BusinessPartner', 'City', 'Street']);
      for (const o of run.objects) {
        expect(o.objectKey).to.be.a('string').and.not.equal('');
        expect(o.createdBy).to.equal('alice');
        expect(o.status).to.equal('created');
      }
    });

    it('vergibt eine Bezeichnung, wenn keine angegeben ist', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 1 }, asAlice);
      const run = await latestRun(asAlice, 'alice');
      expect(run.label).to.match(/^Testdaten /);
    });

    it('die Daten kommen im Backend an, Hausnummern im Muster [0-9]{1,4}[a-z]', async () => {
      const before = (await GET(`${BACKEND2}/BusinessPartner`, asAlice)).data.value.length;
      await POST(`${SRV}/generateAndCreate`, { anzahl: 4 }, asAlice);
      const after = (await GET(`${BACKEND2}/BusinessPartner`, asAlice)).data.value.length;
      expect(after - before).to.equal(4);

      const addresses = (await GET(`${BACKEND2}/Address?$select=houseNumber`, asAlice)).data.value;
      for (const a of addresses) expect(a.houseNumber).to.match(/^[0-9]{1,4}[a-z]$/);
    });

    it('legt in MEHREREN Systemen an: gleiche Person, je System eine Nummer', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 2, label: 'Multi', systems: ['s4d', 's4q'] }, asErin);
      const run = await latestRun(asErin, 'erin');

      expect(run.systems).to.equal('S4D, S4Q');
      expect(run.partners.length).to.equal(4);          // 2 Personen x 2 Systeme
      expect(run.objects.length).to.equal(16);

      // Dieselbe Person (sourceConcatID) liegt in beiden Systemen mit derselben Adresse.
      const byPerson = {};
      for (const p of run.partners) (byPerson[p.sourceConcatID] ??= []).push(p);
      expect(Object.keys(byPerson).length).to.equal(2);
      for (const rows of Object.values(byPerson)) {
        expect(rows.map(r => r.system).sort()).to.eql(['S4D', 'S4Q']);
        expect(rows[0].houseNumber).to.equal(rows[1].houseNumber);
        expect(rows[0].objectKey).to.not.equal(rows[1].objectKey);
      }
    });

    it('MyRuns (Generator-Startseite) zeigt nur die 5 neuesten eigenen Laeufe', async () => {
      for (let i = 1; i <= 6; i++) {
        await POST(`${SRV}/generateAndCreate`, { anzahl: 1, label: `bob ${i}` }, asBob);
      }
      await POST(`${SRV}/generateAndCreate`, { anzahl: 2, label: 'bob neu', systems: ['s4d', 's4q'] }, asBob);
      await POST(`${SRV}/generateAndCreate`, { anzahl: 1, label: 'alice' }, asAlice);

      const res = (await GET(`${SRV}/MyRuns?$count=true&$orderby=createdAt desc&$expand=partners`, asBob)).data;
      expect(res.value.length).to.equal(5);
      expect(res['@odata.count']).to.equal(5);
      expect(res.value.every(r => r.createdBy === 'bob')).to.equal(true);
      expect(res.value[0].label).to.equal('bob neu');
      expect(res.value[0].partners.length).to.equal(4);         // 2 Personen x 2 Systeme
      expect(res.value.map(r => r.label)).to.not.include('bob 1');
      // Tracking (Runs) zeigt dagegen alle, auch fremde Laeufe
      const all = (await GET(`${SRV}/Runs`, asBob)).data.value;
      expect(all.some(r => r.createdBy === 'alice')).to.equal(true);
      expect(all.filter(r => r.createdBy === 'bob').length).to.be.greaterThan(5);
    });

    it('holt aus den Namenslisten nur Stichproben, auch bei mehr Personen als Nachnamen', async () => {
      // Leseabfragen auf die Namenslisten mitschreiben: mit Grenze (limit)?
      const reads = [];
      let spy = true;
      cds.db.before('READ', (req) => {
        const name = req.target?.name || '';
        if (spy && /StreetNames|LastNames/.test(name)) reads.push(req.query.SELECT.limit?.rows?.val);
      });
      try {
        // 150 Personen, aber es gibt nur rund 120 Nachnamen: Wiederholungen noetig.
        await POST(`${SRV}/generateAndCreate`, { anzahl: 150, label: 'Stichprobe', systems: ['s4d'] }, asDave);
        const run = await latestRun(asDave, 'dave');
        expect(run.partnerCount).to.equal(150);
        expect(run.partners.length).to.equal(150);
        expect(run.partners.every(p => p.lastName && p.streetName)).to.equal(true);
        // Namen sind gemischt, nicht alle gleich
        expect(new Set(run.partners.map(p => p.streetName)).size).to.be.greaterThan(100);
        // Keine Liste wurde komplett geladen: jede Abfrage hatte die Grenze 150.
        expect(reads.length).to.equal(2);
        expect(reads.every(n => n === 150)).to.equal(true);
      } finally {
        spy = false;
      }
    });

    it('lehnt unbekannte Zielsysteme und unsinnige Anzahl ab (400)', async () => {
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 1, systems: ['nope'] }, asAlice), 400);
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 0 }, asAlice), 400);
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 501 }, asAlice), 400);
    });
  });

  describe('Abbruch mitten im Anlegen', () => {
    it('sichert Lauf + bereits angelegte Objekte, antwortet ok=false mit Hinweis', async () => {
      // Das Ziel-Backend (S4Q = BackendAPI_3) beim 3. Geschaeftspartner scheitern lassen.
      const backend = cds.services.BackendAPI_3;
      let n = 0;
      const hook = (req) => { if (++n === 3) req.reject(400, 'simulierter Backend-Fehler'); };
      backend.before('CREATE', 'BusinessPartner', hook);
      try {
        const { data } = await POST(`${SRV}/generateAndCreate`, { anzahl: 5, label: 'Abbruch', systems: ['s4q'] }, asErin);
        expect(data.ok).to.equal(false);
        expect(data.message).to.match(/nach 2 Geschäftspartner/);
        expect(data.message).to.match(/Abbruch \(abgebrochen\)/);

        // Der Lauf existiert mit den 2 vollstaendig angelegten Personen (8 Objekte).
        const runs = (await GET(`${SRV}/Runs?$filter=label eq 'Abbruch (abgebrochen)'&$expand=objects`, asErin)).data.value;
        expect(runs.length).to.equal(1);
        expect(runs[0].systems).to.equal('S4Q');
        expect(runs[0].partnerCount).to.equal(2);
        expect(runs[0].objects.length).to.equal(8);
      } finally {
        // Hook wieder entfernen (Handler-Liste des Mock-Service bereinigen).
        const list = backend._handlers?.before || [];
        const i = list.findIndex(h => h.handler === hook);
        if (i >= 0) list.splice(i, 1);
      }
    });
  });

  describe('Tracking (zentral)', () => {
    it('alle Nutzer sehen alle Laeufe, mit Ersteller', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 1, label: 'von carol' }, asCarol);
      const runs = (await GET(`${SRV}/Runs?$filter=label eq 'von carol'`, asDave)).data.value;
      expect(runs.length).to.equal(1);
      expect(runs[0].createdBy).to.equal('carol');
    });

    it('Protokoll-Tabelle System|Objekt|Schluessel ist filterbar', async () => {
      const rows = (await GET(
        `${SRV}/CreatedObjects?$filter=system eq 'S4Q' and objectType eq 'BusinessPartner'`, asAlice)).data.value;
      expect(rows.length).to.be.at.least(1);
      expect([...new Set(rows.map(r => r.system))]).to.eql(['S4Q']);
    });
  });

  describe('Kopieren eines Laufs', () => {
    it('kopiert die Partner des Laufs von S4D nach S4Q und haengt sie an denselben Lauf', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 3, label: 'Kopie' }, asCarol);
      const run = await latestRun(asCarol, 'carol');
      const bp3Before = (await GET(`${BACKEND3}/BusinessPartner`, asCarol)).data.value.length;

      const { data } = await POST(`${SRV}/copyRun`, { run: run.ID, targetSystem: 's4q' }, asCarol);
      expect(data.value).to.match(/3 Geschäftspartner von S4D nach S4Q/);

      const bp3After = (await GET(`${BACKEND3}/BusinessPartner`, asCarol)).data.value.length;
      expect(bp3After - bp3Before).to.equal(3);

      const after = await latestRun(asCarol, 'carol');
      expect(after.systems).to.equal('S4D, S4Q');
      const copies = after.partners.filter(p => p.system === 'S4Q');
      expect(copies.length).to.equal(3);
      for (const c of copies) {
        expect(c.sourceSystem).to.equal('S4D');          // Herkunft vermerkt
        expect(c.sourceConcatID).to.be.a('string');      // an derselben Person
      }
    });

    it('lehnt Kopieren fremder Laeufe ab (403) und gleiches Ziel (400)', async () => {
      const run = await latestRun(asCarol, 'carol');
      await expectStatus(POST(`${SRV}/copyRun`, { run: run.ID, targetSystem: 's4q' }, asDave), 403);
      await expectStatus(POST(`${SRV}/copyRun`, { run: run.ID, sourceSystem: 's4d', targetSystem: 's4d' }, asCarol), 400);
    });
  });

  describe('Loeschen eines Laufs in einem System', () => {
    it('loescht im Backend, behaelt das Protokoll mit Status deleted', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 3, label: 'Loeschen', systems: ['s4d', 's4q'] }, asDave);
      const run = await latestRun(asDave, 'dave');
      const bpNumbers = run.partners.filter(p => p.system === 'S4D').map(p => p.objectKey);
      expect(bpNumbers.length).to.equal(3);

      const { data } = await POST(`${SRV}/deleteRun`, { run: run.ID, system: 's4d' }, asDave);
      expect(data.value).to.match(/12 Objekte aus S4D/);

      // Im Backend (S4D) sind die Geschaeftspartner weg.
      const filter = bpNumbers.map(n => `businessPartnerNumber eq ${n}`).join(' or ');
      const remaining = (await GET(`${BACKEND2}/BusinessPartner?$filter=${encodeURIComponent(filter)}`, asDave)).data.value;
      expect(remaining.length).to.equal(0);

      // Protokoll bleibt: S4D-Zeilen mit Status deleted, S4Q unveraendert.
      const after = await latestRun(asDave, 'dave');
      expect(after.objects.length).to.equal(24);
      expect(after.objects.filter(o => o.system === 'S4D').every(o => o.status === 'deleted' && o.deletedAt)).to.equal(true);
      expect(after.objects.filter(o => o.system === 'S4Q').every(o => o.status === 'created')).to.equal(true);
      expect(after.systems).to.equal('S4Q');
      expect(after.status).to.equal('partially deleted');

      // Auch aus S4Q loeschen -> Lauf komplett geloescht.
      await POST(`${SRV}/deleteRun`, { run: run.ID, system: 's4q' }, asDave);
      const done = await latestRun(asDave, 'dave');
      expect(done.systems).to.equal('');
      expect(done.status).to.equal('deleted');
    });

    it('lehnt erneutes Loeschen (400) und fremde Laeufe (403) ab', async () => {
      const run = await latestRun(asDave, 'dave');
      await expectStatus(POST(`${SRV}/deleteRun`, { run: run.ID, system: 's4d' }, asDave), 400);
      await expectStatus(POST(`${SRV}/deleteRun`, { run: run.ID, system: 's4q' }, asAlice), 403);
    });
  });

  describe('Viele Personen: Filter in Bloecken', () => {
    it('kopiert und loescht 60 Personen vollstaendig, je Abfrage hoechstens 50 Werte', async () => {
      // Jede Leseabfrage an die Zielsysteme mitschreiben: wie lang ist die Filterliste?
      const lists = [];
      let spy = true;
      const record = (req) => {
        if (!spy) return;
        for (const w of req.query?.SELECT?.where || []) {
          if (w && Array.isArray(w.list)) lists.push(w.list.length);
        }
      };
      for (const name of ['BackendAPI_2', 'BackendAPI_3']) {
        for (const entity of ['BusinessPartner', 'Address', 'Street', 'City']) {
          cds.services[name].before('READ', entity, record);
        }
      }
      try {
        await POST(`${SRV}/generateAndCreate`, { anzahl: 60, label: 'Viele', systems: ['s4d'] }, asFrank);
        const run = await latestRun(asFrank, 'frank');
        expect(run.partnerCount).to.equal(60);

        const copy = await POST(`${SRV}/copyRun`, { run: run.ID, targetSystem: 's4q' }, asFrank);
        expect(copy.data.value).to.match(/60 Geschäftspartner von S4D nach S4Q/);

        const del = await POST(`${SRV}/deleteRun`, { run: run.ID, system: 's4d' }, asFrank);
        expect(del.data.value).to.match(/240 Objekte aus S4D/);

        // Es wurde tatsaechlich in Bloecken gefragt, und keiner war groesser als 50.
        expect(lists.length).to.be.greaterThan(0);
        expect(Math.max(...lists)).to.be.at.most(50);
        expect(lists.some(n => n === 50)).to.equal(true);
      } finally {
        spy = false;
      }
    });
  });

  describe('Zielsysteme', () => {
    it('einzelnes System ist per Schluessel lesbar (Detailseite)', async () => {
      const { data } = await GET(`${SRV}/Systems('s4d')`, asAlice);
      expect(data.name).to.equal('S4D');
    });

    it('neues System anlegen (Schluessel = Name in Kleinbuchstaben, wie die UI ihn bildet)', async () => {
      const { status } = await POST(`${SRV}/Systems`,
        { ID: 's4p', name: 'S4P', description: 'Prod (Mock)', serviceName: 'BackendAPI_2', isDefault: false }, asAlice);
      expect(status).to.equal(201);
      const { data } = await GET(`${SRV}/Systems('s4p')`, asAlice);
      expect(data.serviceName).to.equal('BackendAPI_2');
    });

    it('Anlegen in einem System mit unbekanntem Service schlaegt fehl, ohne einen Lauf zu hinterlassen', async () => {
      await POST(`${SRV}/Systems`,
        { ID: 'kaputt', name: 'KAPUTT', serviceName: 'GibtEsNicht', isDefault: false }, asAlice);
      const before = (await GET(`${SRV}/Runs?$count=true&$top=0`, asAlice)).data['@odata.count'];
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 2, label: 'kaputt', systems: ['kaputt'] }, asAlice), 500);
      const after = (await GET(`${SRV}/Runs?$count=true&$top=0`, asAlice)).data['@odata.count'];
      expect(after).to.equal(before);
    });

    it('stellt die konfigurierten Zielsysteme bereit (Default + zweites)', async () => {
      const systems = (await GET(`${SRV}/Systems`, asAlice)).data.value;
      const byName = Object.fromEntries(systems.map(s => [s.name, s]));
      expect(Boolean(byName.S4D && byName.S4Q)).to.equal(true);
      expect(byName.S4D.isDefault).to.equal(true);
      expect(byName.S4Q.serviceName).to.equal('BackendAPI_3');
    });
  });

  describe('Backend-Validierung (Mock)', () => {
    it('lehnt eine ungueltige Hausnummer ab (400)', async () => {
      const payload = {
        street_ID: cds.utils.uuid(), city_ID: cds.utils.uuid(),
        houseNumber: '123',   // ohne Buchstabe -> ungueltig
        postalCode: '01067'
      };
      await expectStatus(POST(`${BACKEND2}/Address`, payload, asAlice), 400);
    });

    it('lehnt eine ungueltige PLZ ab (400)', async () => {
      const payload = {
        street_ID: cds.utils.uuid(), city_ID: cds.utils.uuid(),
        houseNumber: '5a',
        postalCode: '1234'    // nur 4 Ziffern -> ungueltig
      };
      await expectStatus(POST(`${BACKEND2}/Address`, payload, asAlice), 400);
    });
  });
});
