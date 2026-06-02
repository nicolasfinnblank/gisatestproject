// Gemeinsame Mock-Logik fuer die gemockten Backend-Services (BackendAPI_2,
// BackendAPI_3, ...). Bildet zwei Verhaltensweisen des echten S/4-Backends nach,
// die der generische CAP-Mock nicht kennt:
//   1. Die *Number-Felder sind Core.Computed -> das echte Backend vergibt sie
//      selbst. Wir fuellen sie hier, sonst scheitern die NOT NULL-Constraints.
//   2. houseNumber/postalCode haben im Modell @Validation.Pattern. CAP erzwingt
//      diese OData-Annotation nicht automatisch -> wir spiegeln die Muster hier,
//      damit der Mock ungueltige Eingaben genauso ablehnt wie das echte Backend.
//
// In Produktion werden diese Mocks nicht verwendet (dort sprechen wir die echten
// Services an, die ihre Eingaben selbst validieren).

// Eindeutige Pseudo-Nummer im erlaubten Bereich [1 .. 9.999.999.999]
const nextNumber = () => Math.floor(Math.random() * 9_999_999_999) + 1;

// Muster aus dem Partner-Modell (Address/houseNumber bzw. /postalCode)
const HOUSE_NUMBER = /^[0-9]{1,4}[a-z]$/;
const POSTAL_CODE  = /^[0-9]{5}$/;

// Liefert eine cds.service.impl-Funktion, die das Mock-Verhalten auf die
// Entities Street/City/Address/BusinessPartner des jeweiligen Service anwendet.
module.exports = function mockBackend() {
  return function () {
    const { Street, City, Address, BusinessPartner } = this.entities;

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
  };
};
