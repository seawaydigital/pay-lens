/**
 * Rebuild ALL derived tables using direct SQL via Supabase Management API.
 * Runs complex aggregations server-side — entire rebuild in ~30 seconds.
 */

const API_TOKEN = 'sbp_9def4122934cad20f407436a9d25802f9374a0ee';
const PROJECT_REF = 'jmuitsmxtoqjeogidstj';

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error (${res.status}): ${text}`);
  }
  return res.json();
}

function slug(t) {
  return t.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYER → REGION MAPPING
// ══════════════════════════════════════════════════════════════════════════════
// Region lat/lng centroids
const REGION_COORDS = {
  'stormont-dundas-glengarry': { geoUid: '3501', lat: 45.03, lng: -74.99, name: 'Stormont, Dundas and Glengarry' },
  'prescott-russell': { geoUid: '3502', lat: 45.38, lng: -74.63, name: 'Prescott and Russell' },
  'ottawa': { geoUid: '3506', lat: 45.42, lng: -75.69, name: 'Ottawa' },
  'leeds-grenville': { geoUid: '3507', lat: 44.62, lng: -75.85, name: 'Leeds and Grenville' },
  'lanark': { geoUid: '3509', lat: 44.97, lng: -76.45, name: 'Lanark' },
  'frontenac': { geoUid: '3510', lat: 44.38, lng: -76.57, name: 'Frontenac' },
  'lennox-addington': { geoUid: '3511', lat: 44.47, lng: -77.05, name: 'Lennox and Addington' },
  'hastings': { geoUid: '3512', lat: 44.51, lng: -77.57, name: 'Hastings' },
  'prince-edward': { geoUid: '3513', lat: 43.95, lng: -77.09, name: 'Prince Edward' },
  'northumberland': { geoUid: '3514', lat: 44.12, lng: -77.87, name: 'Northumberland' },
  'peterborough': { geoUid: '3515', lat: 44.31, lng: -78.32, name: 'Peterborough' },
  'kawartha-lakes': { geoUid: '3516', lat: 44.53, lng: -78.73, name: 'Kawartha Lakes' },
  'durham': { geoUid: '3518', lat: 43.94, lng: -78.86, name: 'Durham' },
  'york': { geoUid: '3519', lat: 43.98, lng: -79.47, name: 'York' },
  'toronto': { geoUid: '3520', lat: 43.65, lng: -79.38, name: 'Toronto' },
  'peel': { geoUid: '3521', lat: 43.68, lng: -79.75, name: 'Peel' },
  'dufferin': { geoUid: '3522', lat: 44.06, lng: -80.11, name: 'Dufferin' },
  'wellington': { geoUid: '3523', lat: 43.75, lng: -80.45, name: 'Wellington' },
  'halton': { geoUid: '3524', lat: 43.48, lng: -79.88, name: 'Halton' },
  'hamilton': { geoUid: '3525', lat: 43.26, lng: -79.87, name: 'Hamilton' },
  'niagara': { geoUid: '3526', lat: 43.10, lng: -79.23, name: 'Niagara' },
  'haldimand-norfolk': { geoUid: '3528', lat: 42.88, lng: -80.17, name: 'Haldimand-Norfolk' },
  'brant': { geoUid: '3529', lat: 43.14, lng: -80.27, name: 'Brant' },
  'waterloo': { geoUid: '3530', lat: 43.45, lng: -80.49, name: 'Waterloo' },
  'perth': { geoUid: '3531', lat: 43.58, lng: -81.00, name: 'Perth' },
  'oxford': { geoUid: '3532', lat: 43.10, lng: -80.73, name: 'Oxford' },
  'elgin': { geoUid: '3534', lat: 42.72, lng: -81.08, name: 'Elgin' },
  'chatham-kent': { geoUid: '3536', lat: 42.38, lng: -82.18, name: 'Chatham-Kent' },
  'essex': { geoUid: '3537', lat: 42.17, lng: -82.95, name: 'Essex' },
  'lambton': { geoUid: '3538', lat: 42.93, lng: -82.13, name: 'Lambton' },
  'middlesex': { geoUid: '3539', lat: 43.00, lng: -81.25, name: 'Middlesex' },
  'huron': { geoUid: '3540', lat: 43.71, lng: -81.51, name: 'Huron' },
  'bruce': { geoUid: '3541', lat: 44.29, lng: -81.17, name: 'Bruce' },
  'grey': { geoUid: '3542', lat: 44.42, lng: -80.72, name: 'Grey' },
  'simcoe': { geoUid: '3543', lat: 44.39, lng: -79.85, name: 'Simcoe' },
  'muskoka': { geoUid: '3544', lat: 45.10, lng: -79.40, name: 'Muskoka' },
  'haliburton': { geoUid: '3546', lat: 45.03, lng: -78.53, name: 'Haliburton' },
  'renfrew': { geoUid: '3547', lat: 45.64, lng: -77.20, name: 'Renfrew' },
  'nipissing': { geoUid: '3548', lat: 46.30, lng: -79.45, name: 'Nipissing' },
  'parry-sound': { geoUid: '3549', lat: 45.42, lng: -79.93, name: 'Parry Sound' },
  'manitoulin': { geoUid: '3551', lat: 45.78, lng: -82.00, name: 'Manitoulin' },
  'sudbury-district': { geoUid: '3552', lat: 46.80, lng: -81.50, name: 'Sudbury District' },
  'greater-sudbury': { geoUid: '3553', lat: 46.49, lng: -80.99, name: 'Greater Sudbury' },
  'timiskaming': { geoUid: '3554', lat: 47.52, lng: -79.68, name: 'Timiskaming' },
  'cochrane': { geoUid: '3556', lat: 49.07, lng: -81.02, name: 'Cochrane' },
  'algoma': { geoUid: '3557', lat: 46.52, lng: -84.35, name: 'Algoma' },
  'thunder-bay': { geoUid: '3558', lat: 48.38, lng: -89.25, name: 'Thunder Bay' },
  'rainy-river': { geoUid: '3559', lat: 48.82, lng: -93.67, name: 'Rainy River' },
  'kenora': { geoUid: '3560', lat: 49.77, lng: -94.49, name: 'Kenora' },
};

async function main() {
  console.log('=== FULL REBUILD VIA DIRECT SQL ===\n');
  const t0 = Date.now();

  // ══════════════════════════════════════════════════════════════════
  // 1. EMPLOYER-TO-REGION MAPPING via SQL UPDATE
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 1: Mapping employers to regions...');

  // Build a massive CASE WHEN SQL to map employer names to region IDs
  // This runs in the database — instant for all rows
  const mappingRules = [
    // Government ministries → toronto
    [`employer ILIKE 'Solicitor General%'`, 'toronto'],
    [`employer ILIKE 'Attorney General%'`, 'toronto'],
    [`employer ILIKE 'Treasury Board%'`, 'toronto'],
    [`employer ILIKE 'Public and Business Service%'`, 'toronto'],
    [`employer ILIKE 'Children, Community%'`, 'toronto'],
    [`employer ILIKE 'Transportation%' AND employer NOT ILIKE '%hospital%'`, 'toronto'],
    [`employer ILIKE 'Health%' AND length(employer) < 30`, 'toronto'],
    [`employer ILIKE 'Environment, Conservation%'`, 'toronto'],
    [`employer ILIKE 'Natural Resources%'`, 'toronto'],
    [`employer ILIKE 'Labour, Immigration%'`, 'toronto'],
    [`employer ILIKE 'Education%' AND length(employer) < 30`, 'toronto'],
    [`employer ILIKE 'Finance%' AND length(employer) < 20`, 'toronto'],
    [`employer ILIKE 'Agriculture%'`, 'toronto'],
    [`employer ILIKE 'Municipal Affairs%'`, 'toronto'],
    [`employer ILIKE 'Economic Development%'`, 'toronto'],
    [`employer ILIKE 'Long-Term Care%' AND length(employer) < 20`, 'toronto'],
    [`employer ILIKE 'Legislative Assembly%'`, 'toronto'],
    [`employer ILIKE 'Cabinet Office%'`, 'toronto'],
    [`employer ILIKE 'Infrastructure%' AND length(employer) < 25`, 'toronto'],
    [`employer ILIKE 'Tourism, Culture%'`, 'toronto'],
    [`employer ILIKE 'Colleges and Universities%'`, 'toronto'],
    [`employer ILIKE 'Colleges, Universities%'`, 'toronto'],
    [`employer ILIKE 'Seniors and Accessibility%'`, 'toronto'],
    [`employer ILIKE 'Supply Ontario%'`, 'toronto'],
    [`employer ILIKE 'Indigenous Affairs%'`, 'toronto'],
    [`employer ILIKE 'Citizenship%'`, 'toronto'],
    [`employer ILIKE 'Northern Development%'`, 'toronto'],
    [`employer ILIKE 'Energy%' AND length(employer) < 20`, 'toronto'],
    [`employer ILIKE 'Energy and Mines%'`, 'toronto'],
    [`employer ILIKE 'Mines%' AND length(employer) < 10`, 'toronto'],
    [`employer ILIKE 'Tribunals Ontario%'`, 'toronto'],
    [`employer ILIKE 'Information And Privacy%'`, 'toronto'],
    [`employer ILIKE 'Office Of The Auditor%'`, 'toronto'],
    [`employer ILIKE 'Ombudsman Ontario%'`, 'toronto'],
    [`employer ILIKE 'Education Quality%'`, 'toronto'],
    [`employer ILIKE 'Office Of The Chief Electoral%'`, 'toronto'],
    [`employer ILIKE 'Office Of The Premier%'`, 'toronto'],
    [`employer ILIKE 'iGaming Ontario%'`, 'toronto'],
    [`employer ILIKE 'Skilled Trades Ontario%'`, 'toronto'],
    [`employer ILIKE 'Invest Ontario%'`, 'toronto'],
    [`employer ILIKE 'Francophone Affairs%'`, 'toronto'],
    [`employer ILIKE 'Special Investigations%'`, 'toronto'],
    [`employer ILIKE 'Pay Equity%'`, 'toronto'],
    [`employer ILIKE 'Financial Accountability%'`, 'toronto'],
    [`employer ILIKE 'Consent and Capacity%'`, 'toronto'],
    [`employer ILIKE 'Intellectual Property Ontario%'`, 'toronto'],
    [`employer ILIKE 'Integrity Commissioner%'`, 'toronto'],
    [`employer ILIKE 'Municipal Property Assessment%'`, 'toronto'],
    [`employer ILIKE 'Ontario Power Generation%'`, 'toronto'],
    [`employer ILIKE 'Hydro One%'`, 'toronto'],
    [`employer ILIKE 'Metrolinx%'`, 'toronto'],
    [`employer ILIKE 'Ontario Health%'`, 'toronto'],
    [`employer ILIKE 'Ontario Lottery%'`, 'toronto'],
    [`employer ILIKE 'Ontario Securities%'`, 'toronto'],
    [`employer ILIKE 'Ontario Energy Board%'`, 'toronto'],
    [`employer ILIKE 'Infrastructure Ontario%'`, 'toronto'],
    [`employer ILIKE 'Legal Aid Ontario%'`, 'toronto'],
    [`employer ILIKE 'Workplace Safety%'`, 'toronto'],
    [`employer ILIKE '%eHealth Ontario%'`, 'toronto'],
    [`employer ILIKE 'Alcohol and Gaming%'`, 'toronto'],
    [`employer ILIKE 'Liquor Control Board%'`, 'toronto'],
    [`employer ILIKE 'ORNGE%'`, 'toronto'],
    [`employer ILIKE 'Independent Electricity%'`, 'toronto'],
    [`employer ILIKE 'Financial Services Regulatory%'`, 'toronto'],
    [`employer ILIKE 'Ontario Racing%'`, 'toronto'],
    [`employer ILIKE 'Ontario Clean Water%'`, 'toronto'],
    [`employer ILIKE 'Matheson%' AND length(employer) < 15`, 'toronto'],
    // Province-wide with Ontario in name
    [`employer ILIKE 'Ontario Northland%'`, 'nipissing'],
    // Hospitals
    [`employer ILIKE '%Sick Children%'`, 'toronto'],
    [`employer ILIKE '%Sickkids%'`, 'toronto'],
    [`employer ILIKE 'Scarborough Health%'`, 'toronto'],
    [`employer ILIKE 'Sinai Health%'`, 'toronto'],
    [`employer ILIKE 'Centre For Addiction%'`, 'toronto'],
    [`employer ILIKE 'North York General%'`, 'toronto'],
    [`employer ILIKE 'Michael Garron%'`, 'toronto'],
    [`employer ILIKE 'Sunnybrook%'`, 'toronto'],
    [`employer ILIKE 'University Health Network%'`, 'toronto'],
    [`employer ILIKE '%Women''s College%'`, 'toronto'],
    [`employer ILIKE 'Humber River%'`, 'toronto'],
    [`employer ILIKE 'Baycrest%'`, 'toronto'],
    [`employer ILIKE 'Holland Bloorview%'`, 'toronto'],
    [`employer ILIKE 'West Park Healthcare%'`, 'toronto'],
    [`employer ILIKE 'MaRS Discovery%'`, 'toronto'],
    [`employer ILIKE 'ICES%'`, 'toronto'],
    [`employer ILIKE 'Royal Ontario Museum%'`, 'toronto'],
    [`employer ILIKE 'Art Gallery Of Ontario%'`, 'toronto'],
    [`employer ILIKE 'Victoria University%'`, 'toronto'],
    [`employer ILIKE 'Runnymede Healthcare%'`, 'toronto'],
    [`employer ILIKE 'Oak Valley Health%'`, 'york'],
    [`employer ILIKE 'Mackenzie Health%'`, 'york'],
    [`employer ILIKE 'Southlake%'`, 'york'],
    [`employer ILIKE 'St. Mary''s General Hospital%'`, 'waterloo'],
    [`employer ILIKE 'Bluewater Health%'`, 'lambton'],
    [`employer ILIKE 'Brightshores Health%'`, 'grey'],
    [`employer ILIKE 'Sault Area Hospital%'`, 'algoma'],
    [`employer ILIKE 'Waypoint Centre%'`, 'simcoe'],
    [`employer ILIKE 'St. Joseph''s Care Group%'`, 'thunder-bay'],
    [`employer ILIKE 'Providence Care%'`, 'frontenac'],
    [`employer ILIKE 'Brant Community Healthcare%'`, 'brant'],
    [`employer ILIKE '%Hôpital Montfort%'`, 'ottawa'],
    [`employer ILIKE '%Montfort%'`, 'ottawa'],
    [`employer ILIKE '%Hôtel-Dieu Grace%'`, 'essex'],
    [`employer ILIKE 'Ross Memorial%'`, 'kawartha-lakes'],
    [`employer ILIKE 'Georgian Bay General%'`, 'simcoe'],
    [`employer ILIKE 'Northumberland Hills%'`, 'northumberland'],
    [`employer ILIKE 'Headwater Health%'`, 'dufferin'],
    [`employer ILIKE 'Perth And Smiths Falls%'`, 'lanark'],
    [`employer ILIKE 'Erie Shores Healthcare%'`, 'essex'],
    [`employer ILIKE 'Health Sciences North%'`, 'greater-sudbury'],
    [`employer ILIKE 'Kingston Health%'`, 'frontenac'],
    [`employer ILIKE 'Trillium Health%'`, 'peel'],
    [`employer ILIKE 'William Osler%'`, 'peel'],
    [`employer ILIKE 'Lakeridge%'`, 'durham'],
    [`employer ILIKE 'Almonte General%'`, 'lanark'],
    [`employer ILIKE 'South Bruce Grey Health%'`, 'grey'],
    [`employer ILIKE 'Strathroy Middlesex%'`, 'middlesex'],
    [`employer ILIKE 'Temiskaming Hospital%'`, 'timiskaming'],
    [`employer ILIKE 'Blanche River Health%'`, 'timiskaming'],
    [`employer ILIKE 'Tillsonburg District%'`, 'oxford'],
    [`employer ILIKE 'Stevenson Memorial%'`, 'simcoe'],
    [`employer ILIKE 'Groves Memorial%'`, 'wellington'],
    [`employer ILIKE 'Sioux Lookout%'`, 'kenora'],
    [`employer ILIKE 'Lake Of The Woods%'`, 'kenora'],
    [`employer ILIKE 'Riverside Health Care%'`, 'rainy-river'],
    [`employer ILIKE 'Weeneebayko%'`, 'cochrane'],
    [`employer ILIKE 'Alexandra Marine%'`, 'huron'],
    // School boards
    [`employer ILIKE 'Thames Valley District%'`, 'middlesex'],
    [`employer ILIKE 'York Catholic District%'`, 'york'],
    [`employer ILIKE 'Upper Grand District%'`, 'wellington'],
    [`employer ILIKE 'Upper Canada District%'`, 'stormont-dundas-glengarry'],
    [`employer ILIKE 'Grand Erie District%'`, 'brant'],
    [`employer ILIKE 'Lambton Kent District%'`, 'lambton'],
    [`employer ILIKE 'Limestone District%'`, 'frontenac'],
    [`employer ILIKE 'Rainbow District%'`, 'greater-sudbury'],
    [`employer ILIKE 'Bluewater District%'`, 'bruce'],
    [`employer ILIKE 'Avon Maitland District%'`, 'perth'],
    [`employer ILIKE 'Trillium Lakelands%'`, 'kawartha-lakes'],
    [`employer ILIKE 'Catholic District School Board Of Eastern%'`, 'lanark'],
    [`employer ILIKE 'Algoma District School%'`, 'algoma'],
    [`employer ILIKE 'Near North District%'`, 'nipissing'],
    [`employer ILIKE 'Algonquin And Lakeshore%'`, 'hastings'],
    [`employer ILIKE 'Wellington Catholic%'`, 'wellington'],
    [`employer ILIKE 'District School Board Ontario North%'`, 'timiskaming'],
    [`employer ILIKE 'Keewatin-Patricia%'`, 'kenora'],
    [`employer ILIKE 'Rainy River District School%'`, 'rainy-river'],
    [`employer ILIKE 'Bruce-Grey Catholic%'`, 'bruce'],
    [`employer ILIKE 'St. Clair Catholic%'`, 'essex'],
    [`employer ILIKE 'Greater Essex County%'`, 'essex'],
    [`employer ILIKE 'Superior-Greenstone%'`, 'thunder-bay'],
    [`employer ILIKE 'Northeastern Catholic%'`, 'cochrane'],
    [`employer ILIKE 'Northwest Catholic%'`, 'kenora'],
    [`employer ILIKE 'Superior North Catholic%'`, 'thunder-bay'],
    // French school boards
    [`employer ILIKE 'Conseil Des Écoles Catholiques Du Centre%'`, 'ottawa'],
    [`employer ILIKE 'Conseil Scolaire Catholique MonAvenir%'`, 'toronto'],
    [`employer ILIKE 'Conseil Des Écoles Publiques De L''est%'`, 'ottawa'],
    [`employer ILIKE 'Conseil Scolaire Viamonde%'`, 'toronto'],
    [`employer ILIKE 'Conseil Scolaire De District Catholique De L''est%'`, 'prescott-russell'],
    [`employer ILIKE 'Conseil Scolaire De District Catholique Du Centre%'`, 'ottawa'],
    [`employer ILIKE 'Conseil Scolaire Catholique Providence%'`, 'essex'],
    [`employer ILIKE 'Conseil Scolaire De District Catholique Du Nouvel%'`, 'greater-sudbury'],
    [`employer ILIKE 'Conseil Scolaire Catholique Des Grandes%'`, 'cochrane'],
    [`employer ILIKE 'Conseil Scolaire Public Du Grand Nord%'`, 'greater-sudbury'],
    [`employer ILIKE 'Conseil Scolaire Catholique Franco-Nord%'`, 'nipissing'],
    [`employer ILIKE 'Conseil Scolaire Public Du Nord-est%'`, 'timiskaming'],
    [`employer ILIKE 'Conseil Scolaire Catholique Des Aurores%'`, 'thunder-bay'],
    // Regional/County govts
    [`employer ILIKE 'Regional Municipality Of York%'`, 'york'],
    [`employer ILIKE 'County Of Simcoe%'`, 'simcoe'],
    [`employer ILIKE 'County Of Essex%'`, 'essex'],
    [`employer ILIKE 'County Of Lambton%'`, 'lambton'],
    [`employer ILIKE 'County Of Oxford%'`, 'oxford'],
    [`employer ILIKE 'County Of Hastings%'`, 'hastings'],
    [`employer ILIKE 'County Of Frontenac%'`, 'frontenac'],
    [`employer ILIKE 'County Of Grey%'`, 'grey'],
    [`employer ILIKE 'County Of Northumberland%'`, 'northumberland'],
    [`employer ILIKE 'County Of Brant%'`, 'brant'],
    [`employer ILIKE 'County Of Wellington%'`, 'wellington'],
    [`employer ILIKE 'County Of Bruce%'`, 'bruce'],
    [`employer ILIKE 'County Of Middlesex%'`, 'middlesex'],
    [`employer ILIKE 'County Of Perth%'`, 'perth'],
    [`employer ILIKE 'County Of Elgin%'`, 'elgin'],
    // Universities
    [`employer ILIKE '%University Of Western Ontario%'`, 'middlesex'],
    [`employer ILIKE '%Western University%'`, 'middlesex'],
    [`employer ILIKE '%Queen''s University%'`, 'frontenac'],
    [`employer ILIKE '%McMaster%'`, 'hamilton'],
    [`employer ILIKE '%Lakehead%'`, 'thunder-bay'],
    [`employer ILIKE '%Laurentian%'`, 'greater-sudbury'],
    [`employer ILIKE '%Nipissing University%'`, 'nipissing'],
    [`employer ILIKE '%Algoma University%'`, 'algoma'],
    [`employer ILIKE '%Trent University%'`, 'peterborough'],
    [`employer ILIKE '%Brock University%'`, 'niagara'],
    [`employer ILIKE '%Wilfrid Laurier%'`, 'waterloo'],
    [`employer ILIKE '%York University%'`, 'toronto'],
    [`employer ILIKE '%Toronto Metropolitan%'`, 'toronto'],
    [`employer ILIKE '%Ryerson%'`, 'toronto'],
    [`employer ILIKE '%Ontario Tech%'`, 'durham'],
    [`employer ILIKE '%Carleton%'`, 'ottawa'],
    [`employer ILIKE 'Northern Ontario School Of Medicine%'`, 'greater-sudbury'],
    [`employer ILIKE 'King''s University College%'`, 'middlesex'],
    [`employer ILIKE 'Saint Paul University%'`, 'ottawa'],
    [`employer ILIKE 'Perimeter Institute%'`, 'waterloo'],
    [`employer ILIKE 'Vector Institute%'`, 'toronto'],
    // Colleges
    [`employer ILIKE '%Georgian College%'`, 'simcoe'],
    [`employer ILIKE '%Fanshawe%'`, 'middlesex'],
    [`employer ILIKE '%Centennial College%'`, 'toronto'],
    [`employer ILIKE '%Seneca%'`, 'toronto'],
    [`employer ILIKE '%Humber College%'`, 'toronto'],
    [`employer ILIKE '%Humber Institute%'`, 'toronto'],
    [`employer ILIKE '%George Brown%'`, 'toronto'],
    [`employer ILIKE '%Sheridan%'`, 'halton'],
    [`employer ILIKE '%Mohawk College%'`, 'hamilton'],
    [`employer ILIKE '%Conestoga College%'`, 'waterloo'],
    [`employer ILIKE '%Northern College%'`, 'cochrane'],
    [`employer ILIKE '%Cambrian College%'`, 'greater-sudbury'],
    [`employer ILIKE '%Confederation College%'`, 'thunder-bay'],
    [`employer ILIKE '%Canadore%'`, 'nipissing'],
    [`employer ILIKE '%Algonquin College%'`, 'ottawa'],
    [`employer ILIKE '%St. Lawrence College%'`, 'frontenac'],
    [`employer ILIKE '%St Lawrence College%'`, 'frontenac'],
    [`employer ILIKE '%St. Clair College%'`, 'essex'],
    [`employer ILIKE '%St Clair College%'`, 'essex'],
    [`employer ILIKE '%Lambton College%'`, 'lambton'],
    [`employer ILIKE '%Fleming College%'`, 'peterborough'],
    [`employer ILIKE '%Sandford Fleming%'`, 'peterborough'],
    [`employer ILIKE '%Loyalist College%'`, 'hastings'],
    [`employer ILIKE '%Durham College%'`, 'durham'],
    [`employer ILIKE '%Niagara College%'`, 'niagara'],
    [`employer ILIKE '%Sault College%'`, 'algoma'],
    [`employer ILIKE '%Boréal%'`, 'greater-sudbury'],
    [`employer ILIKE '%Boreal%'`, 'greater-sudbury'],
    [`employer ILIKE '%La Cité%'`, 'ottawa'],
    [`employer ILIKE '%La Cite%'`, 'ottawa'],
    // City name patterns
    [`employer ILIKE '%Toronto%'`, 'toronto'],
    [`employer ILIKE '%Ottawa%'`, 'ottawa'],
    [`employer ILIKE '%Hamilton%' AND employer NOT ILIKE '%Northumberland%'`, 'hamilton'],
    [`employer ILIKE '%London%' AND employer NOT ILIKE '%Toronto%'`, 'middlesex'],
    [`employer ILIKE '%Windsor%'`, 'essex'],
    [`employer ILIKE '%Kingston%'`, 'frontenac'],
    [`employer ILIKE '%Kitchener%'`, 'waterloo'],
    [`employer ILIKE '%Waterloo%'`, 'waterloo'],
    [`employer ILIKE '%Guelph%'`, 'wellington'],
    [`employer ILIKE '%Thunder Bay%'`, 'thunder-bay'],
    [`employer ILIKE '%Sudbury%'`, 'greater-sudbury'],
    [`employer ILIKE '%Barrie%'`, 'simcoe'],
    [`employer ILIKE '%Niagara%'`, 'niagara'],
    [`employer ILIKE '%St. Catharines%'`, 'niagara'],
    [`employer ILIKE '%Brantford%'`, 'brant'],
    [`employer ILIKE '%Peterborough%'`, 'peterborough'],
    [`employer ILIKE '%Belleville%'`, 'hastings'],
    [`employer ILIKE '%Cornwall%'`, 'stormont-dundas-glengarry'],
    [`employer ILIKE '%Brockville%'`, 'leeds-grenville'],
    [`employer ILIKE '%Chatham%'`, 'chatham-kent'],
    [`employer ILIKE '%Sarnia%'`, 'lambton'],
    [`employer ILIKE '%Sault Ste%'`, 'algoma'],
    [`employer ILIKE '%North Bay%'`, 'nipissing'],
    [`employer ILIKE '%Timmins%'`, 'cochrane'],
    [`employer ILIKE '%Oshawa%'`, 'durham'],
    [`employer ILIKE '%Durham%'`, 'durham'],
    [`employer ILIKE '%Mississauga%'`, 'peel'],
    [`employer ILIKE '%Brampton%'`, 'peel'],
    [`employer ILIKE '%Peel%' AND employer NOT ILIKE '%appeal%'`, 'peel'],
    [`employer ILIKE '%York Region%'`, 'york'],
    [`employer ILIKE '%Markham%'`, 'york'],
    [`employer ILIKE '%Vaughan%'`, 'york'],
    [`employer ILIKE '%Oakville%'`, 'halton'],
    [`employer ILIKE '%Burlington%'`, 'halton'],
    [`employer ILIKE '%Halton%'`, 'halton'],
    [`employer ILIKE '%Cambridge%' AND employer NOT ILIKE '%memorial%'`, 'waterloo'],
    [`employer ILIKE '%Stratford%'`, 'perth'],
    [`employer ILIKE '%Owen Sound%'`, 'grey'],
    [`employer ILIKE '%Collingwood%'`, 'simcoe'],
    [`employer ILIKE '%Orillia%'`, 'simcoe'],
    [`employer ILIKE '%Simcoe%'`, 'simcoe'],
    [`employer ILIKE '%Muskoka%'`, 'muskoka'],
    [`employer ILIKE '%Renfrew%'`, 'renfrew'],
    [`employer ILIKE '%Parry Sound%'`, 'parry-sound'],
    [`employer ILIKE '%Kenora%'`, 'kenora'],
    [`employer ILIKE '%Huron%' AND employer NOT ILIKE '%Lake%'`, 'huron'],
    [`employer ILIKE '%Bruce%' AND employer NOT ILIKE '%Robert%'`, 'bruce'],
    [`employer ILIKE '%Grey%' AND employer NOT ILIKE '%greystone%'`, 'grey'],
    [`employer ILIKE '%Norfolk%'`, 'haldimand-norfolk'],
    [`employer ILIKE '%Haldimand%'`, 'haldimand-norfolk'],
    [`employer ILIKE '%Cochrane%'`, 'cochrane'],
    [`employer ILIKE '%Timiskaming%'`, 'timiskaming'],
    [`employer ILIKE '%Manitoulin%'`, 'manitoulin'],
    [`employer ILIKE '%Lennox%'`, 'lennox-addington'],
    [`employer ILIKE '%Lanark%'`, 'lanark'],
    [`employer ILIKE '%Haliburton%'`, 'haliburton'],
    [`employer ILIKE '%Dufferin%'`, 'dufferin'],
    [`employer ILIKE '%Elgin%'`, 'elgin'],
    [`employer ILIKE '%Prescott%'`, 'prescott-russell'],
    [`employer ILIKE '%Whitby%'`, 'durham'],
    [`employer ILIKE '%Ajax%'`, 'durham'],
    [`employer ILIKE '%Pickering%'`, 'durham'],
    [`employer ILIKE '%Clarington%'`, 'durham'],
    [`employer ILIKE '%Caledon%'`, 'peel'],
    [`employer ILIKE '%Newmarket%'`, 'york'],
    [`employer ILIKE '%Georgina%'`, 'york'],
    [`employer ILIKE '%Stouffville%'`, 'york'],
    [`employer ILIKE '%Innisfil%'`, 'simcoe'],
    [`employer ILIKE '%Midland%'`, 'simcoe'],
    [`employer ILIKE '%Wasaga%'`, 'simcoe'],
    [`employer ILIKE '%Lasalle%'`, 'essex'],
    [`employer ILIKE '%Amherstburg%'`, 'essex'],
    [`employer ILIKE '%Lakeshore%' AND employer ILIKE '%Town%'`, 'essex'],
    [`employer ILIKE '%Tecumseh%'`, 'essex'],
    [`employer ILIKE '%Leamington%'`, 'essex'],
    [`employer ILIKE '%Fort Erie%'`, 'niagara'],
    [`employer ILIKE '%Thorold%'`, 'niagara'],
    [`employer ILIKE '%Port Colborne%'`, 'niagara'],
    [`employer ILIKE '%Welland%'`, 'niagara'],
    [`employer ILIKE '%Bruyère%'`, 'ottawa'],
    [`employer ILIKE '%Bruyere%'`, 'ottawa'],
    [`employer ILIKE '%Salvation Army%'`, 'toronto'],
    [`employer ILIKE 'Science North%'`, 'greater-sudbury'],
    [`employer ILIKE '%Canadian Institute For Health%'`, 'toronto'],
    [`employer ILIKE 'Eastern Ontario Regional Lab%'`, 'ottawa'],
  ];

  // Build one big UPDATE with CASE WHEN
  const cases = mappingRules.map(([condition, region]) => {
    const r = REGION_COORDS[region];
    if (!r) return '';
    return `WHEN ${condition} THEN '${r.geoUid}'`;
  }).filter(Boolean).join('\n    ');

  const regionNameCases = mappingRules.map(([condition, region]) => {
    const r = REGION_COORDS[region];
    if (!r) return '';
    return `WHEN ${condition} THEN '${r.name.replace(/'/g, "''")}'`;
  }).filter(Boolean).join('\n    ');

  // Update disclosures with region mapping — split by year to avoid timeout
  for (const year of [2023, 2024, 2025]) {
    const updateSQL = `
      UPDATE disclosures SET
        region_id = CASE
          ${cases}
          ELSE region_id
        END,
        region_name = CASE
          ${regionNameCases}
          ELSE region_name
        END
      WHERE year = ${year} AND (region_id IS NULL OR region_id = '');
    `;
    try {
      await sql(updateSQL);
      console.log(`  Year ${year}: region mapping applied`);
    } catch (e) {
      console.error(`  Year ${year}: ${e.message}`);
    }
  }

  // Count how many have regions now
  const [{ cnt: withRegion }] = await sql(`SELECT COUNT(*) as cnt FROM disclosures WHERE region_id IS NOT NULL AND region_id != ''`);
  const [{ cnt: total }] = await sql(`SELECT COUNT(*) as cnt FROM disclosures`);
  console.log(`  Mapped ${Number(withRegion).toLocaleString()} / ${Number(total).toLocaleString()} disclosures to regions (${Math.round(withRegion/total*100)}%)\n`);

  // ══════════════════════════════════════════════════════════════════
  // 2. REBUILD SECTORS
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 2: Rebuilding sectors...');
  await sql(`DELETE FROM sectors`);

  const sectorData = await sql(`
    SELECT
      sector,
      COUNT(*) as employee_count,
      ROUND(AVG(salary_paid)::numeric, 2) as avg_salary,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric, 2) as median_salary,
      MIN(salary_paid) as min_salary,
      MAX(salary_paid) as max_salary,
      ROUND(SUM(salary_paid + taxable_benefits)::numeric, 2) as total_compensation
    FROM disclosures
    GROUP BY sector
    ORDER BY employee_count DESC
  `);

  // Calculate YoY growth per sector
  const yoyData = await sql(`
    SELECT
      sector,
      SUM(CASE WHEN year = 2025 THEN 1 ELSE 0 END) as c2025,
      SUM(CASE WHEN year = 2024 THEN 1 ELSE 0 END) as c2024
    FROM disclosures
    WHERE year IN (2024, 2025)
    GROUP BY sector
  `);
  const yoyMap = {};
  for (const r of yoyData) {
    yoyMap[r.sector] = r.c2024 > 0 ? Math.round(((r.c2025 - r.c2024) / r.c2024) * 10000) / 100 : 0;
  }

  for (const row of sectorData) {
    if (!row.sector?.trim()) continue;
    const sectorName = row.sector.trim();
    const insertSQL = `
      INSERT INTO sectors (id, name, employee_count, avg_salary, median_salary, min_salary, max_salary, total_compensation, yoy_growth)
      VALUES ('${slug(sectorName)}', '${sectorName.replace(/'/g, "''")}', ${row.employee_count}, ${row.avg_salary}, ${row.median_salary}, ${row.min_salary}, ${row.max_salary}, ${row.total_compensation}, ${yoyMap[row.sector] || 0})
      ON CONFLICT (id) DO UPDATE SET
        employee_count = EXCLUDED.employee_count, avg_salary = EXCLUDED.avg_salary,
        median_salary = EXCLUDED.median_salary, min_salary = EXCLUDED.min_salary,
        max_salary = EXCLUDED.max_salary, total_compensation = EXCLUDED.total_compensation,
        yoy_growth = EXCLUDED.yoy_growth;
    `;
    await sql(insertSQL);
    console.log(`    ${sectorName}: ${Number(row.employee_count).toLocaleString()} employees, median $${Math.round(Number(row.median_salary)).toLocaleString()}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════
  // 3. REBUILD EMPLOYERS
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 3: Rebuilding employers...');

  await sql(`
    UPDATE employers e SET
      headcount = sub.cnt,
      median_salary = sub.med,
      sector = sub.sector,
      region_id = COALESCE(sub.region_id, e.region_id, '')
    FROM (
      SELECT
        employer_id,
        COUNT(*) as cnt,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid) as med,
        (array_agg(sector ORDER BY year DESC))[1] as sector,
        (array_agg(region_id ORDER BY year DESC))[1] as region_id
      FROM disclosures
      WHERE employer_id IS NOT NULL
      GROUP BY employer_id
    ) sub
    WHERE e.id = sub.employer_id;
  `);

  const [{ cnt: empCount }] = await sql(`SELECT COUNT(*) as cnt FROM employers`);
  console.log(`  Updated ${Number(empCount).toLocaleString()} employers\n`);

  // ══════════════════════════════════════════════════════════════════
  // 4. REBUILD REGIONS
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 4: Rebuilding regions...');
  await sql(`DELETE FROM regions`);

  const regionData = await sql(`
    SELECT
      region_id,
      region_name,
      COUNT(*) as employee_count,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric, 2) as median_salary
    FROM disclosures
    WHERE region_id IS NOT NULL AND region_id != '' AND year = 2025
    GROUP BY region_id, region_name
    ORDER BY employee_count DESC
  `);

  for (const row of regionData) {
    // Find coords by geoUid
    const region = Object.values(REGION_COORDS).find(r => r.geoUid === row.region_id);
    if (!region) continue;

    await sql(`
      INSERT INTO regions (region_id, name, median_salary, employee_count, lat, lng)
      VALUES ('${row.region_id}', '${(row.region_name || region.name).replace(/'/g, "''")}', ${row.median_salary}, ${row.employee_count}, ${region.lat}, ${region.lng})
      ON CONFLICT (region_id) DO UPDATE SET
        median_salary = EXCLUDED.median_salary,
        employee_count = EXCLUDED.employee_count,
        lat = EXCLUDED.lat, lng = EXCLUDED.lng;
    `);
    console.log(`    ${row.region_name || region.name}: ${Number(row.employee_count).toLocaleString()} employees, median $${Math.round(Number(row.median_salary)).toLocaleString()}`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════
  // 5. REBUILD HISTORICAL SERIES
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 5: Rebuilding historical series...');
  await sql(`DELETE FROM historical_series`);

  const CPI = { 2023: 160.1, 2024: 164.1, 2025: 167.0 };
  const yearStats = await sql(`
    SELECT
      year,
      COUNT(*) as total_employees,
      ROUND(SUM(salary_paid + taxable_benefits)::numeric) as total_compensation,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric) as median_salary,
      ROUND(AVG(salary_paid)::numeric) as average_salary,
      ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY salary_paid)::numeric) as p25_salary,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY salary_paid)::numeric) as p75_salary,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY salary_paid)::numeric) as p90_salary
    FROM disclosures
    GROUP BY year
    ORDER BY year
  `);

  for (const row of yearStats) {
    // Get sector breakdown
    const sectorBreak = await sql(`
      SELECT
        sector,
        COUNT(*) as count,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid)::numeric) as median
      FROM disclosures
      WHERE year = ${row.year}
      GROUP BY sector
    `);
    const sectors = {};
    for (const s of sectorBreak) {
      if (s.sector?.trim()) sectors[s.sector.trim()] = { count: Number(s.count), median: Number(s.median) };
    }

    await sql(`
      INSERT INTO historical_series (year, total_employees, total_compensation, median_salary, average_salary, p25_salary, p75_salary, p90_salary, threshold, cpi_index, sectors)
      VALUES (${row.year}, ${row.total_employees}, ${row.total_compensation}, ${row.median_salary}, ${row.average_salary}, ${row.p25_salary}, ${row.p75_salary}, ${row.p90_salary}, 100000, ${CPI[row.year] || 167.0}, '${JSON.stringify(sectors).replace(/'/g, "''")}')
      ON CONFLICT (year) DO UPDATE SET
        total_employees = EXCLUDED.total_employees, total_compensation = EXCLUDED.total_compensation,
        median_salary = EXCLUDED.median_salary, average_salary = EXCLUDED.average_salary,
        p25_salary = EXCLUDED.p25_salary, p75_salary = EXCLUDED.p75_salary, p90_salary = EXCLUDED.p90_salary,
        sectors = EXCLUDED.sectors;
    `);
    console.log(`  ${row.year}: ${Number(row.total_employees).toLocaleString()} employees, median $${Number(row.median_salary).toLocaleString()}, total comp $${Math.round(Number(row.total_compensation) / 1e9)}B`);
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════
  // 6. REBUILD STATS SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 6: Stats summary...');
  const [stats] = await sql(`
    SELECT
      COUNT(*) as total_records,
      COUNT(DISTINCT employer_id) as unique_employers,
      MAX(year) as latest_year
    FROM disclosures
  `);
  const [latest] = await sql(`SELECT median_salary, total_compensation FROM historical_series WHERE year = (SELECT MAX(year) FROM historical_series)`);
  const [yoyCalc] = await sql(`
    SELECT
      ROUND(((c25.cnt::numeric - c24.cnt) / NULLIF(c24.cnt, 0)) * 100, 2) as yoy
    FROM
      (SELECT COUNT(*) as cnt FROM disclosures WHERE year = 2025) c25,
      (SELECT COUNT(*) as cnt FROM disclosures WHERE year = 2024) c24
  `);

  await sql(`
    INSERT INTO stats_summary (id, total_records, unique_employers, latest_year, median_salary, total_compensation, yoy_growth, updated_at)
    VALUES (1, ${stats.total_records}, ${stats.unique_employers}, ${stats.latest_year}, ${latest?.median_salary || 0}, ${latest?.total_compensation || 0}, ${yoyCalc?.yoy || 0}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      total_records = EXCLUDED.total_records, unique_employers = EXCLUDED.unique_employers,
      latest_year = EXCLUDED.latest_year, median_salary = EXCLUDED.median_salary,
      total_compensation = EXCLUDED.total_compensation, yoy_growth = EXCLUDED.yoy_growth,
      updated_at = NOW();
  `);
  console.log(`  Total: ${Number(stats.total_records).toLocaleString()}, ${Number(stats.unique_employers).toLocaleString()} employers, YoY ${yoyCalc?.yoy || 0}%\n`);

  // ══════════════════════════════════════════════════════════════════
  // 7. REBUILD ANOMALIES
  // ══════════════════════════════════════════════════════════════════
  console.log('Step 7: Detecting anomalies...');
  await sql(`DELETE FROM anomalies`);

  // Large increases (>40% YoY, >$30K change)
  const increases = await sql(`
    SELECT
      d25.first_name, d25.last_name, d25.employer, d25.job_title,
      d24.salary_paid as salary_prev, d25.salary_paid as salary_curr,
      ROUND(((d25.salary_paid - d24.salary_paid) / NULLIF(d24.salary_paid, 0)) * 100, 1) as change_percent,
      ROUND(d25.salary_paid - d24.salary_paid) as change_amount
    FROM disclosures d25
    JOIN disclosures d24 ON d25.first_name = d24.first_name AND d25.last_name = d24.last_name AND d25.employer = d24.employer
    WHERE d25.year = 2025 AND d24.year = 2024
      AND d25.salary_paid > d24.salary_paid * 1.4
      AND (d25.salary_paid - d24.salary_paid) > 30000
    ORDER BY (d25.salary_paid - d24.salary_paid) DESC
    LIMIT 50
  `);

  // Large decreases (>30% drop)
  const decreases = await sql(`
    SELECT
      d25.first_name, d25.last_name, d25.employer, d25.job_title,
      d24.salary_paid as salary_prev, d25.salary_paid as salary_curr,
      ROUND(((d25.salary_paid - d24.salary_paid) / NULLIF(d24.salary_paid, 0)) * 100, 1) as change_percent,
      ROUND(d25.salary_paid - d24.salary_paid) as change_amount
    FROM disclosures d25
    JOIN disclosures d24 ON d25.first_name = d24.first_name AND d25.last_name = d24.last_name AND d25.employer = d24.employer
    WHERE d25.year = 2025 AND d24.year = 2024
      AND d25.salary_paid < d24.salary_paid * 0.7
      AND (d24.salary_paid - d25.salary_paid) > 30000
    ORDER BY (d24.salary_paid - d25.salary_paid) DESC
    LIMIT 30
  `);

  // New high entries (>$250K in 2025, not on list in 2024)
  const newHigh = await sql(`
    SELECT d25.first_name, d25.last_name, d25.employer, d25.job_title, d25.salary_paid as salary_curr
    FROM disclosures d25
    LEFT JOIN disclosures d24 ON d25.first_name = d24.first_name AND d25.last_name = d24.last_name AND d24.year = 2024
    WHERE d25.year = 2025 AND d25.salary_paid > 250000 AND d24.id IS NULL
    ORDER BY d25.salary_paid DESC
    LIMIT 20
  `);

  let anomalyId = 0;
  const allAnomalies = [];
  for (const r of increases) {
    allAnomalies.push({
      id: `anom-${++anomalyId}`, name: `${r.first_name} ${r.last_name}`,
      employer: r.employer, title: r.job_title,
      salary_prev: Number(r.salary_prev), salary_curr: Number(r.salary_curr),
      year_prev: 2024, year_curr: 2025,
      change_percent: Number(r.change_percent), change_amount: Number(r.change_amount),
      flag: 'large_increase', possible_reason: 'Potential severance, back-pay, promotion, or administrative role change',
    });
  }
  for (const r of decreases) {
    allAnomalies.push({
      id: `anom-${++anomalyId}`, name: `${r.first_name} ${r.last_name}`,
      employer: r.employer, title: r.job_title,
      salary_prev: Number(r.salary_prev), salary_curr: Number(r.salary_curr),
      year_prev: 2024, year_curr: 2025,
      change_percent: Number(r.change_percent), change_amount: Number(r.change_amount),
      flag: 'large_decrease', possible_reason: 'Possible role change, partial-year employment, or data correction',
    });
  }
  for (const r of newHigh) {
    allAnomalies.push({
      id: `anom-${++anomalyId}`, name: `${r.first_name} ${r.last_name}`,
      employer: r.employer, title: r.job_title,
      salary_prev: null, salary_curr: Number(r.salary_curr),
      year_prev: null, year_curr: 2025,
      change_percent: null, change_amount: null,
      flag: 'new_high_entry', possible_reason: 'First appearance on Sunshine List at a high salary level',
    });
  }

  // Insert via individual SQL for safety
  for (const a of allAnomalies) {
    const sp = a.salary_prev !== null ? a.salary_prev : 'NULL';
    const yp = a.year_prev !== null ? a.year_prev : 'NULL';
    const cp = a.change_percent !== null ? a.change_percent : 'NULL';
    const ca = a.change_amount !== null ? a.change_amount : 'NULL';
    await sql(`
      INSERT INTO anomalies (id, name, employer, title, salary_prev, salary_curr, year_prev, year_curr, change_percent, change_amount, flag, possible_reason)
      VALUES ('${a.id}', '${a.name.replace(/'/g, "''")}', '${a.employer.replace(/'/g, "''")}', '${a.title.replace(/'/g, "''")}', ${sp}, ${a.salary_curr}, ${yp}, ${a.year_curr}, ${cp}, ${ca}, '${a.flag}', '${a.possible_reason.replace(/'/g, "''")}')
    `);
  }
  console.log(`  Found ${allAnomalies.length} anomalies (${increases.length} increases, ${decreases.length} decreases, ${newHigh.length} new high entries)\n`);

  // ══════════════════════════════════════════════════════════════════
  // FINAL COUNTS
  // ══════════════════════════════════════════════════════════════════
  console.log('=== FINAL COUNTS ===');
  for (const t of ['disclosures', 'employers', 'sectors', 'regions', 'anomalies', 'historical_series', 'stats_summary', 'benchmarks']) {
    const [{ cnt }] = await sql(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`  ${t}: ${Number(cnt).toLocaleString()}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nDone! Full rebuild completed in ${elapsed}s`);
}

main().catch(e => { console.error(e); process.exit(1); });
