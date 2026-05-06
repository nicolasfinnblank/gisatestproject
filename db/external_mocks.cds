using { BackendAPI_2 as ext } from '../srv/external/BackendAPI_2';

// Use a prefix like 'Mock_' to avoid the naming conflict
entity Mock_BusinessPartner {
    key ID : UUID;
    businessPartnerNumber : Integer;
    firstName : String(100);
    surName   : String(100);
}

entity Mock_Address {
    key ID : UUID;
    up__ID : UUID; 
    houseNumber : String(10);
    postalCode  : String(20);
    street      : String(100);
    city        : String(100);
}