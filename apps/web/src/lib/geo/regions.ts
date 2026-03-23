export interface OntarioRegion {
  id: string;
  name: string;
  geoUid: string;
}

/**
 * Ontario Census Divisions with StatCan geographic UIDs.
 * Sorted by CD code.
 */
export const ONTARIO_REGIONS: OntarioRegion[] = [
  { id: 'stormont-dundas-glengarry', name: 'Stormont, Dundas and Glengarry', geoUid: '3501' },
  { id: 'prescott-russell', name: 'Prescott and Russell', geoUid: '3502' },
  { id: 'ottawa', name: 'Ottawa', geoUid: '3506' },
  { id: 'leeds-grenville', name: 'Leeds and Grenville', geoUid: '3507' },
  { id: 'lanark', name: 'Lanark', geoUid: '3509' },
  { id: 'frontenac', name: 'Frontenac', geoUid: '3510' },
  { id: 'lennox-addington', name: 'Lennox and Addington', geoUid: '3511' },
  { id: 'hastings', name: 'Hastings', geoUid: '3512' },
  { id: 'prince-edward', name: 'Prince Edward', geoUid: '3513' },
  { id: 'northumberland', name: 'Northumberland', geoUid: '3514' },
  { id: 'peterborough', name: 'Peterborough', geoUid: '3515' },
  { id: 'kawartha-lakes', name: 'Kawartha Lakes', geoUid: '3516' },
  { id: 'durham', name: 'Durham', geoUid: '3518' },
  { id: 'york', name: 'York', geoUid: '3519' },
  { id: 'toronto', name: 'Toronto', geoUid: '3520' },
  { id: 'peel', name: 'Peel', geoUid: '3521' },
  { id: 'dufferin', name: 'Dufferin', geoUid: '3522' },
  { id: 'simcoe', name: 'Simcoe', geoUid: '3543' },
  { id: 'muskoka', name: 'Muskoka', geoUid: '3544' },
  { id: 'haliburton', name: 'Haliburton', geoUid: '3546' },
  { id: 'renfrew', name: 'Renfrew', geoUid: '3547' },
  { id: 'nipissing', name: 'Nipissing', geoUid: '3548' },
  { id: 'parry-sound', name: 'Parry Sound', geoUid: '3549' },
  { id: 'manitoulin', name: 'Manitoulin', geoUid: '3551' },
  { id: 'sudbury-district', name: 'Sudbury District', geoUid: '3552' },
  { id: 'greater-sudbury', name: 'Greater Sudbury', geoUid: '3553' },
  { id: 'timiskaming', name: 'Timiskaming', geoUid: '3554' },
  { id: 'cochrane', name: 'Cochrane', geoUid: '3556' },
  { id: 'algoma', name: 'Algoma', geoUid: '3557' },
  { id: 'thunder-bay', name: 'Thunder Bay', geoUid: '3558' },
  { id: 'rainy-river', name: 'Rainy River', geoUid: '3559' },
  { id: 'kenora', name: 'Kenora', geoUid: '3560' },
  { id: 'halton', name: 'Halton', geoUid: '3524' },
  { id: 'hamilton', name: 'Hamilton', geoUid: '3525' },
  { id: 'niagara', name: 'Niagara', geoUid: '3526' },
  { id: 'haldimand-norfolk', name: 'Haldimand-Norfolk', geoUid: '3528' },
  { id: 'brant', name: 'Brant', geoUid: '3529' },
  { id: 'waterloo', name: 'Waterloo', geoUid: '3530' },
  { id: 'wellington', name: 'Wellington', geoUid: '3523' },
  { id: 'perth', name: 'Perth', geoUid: '3531' },
  { id: 'oxford', name: 'Oxford', geoUid: '3532' },
  { id: 'elgin', name: 'Elgin', geoUid: '3534' },
  { id: 'chatham-kent', name: 'Chatham-Kent', geoUid: '3536' },
  { id: 'essex', name: 'Essex', geoUid: '3537' },
  { id: 'lambton', name: 'Lambton', geoUid: '3538' },
  { id: 'middlesex', name: 'Middlesex', geoUid: '3539' },
  { id: 'huron', name: 'Huron', geoUid: '3540' },
  { id: 'bruce', name: 'Bruce', geoUid: '3541' },
  { id: 'grey', name: 'Grey', geoUid: '3542' },
];
