// Nur solange kein echtes S/4-System angebunden ist: Die gemockten
// Zielsysteme brauchen in der Cloud Tabellen in der HANA (lokal legt
// --in-memory sie automatisch an). Externe Service-Entities werden sonst
// beim Datenbank-Build uebersprungen.
using from '../srv/external/BackendAPI_2';
using from '../srv/external/BackendAPI_3';

annotate BackendAPI_2.Street          with @cds.persistence.skip: false;
annotate BackendAPI_2.City            with @cds.persistence.skip: false;
annotate BackendAPI_2.Address         with @cds.persistence.skip: false;
annotate BackendAPI_2.BusinessPartner with @cds.persistence.skip: false;
annotate BackendAPI_3.Street          with @cds.persistence.skip: false;
annotate BackendAPI_3.City            with @cds.persistence.skip: false;
annotate BackendAPI_3.Address         with @cds.persistence.skip: false;
annotate BackendAPI_3.BusinessPartner with @cds.persistence.skip: false;
