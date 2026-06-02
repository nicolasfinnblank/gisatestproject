const cds = require('@sap/cds');

// Auth fuer die Tests: drei Nutzer mit/ohne Rolle (wie beim manuellen Test).
// Wird vor cds.test gesetzt, damit der Test-Server unter mocked-Auth laeuft.
cds.env.requires.auth = {
  kind: 'mocked',
  users: {
    alice:   { password: 'alice',   roles: ['Generator'] },
    bob:     { password: 'bob',     roles: ['Generator'] },
    carol:   { password: 'carol',   roles: ['Generator'] },
    dave:    { password: 'dave',    roles: ['Generator'] },
    mallory: { password: 'mallory', roles: [] }
  }
};

// 'serve all --with-mocks' startet den Server inkl. lokalem BackendAPI_2-Mock
// (genau wie 'cds watch'); '--in-memory' gibt jedem Testlauf eine frische DB.
const { GET, POST, expect } = cds.test('serve', 'all', '--with-mocks', '--in-memory');

const asAlice   = { auth: { username: 'alice',   password: 'alice'   } };
const asBob     = { auth: { username: 'bob',     password: 'bob'     } };
const asCarol   = { auth: { username: 'carol',   password: 'carol'   } };
const asDave    = { auth: { username: 'dave',    password: 'dave'    } };
const asMallory = { auth: { username: 'mallory', password: 'mallory' } };

const SRV = '/service/generator';
const BACKEND = '/odata/v4/backend-api-2';

// Hilfsfunktion: Status-Code einer erwartet fehlschlagenden Anfrage pruefen
async function expectStatus(promise, status) {
  try {
    await promise;
    expect.fail(`Anfrage haette mit ${status} fehlschlagen sollen`);
  } catch (e) {
    expect(e.response?.status).to.equal(status);
  }
}

