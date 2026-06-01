const cds = require('@sap/cds');

// Auth fuer die Tests: drei Nutzer mit/ohne Rolle (wie beim manuellen Test).
// Wird vor cds.test gesetzt, damit der Test-Server unter mocked-Auth laeuft.
cds.env.requires.auth = {
  kind: 'mocked',
  users: {
    alice:   { password: 'alice',   roles: ['Generator'] },
    bob:     { password: 'bob',     roles: ['Generator'] },
    mallory: { password: 'mallory', roles: [] }
  }
};

// 'serve all --with-mocks' startet den Server inkl. lokalem BackendAPI_2-Mock
// (genau wie 'cds watch'); '--in-memory' gibt jedem Testlauf eine frische DB.
const { GET, POST, expect } = cds.test('serve', 'all', '--with-mocks', '--in-memory');

const asAlice   = { auth: { username: 'alice',   password: 'alice'   } };
const asBob     = { auth: { username: 'bob',     password: 'bob'     } };
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
