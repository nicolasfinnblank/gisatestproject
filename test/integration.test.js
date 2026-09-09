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
      expect(data.value).to.match(/3 Geschäftspartner in S4D/);
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

    it('Quittung (GeneratorData) zeigt nur den letzten eigenen Lauf, mit Platzierungen', async () => {
      await POST(`${SRV}/generateAndCreate`, { anzahl: 4, label: 'alt' }, asBob);
      await POST(`${SRV}/generateAndCreate`, { anzahl: 2, label: 'neu', systems: ['s4d', 's4q'] }, asBob);

      const rows = (await GET(`${SRV}/GeneratorData?$expand=placements,run`, asBob)).data.value;
      expect(rows.length).to.equal(2);                          // nur der letzte Lauf
      expect([...new Set(rows.map(r => r.run.label))]).to.eql(['neu']);
      for (const r of rows) {
        expect(r.createdBy).to.equal('bob');
        expect(r.placements.map(p => p.system).sort()).to.eql(['S4D', 'S4Q']);
      }
      // bobs Quittung ist von alice nicht sichtbar
      const aliceRows = (await GET(`${SRV}/GeneratorData`, asAlice)).data.value;
      expect(aliceRows.every(r => r.createdBy === 'alice')).to.equal(true);
    });

    it('lehnt unbekannte Zielsysteme und unsinnige Anzahl ab (400)', async () => {
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 1, systems: ['nope'] }, asAlice), 400);
      await expectStatus(POST(`${SRV}/generateAndCreate`, { anzahl: 0 }, asAlice), 400);
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

  describe('Zielsysteme', () => {
    it('stellt die konfigurierten Zielsysteme bereit (Default + zweites)', async () => {
      const systems = (await GET(`${SRV}/Systems`, asAlice)).data.value;
      const byName = Object.fromEntries(systems.map(s => [s.name, s]));
      expect(byName).to.have.keys(['S4D', 'S4Q']);
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