describe('GISA Master Data Generator', () => {

  describe('Autorisierung', () => {
    it('lehnt Anfragen ohne Login ab (401)', async () => {
      await expectStatus(POST(`${SRV}/generateTestCustomers`, { anzahl: 1 }), 401);
    });

    it('lehnt Nutzer ohne Rolle ab (403)', async () => {
      await expectStatus(POST(`${SRV}/generateTestCustomers`, { anzahl: 1 }, asMallory), 403);
    });

    it('erlaubt Nutzer mit Rolle Generator', async () => {
      const { data } = await POST(`${SRV}/generateTestCustomers`, { anzahl: 3 }, asAlice);
      expect(data.value).to.match(/3/);
    });
  });

  describe('Generieren', () => {
    it('erzeugt genau die angeforderte Anzahl Zeilen', async () => {
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 5 }, asAlice);
      const { data } = await GET(`${SRV}/GeneratorData`, asAlice);
      expect(data.value.length).to.equal(5);
    });
  });

  describe('Multi-User-Isolation', () => {
    it('Nutzer sehen nur eigene Daten und loeschen sich nicht gegenseitig', async () => {
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 4 }, asAlice);
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 7 }, asBob);

      const aliceRows = (await GET(`${SRV}/GeneratorData`, asAlice)).data.value;
      const bobRows   = (await GET(`${SRV}/GeneratorData`, asBob)).data.value;

      expect(aliceRows.length).to.equal(4);   // bobs Generieren hat alice nicht geloescht
      expect(bobRows.length).to.equal(7);
      // alice sieht ausschliesslich eigene Zeilen
      expect([...new Set(aliceRows.map(r => r.createdBy))]).to.eql(['alice']);
    });
  });

  describe('Push ans Backend', () => {
    it('pusht nur die eigenen Zeilen und sie kommen im Backend an', async () => {
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 3 }, asAlice);
      const { data } = await POST(`${SRV}/pushToBackend`, {}, asAlice);
      expect(data.value).to.match(/3/);

      const bp = (await GET(`${BACKEND}/BusinessPartner`, asAlice)).data.value;
      expect(bp.length).to.be.at.least(3);
    });

    it('erzeugte Hausnummern erfuellen das Backend-Muster [0-9]{1,4}[a-z]', async () => {
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 5 }, asAlice);
      await POST(`${SRV}/pushToBackend`, {}, asAlice);

      const addresses = (await GET(`${BACKEND}/Address?$select=houseNumber`, asAlice)).data.value;
      expect(addresses.length).to.be.at.least(5);
      for (const a of addresses) {
        expect(a.houseNumber).to.match(/^[0-9]{1,4}[a-z]$/);
      }
    });
  });

  describe('Tracking der angelegten Objekte', () => {
    // Hinweis: CreatedObjects ist eine Historie und wird (anders als GeneratorData)
    // nicht geleert. Da sich die In-Memory-DB ueber die Suite akkumuliert, pruefen
    // wir Zuwaechse (Deltas) statt absoluter Zaehlungen.
    const count = async (auth) => (await GET(`${SRV}/CreatedObjects`, auth)).data.value.length;

    it('protokolliert je gepushtem Kunden 4 Objekte mit System, Typ und Schluessel', async () => {
      const before = await count(asAlice);
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 3 }, asAlice);
      await POST(`${SRV}/pushToBackend`, {}, asAlice);

      const tracked = (await GET(`${SRV}/CreatedObjects`, asAlice)).data.value;
      // 3 Kunden x 4 Objekte (Street, City, Address, BusinessPartner)
      expect(tracked.length - before).to.equal(12);

      const types = [...new Set(tracked.map(t => t.objectType))].sort();
      expect(types).to.eql(['Address', 'BusinessPartner', 'City', 'Street']);

      for (const t of tracked) {
        expect(t.system).to.equal('S4D');  // Default-Zielsystem
        expect(t.objectKey).to.be.a('string').and.not.equal('');
        expect(t.createdBy).to.equal('alice');
      }
    });

    it('zeigt jedem Nutzer nur sein eigenes Tracking (Multi-User-sicher)', async () => {
      const aliceBefore = await count(asAlice);
      const bobBefore   = await count(asBob);

      await POST(`${SRV}/generateTestCustomers`, { anzahl: 2 }, asAlice);
      await POST(`${SRV}/pushToBackend`, {}, asAlice);
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 1 }, asBob);
      await POST(`${SRV}/pushToBackend`, {}, asBob);

      const aliceTracked = (await GET(`${SRV}/CreatedObjects`, asAlice)).data.value;
      const bobTracked   = (await GET(`${SRV}/CreatedObjects`, asBob)).data.value;

      expect(aliceTracked.length - aliceBefore).to.equal(8);  // 2 x 4
      expect(bobTracked.length - bobBefore).to.equal(4);       // 1 x 4
      // alice sieht ausschliesslich eigene Eintraege (bobs Push taucht nicht auf)
      expect([...new Set(aliceTracked.map(t => t.createdBy))]).to.eql(['alice']);
    });
  });

  describe('Multi-System', () => {
    const BACKEND3 = '/odata/v4/backend-api-3';

    it('stellt die konfigurierten Zielsysteme bereit (Default + zweites)', async () => {
      const systems = (await GET(`${SRV}/Systems`, asAlice)).data.value;
      const byName = Object.fromEntries(systems.map(s => [s.name, s]));
      expect(byName).to.have.keys(['S4D', 'S4Q']);
      expect(byName.S4D.isDefault).to.equal(true);
      expect(byName.S4Q.serviceName).to.equal('BackendAPI_3');
    });

    it('pusht in das gewaehlte zweite System (S4Q) und trackt es getrennt', async () => {
      const bp3Before = (await GET(`${BACKEND3}/BusinessPartner`, asAlice)).data.value.length;

      await POST(`${SRV}/generateTestCustomers`, { anzahl: 2 }, asAlice);
      const { data } = await POST(`${SRV}/pushToBackend`, { system: 's4q' }, asAlice);
      expect(data.value).to.match(/S4Q/);

      // Daten sind im ZWEITEN Backend angekommen (getrennter Speicher).
      const bp3After = (await GET(`${BACKEND3}/BusinessPartner`, asAlice)).data.value.length;
      expect(bp3After - bp3Before).to.equal(2);

      // Tracking weist S4Q als System aus.
      const tracked = (await GET(`${SRV}/CreatedObjects?$filter=system eq 'S4Q'`, asAlice)).data.value;
      expect(tracked.length).to.be.at.least(8);  // 2 Kunden x 4 Objekte
      expect([...new Set(tracked.map(t => t.system))]).to.eql(['S4Q']);
    });
  });

  describe('Copy zwischen Systemen', () => {
    const BACKEND3 = '/odata/v4/backend-api-3';

    it('lehnt Copy mit gleichem Quell- und Zielsystem ab (400)', async () => {
      await expectStatus(POST(`${SRV}/copyData`, { sourceSystem: 's4d', targetSystem: 's4d' }, asCarol), 400);
    });

    it('kopiert die eigenen Partner von S4D nach S4Q und trackt sie dort', async () => {
      // carol erzeugt + pusht 3 Partner ins Default-System S4D
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 3 }, asCarol);
      await POST(`${SRV}/pushToBackend`, {}, asCarol);

      const bp3Before = (await GET(`${BACKEND3}/BusinessPartner`, asCarol)).data.value.length;

      const { data } = await POST(`${SRV}/copyData`, { sourceSystem: 's4d', targetSystem: 's4q' }, asCarol);
      expect(data.value).to.match(/3 Business Partner von S4D nach S4Q/);

      // Die 3 Partner sind jetzt zusaetzlich im Ziel-Backend (S4Q / backend-3).
      const bp3After = (await GET(`${BACKEND3}/BusinessPartner`, asCarol)).data.value.length;
      expect(bp3After - bp3Before).to.equal(3);

      // Tracking weist die Kopien als S4Q-BusinessPartner von carol aus.
      const tracked = (await GET(
        `${SRV}/CreatedObjects?$filter=system eq 'S4Q' and objectType eq 'BusinessPartner'`, asCarol
      )).data.value;
      expect(tracked.length).to.equal(3);
      expect([...new Set(tracked.map(t => t.createdBy))]).to.eql(['carol']);
    });
  });

  describe('Löschen im System', () => {
    const BACKEND2 = '/odata/v4/backend-api-2';

    it('löscht die eigenen Objekte wieder aus dem System und räumt das Tracking', async () => {
      await POST(`${SRV}/generateTestCustomers`, { anzahl: 3 }, asDave);
      await POST(`${SRV}/pushToBackend`, {}, asDave);  // Default S4D

      const before = (await GET(`${SRV}/CreatedObjects`, asDave)).data.value;
      expect(before.length).to.equal(12);  // 3 x 4 Objekte
      const bpNumbers = before.filter(t => t.objectType === 'BusinessPartner').map(t => t.objectKey);
      expect(bpNumbers.length).to.equal(3);

      const { data } = await POST(`${SRV}/deleteFromBackend`, { system: 's4d' }, asDave);
      expect(data.value).to.match(/12 Objekte aus S4D/);

      // Tracking von dave ist leer.
      const after = (await GET(`${SRV}/CreatedObjects`, asDave)).data.value;
      expect(after.length).to.equal(0);

      // Die Business Partner sind im Backend (S4D = backend-2) tatsaechlich weg.
      const filter = bpNumbers.map(n => `businessPartnerNumber eq ${n}`).join(' or ');
      const remaining = (await GET(`${BACKEND2}/BusinessPartner?$filter=${encodeURIComponent(filter)}`, asDave)).data.value;
      expect(remaining.length).to.equal(0);
    });

    it('lehnt Löschen ab, wenn der Nutzer im System nichts angelegt hat (400)', async () => {
      // dave hat nach dem Loeschen oben nichts mehr im System.
      await expectStatus(POST(`${SRV}/deleteFromBackend`, { system: 's4d' }, asDave), 400);
    });
  });

  describe('Backend-Validierung (Mock)', () => {
    it('lehnt eine ungueltige Hausnummer ab (400)', async () => {
      const payload = {
        street_ID: cds.utils.uuid(),
        city_ID: cds.utils.uuid(),
        houseNumber: '123',   // ohne Buchstabe -> ungueltig
        postalCode: '01067'
      };
      await expectStatus(POST(`${BACKEND}/Address`, payload, asAlice), 400);
    });

    it('lehnt eine ungueltige PLZ ab (400)', async () => {
      const payload = {
        street_ID: cds.utils.uuid(),
        city_ID: cds.utils.uuid(),
        houseNumber: '5a',
        postalCode: '1234'    // nur 4 Ziffern -> ungueltig
      };
      await expectStatus(POST(`${BACKEND}/Address`, payload, asAlice), 400);
    });
  });
});
