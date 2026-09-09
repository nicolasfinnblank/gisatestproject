const cds = require('@sap/cds');

// Die Fiori-Apps rufen den Service RELATIV zu sich selbst auf
// (service/generator/...), so wie es die Approuter auf BTP erwarten. Lokal
// liegen die Apps unter /<app>/webapp/, cds watch kennt diesen Pfad nicht ->
// auf den echten Service-Pfad umschreiben. CAP antwortet darauf mit einer
// 308-Weiterleitung auf /service/generator/..., der Browser folgt ihr.
// In Produktion greift das nie (dort leiten die Approuter weiter).
cds.on('bootstrap', app => {
  app.use((req, _res, next) => {
    const m = req.url.match(/^\/(generator|tracking|systems)\/webapp\/(service\/generator\/.*)$/);
    if (m) req.url = '/' + m[2];
    next();
  });
});

module.exports = cds.server;
