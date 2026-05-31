const cds = require('@sap/cds');

// Lokale Mock-Logik fuer den BackendAPI_2-Service.
//
// Sie bildet zwei Verhaltensweisen des echten Backends nach, die der generische
// CAP-Mock nicht kennt:
//   1. Die *Number-Felder sind Core.Computed -> das echte Backend vergibt sie
//      selbst. Wir fuellen sie hier, sonst scheitern die NOT NULL-Constraints.
//   2. houseNumber/postalCode haben im EDMX @Validation.Pattern. CAP erzwingt
//      diese OData-Annotation nicht automatisch -> wir spiegeln die Muster hier,
//      damit der Mock ungueltige Eingaben genauso ablehnt wie das echte Backend.
//
// In Produktion wird diese Datei nicht verwendet (dort sprechen wir den echten
// Service an, der seine Eingaben selbst validiert).
module.exports = cds.service.impl(function () {
  const { Street, City, Address, BusinessPartner } = this.entities;

  // Eindeutige Pseudo-Nummer im erlaubten Bereich [1 .. 9.999.999.999]
  const nextNumber = () => Math.floor(Math.random() * 9_999_999_999) + 1;

  // Muster aus dem Partner-EDMX (Address/houseNumber bzw. /postalCode)
  const HOUSE_NUMBER = /^[0-9]{1,4}[a-z]$/;
  const POSTAL_CODE  = /^[0-9]{5}$/;

  this.before('CREATE', Street,          req => { req.data.streetNumber ??= nextNumber(); });
  this.before('CREATE', City,            req => { req.data.cityNumber   ??= nextNumber(); });
  this.before('CREATE', BusinessPartner, req => { req.data.businessPartnerNumber ??= nextNumber(); });

  this.before('CREATE', Address, req => {
    req.data.addressNumber ??= nextNumber();

    const { houseNumber, postalCode } = req.data;
    if (houseNumber != null && !HOUSE_NUMBER.test(houseNumber)) {
      req.error(400, `houseNumber '${houseNumber}' entspricht nicht dem Muster [0-9]{1,4}[a-z]`);
    }
    if (postalCode != null && !POSTAL_CODE.test(postalCode)) {
      req.error(400, `postalCode '${postalCode}' entspricht nicht dem Muster [0-9]{5}`);
    }
  });
});
