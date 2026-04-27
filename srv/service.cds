using { Test1 as my } from '../db/schema.cds';

@path: '/service/test1'
@requires: 'authenticated-user'
service test1Srv {
  @odata.draft.enabled
  entity StreetNames as projection on my.StreetNames;
  @odata.draft.enabled
  entity Cities as projection on my.Cities;
  @odata.draft.enabled
  entity Neighborhoods as projection on my.Neighborhoods;
  @odata.draft.enabled
  entity FirstNames as projection on my.FirstNames;
  @odata.draft.enabled
  entity LastNames as projection on my.LastNames;
}