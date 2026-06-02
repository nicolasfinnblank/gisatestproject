const cds = require('@sap/cds');
const mockBackend = require('./_mockBackend');

// Lokaler Mock fuer BackendAPI_3 (Ziel-System "S4Q"). Verhalten s. _mockBackend.js.
module.exports = cds.service.impl(mockBackend());
