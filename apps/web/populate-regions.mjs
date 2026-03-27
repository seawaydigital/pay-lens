/**
 * Populate the regions table by:
 * 1. Mapping employers to Ontario Census Divisions using keyword matching
 * 2. Updating disclosures with region_id/region_name
 * 3. Aggregating salary data per region into the regions table
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jmuitsmxtoqjeogidstj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdWl0c214dG9xamVvZ2lkc3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyMzI1MCwiZXhwIjoyMDg5ODk5MjUwfQ.vpCZf5yZfzRXkKVp8ZatAVoexhkmftVNjYI5cFweEII'
);

// Ontario Census Divisions with lat/lng centroids
const REGIONS = [
  { id: 'stormont-dundas-glengarry', name: 'Stormont, Dundas and Glengarry', geoUid: '3501', lat: 45.03, lng: -74.99 },
  { id: 'prescott-russell', name: 'Prescott and Russell', geoUid: '3502', lat: 45.38, lng: -74.63 },
  { id: 'ottawa', name: 'Ottawa', geoUid: '3506', lat: 45.42, lng: -75.69 },
  { id: 'leeds-grenville', name: 'Leeds and Grenville', geoUid: '3507', lat: 44.62, lng: -75.85 },
  { id: 'lanark', name: 'Lanark', geoUid: '3509', lat: 44.97, lng: -76.45 },
  { id: 'frontenac', name: 'Frontenac', geoUid: '3510', lat: 44.38, lng: -76.57 },
  { id: 'lennox-addington', name: 'Lennox and Addington', geoUid: '3511', lat: 44.47, lng: -77.05 },
  { id: 'hastings', name: 'Hastings', geoUid: '3512', lat: 44.51, lng: -77.57 },
  { id: 'prince-edward', name: 'Prince Edward', geoUid: '3513', lat: 43.95, lng: -77.09 },
  { id: 'northumberland', name: 'Northumberland', geoUid: '3514', lat: 44.12, lng: -77.87 },
  { id: 'peterborough', name: 'Peterborough', geoUid: '3515', lat: 44.31, lng: -78.32 },
  { id: 'kawartha-lakes', name: 'Kawartha Lakes', geoUid: '3516', lat: 44.53, lng: -78.73 },
  { id: 'durham', name: 'Durham', geoUid: '3518', lat: 43.94, lng: -78.86 },
  { id: 'york', name: 'York', geoUid: '3519', lat: 43.98, lng: -79.47 },
  { id: 'toronto', name: 'Toronto', geoUid: '3520', lat: 43.65, lng: -79.38 },
  { id: 'peel', name: 'Peel', geoUid: '3521', lat: 43.68, lng: -79.75 },
  { id: 'dufferin', name: 'Dufferin', geoUid: '3522', lat: 44.06, lng: -80.11 },
  { id: 'wellington', name: 'Wellington', geoUid: '3523', lat: 43.75, lng: -80.45 },
  { id: 'halton', name: 'Halton', geoUid: '3524', lat: 43.48, lng: -79.88 },
  { id: 'hamilton', name: 'Hamilton', geoUid: '3525', lat: 43.26, lng: -79.87 },
  { id: 'niagara', name: 'Niagara', geoUid: '3526', lat: 43.10, lng: -79.23 },
  { id: 'haldimand-norfolk', name: 'Haldimand-Norfolk', geoUid: '3528', lat: 42.88, lng: -80.17 },
  { id: 'brant', name: 'Brant', geoUid: '3529', lat: 43.14, lng: -80.27 },
  { id: 'waterloo', name: 'Waterloo', geoUid: '3530', lat: 43.45, lng: -80.49 },
  { id: 'perth', name: 'Perth', geoUid: '3531', lat: 43.58, lng: -81.00 },
  { id: 'oxford', name: 'Oxford', geoUid: '3532', lat: 43.10, lng: -80.73 },
  { id: 'elgin', name: 'Elgin', geoUid: '3534', lat: 42.72, lng: -81.08 },
  { id: 'chatham-kent', name: 'Chatham-Kent', geoUid: '3536', lat: 42.38, lng: -82.18 },
  { id: 'essex', name: 'Essex', geoUid: '3537', lat: 42.17, lng: -82.95 },
  { id: 'lambton', name: 'Lambton', geoUid: '3538', lat: 42.93, lng: -82.13 },
  { id: 'middlesex', name: 'Middlesex', geoUid: '3539', lat: 43.00, lng: -81.25 },
  { id: 'huron', name: 'Huron', geoUid: '3540', lat: 43.71, lng: -81.51 },
  { id: 'bruce', name: 'Bruce', geoUid: '3541', lat: 44.29, lng: -81.17 },
  { id: 'grey', name: 'Grey', geoUid: '3542', lat: 44.42, lng: -80.72 },
  { id: 'simcoe', name: 'Simcoe', geoUid: '3543', lat: 44.39, lng: -79.85 },
  { id: 'muskoka', name: 'Muskoka', geoUid: '3544', lat: 45.10, lng: -79.40 },
  { id: 'haliburton', name: 'Haliburton', geoUid: '3546', lat: 45.03, lng: -78.53 },
  { id: 'renfrew', name: 'Renfrew', geoUid: '3547', lat: 45.64, lng: -77.20 },
  { id: 'nipissing', name: 'Nipissing', geoUid: '3548', lat: 46.30, lng: -79.45 },
  { id: 'parry-sound', name: 'Parry Sound', geoUid: '3549', lat: 45.42, lng: -79.93 },
  { id: 'manitoulin', name: 'Manitoulin', geoUid: '3551', lat: 45.78, lng: -82.00 },
  { id: 'sudbury-district', name: 'Sudbury District', geoUid: '3552', lat: 46.80, lng: -81.50 },
  { id: 'greater-sudbury', name: 'Greater Sudbury', geoUid: '3553', lat: 46.49, lng: -80.99 },
  { id: 'timiskaming', name: 'Timiskaming', geoUid: '3554', lat: 47.52, lng: -79.68 },
  { id: 'cochrane', name: 'Cochrane', geoUid: '3556', lat: 49.07, lng: -81.02 },
  { id: 'algoma', name: 'Algoma', geoUid: '3557', lat: 46.52, lng: -84.35 },
  { id: 'thunder-bay', name: 'Thunder Bay', geoUid: '3558', lat: 48.38, lng: -89.25 },
  { id: 'rainy-river', name: 'Rainy River', geoUid: '3559', lat: 48.82, lng: -93.67 },
  { id: 'kenora', name: 'Kenora', geoUid: '3560', lat: 49.77, lng: -94.49 },
];

// Employer name -> region mapping
// Priority: exact match on city/region name in employer name
const EMPLOYER_REGION_RULES = [
  // === Ontario Government Ministries → toronto (HQ at Queen's Park) ===
  { pattern: /^solicitor general$/i, region: 'toronto' },
  { pattern: /^attorney general$/i, region: 'toronto' },
  { pattern: /^public and business service delivery$/i, region: 'toronto' },
  { pattern: /^children community and social services$/i, region: 'toronto' },
  { pattern: /^treasury board secretariat$/i, region: 'toronto' },
  { pattern: /^transportation$/i, region: 'toronto' },
  { pattern: /^health$/i, region: 'toronto' },
  { pattern: /^environment conservation and parks$/i, region: 'toronto' },
  { pattern: /^natural resources and forestry$/i, region: 'toronto' },
  { pattern: /^labour immigration training and skills development$/i, region: 'toronto' },
  { pattern: /^education$/i, region: 'toronto' },
  { pattern: /^finance$/i, region: 'toronto' },
  { pattern: /^agriculture food and rural affairs$/i, region: 'toronto' },
  { pattern: /^municipal property assessment corporation$/i, region: 'toronto' },
  { pattern: /^economic development job creation and trade$/i, region: 'toronto' },
  { pattern: /^long-term care$/i, region: 'toronto' },
  { pattern: /^legislative assembly$/i, region: 'toronto' },
  { pattern: /^municipal affairs and housing$/i, region: 'toronto' },
  { pattern: /^cabinet office$/i, region: 'toronto' },
  { pattern: /^infrastructure$/i, region: 'toronto' },
  { pattern: /^tourism culture and sport$/i, region: 'toronto' },
  { pattern: /^colleges and universities$/i, region: 'toronto' },
  { pattern: /^seniors and accessibility$/i, region: 'toronto' },
  { pattern: /^supply ontario$/i, region: 'toronto' },
  { pattern: /^indigenous affairs$/i, region: 'toronto' },
  { pattern: /^citizenship and multiculturalism$/i, region: 'toronto' },
  { pattern: /^northern development$/i, region: 'toronto' },
  { pattern: /^energy$/i, region: 'toronto' },
  { pattern: /^mines$/i, region: 'toronto' },
  { pattern: /^tribunals ontario$/i, region: 'toronto' },
  { pattern: /^information and privacy commissioner$/i, region: 'toronto' },
  { pattern: /^office of the auditor general$/i, region: 'toronto' },
  { pattern: /^ombudsman ontario$/i, region: 'toronto' },
  { pattern: /^education quality and accountability office$/i, region: 'toronto' },
  { pattern: /^office of the chief electoral officer$/i, region: 'toronto' },
  { pattern: /^office of the premier$/i, region: 'toronto' },
  { pattern: /^igaming ontario$/i, region: 'toronto' },
  { pattern: /^skilled trades ontario$/i, region: 'toronto' },
  { pattern: /^invest ontario$/i, region: 'toronto' },
  { pattern: /^matheson$/i, region: 'toronto' },
  { pattern: /^francophone affairs$/i, region: 'toronto' },
  { pattern: /^special investigations unit$/i, region: 'toronto' },
  { pattern: /^pay equity commission$/i, region: 'toronto' },
  { pattern: /^financial accountability officer$/i, region: 'toronto' },
  { pattern: /^consent and capacity board$/i, region: 'toronto' },
  { pattern: /^intellectual property ontario$/i, region: 'toronto' },
  { pattern: /^integrity commissioner$/i, region: 'toronto' },

  // === School Boards ===
  { pattern: /^thames valley district school board$/i, region: 'middlesex' },
  { pattern: /^york catholic district school board$/i, region: 'york' },
  { pattern: /^upper grand district school board$/i, region: 'wellington' },
  { pattern: /^upper canada district school board$/i, region: 'stormont-dundas-glengarry' },
  { pattern: /^grand erie district school board$/i, region: 'brant' },
  { pattern: /^lambton kent district school board$/i, region: 'lambton' },
  { pattern: /^limestone district school board$/i, region: 'frontenac' },
  { pattern: /^rainbow district school board$/i, region: 'greater-sudbury' },
  { pattern: /^bluewater district school board$/i, region: 'bruce' },
  { pattern: /^avon maitland district school board$/i, region: 'perth' },
  { pattern: /^trillium lakelands district school board$/i, region: 'kawartha-lakes' },
  { pattern: /^catholic district school board of eastern ontario$/i, region: 'lanark' },
  { pattern: /^algoma district school board$/i, region: 'algoma' },
  { pattern: /^near north district school board$/i, region: 'nipissing' },
  { pattern: /^algonquin and lakeshore catholic district school board$/i, region: 'hastings' },
  { pattern: /^wellington catholic district school board$/i, region: 'wellington' },
  { pattern: /^district school board ontario north east$/i, region: 'timiskaming' },
  { pattern: /^keewatin-patricia district school board$/i, region: 'kenora' },
  { pattern: /^rainy river district school board$/i, region: 'rainy-river' },
  { pattern: /^bruce-grey catholic district school board$/i, region: 'bruce' },
  { pattern: /^st\. clair catholic district school board$/i, region: 'essex' },
  { pattern: /^superior-greenstone district school board$/i, region: 'thunder-bay' },
  { pattern: /^northeastern catholic district school board$/i, region: 'cochrane' },
  { pattern: /^northwest catholic district school board$/i, region: 'kenora' },
  { pattern: /^superior north catholic district school board$/i, region: 'thunder-bay' },

  // === French School Boards ===
  { pattern: /^conseil des écoles catholiques du centre est$/i, region: 'ottawa' },
  { pattern: /^conseil scolaire catholique monavenir$/i, region: 'toronto' },
  { pattern: /^conseil des écoles publiques de l'est de l'ontario$/i, region: 'ottawa' },
  { pattern: /^conseil scolaire viamonde$/i, region: 'toronto' },
  { pattern: /^conseil scolaire de district catholique de l'est ontarien$/i, region: 'prescott-russell' },
  { pattern: /^conseil scolaire catholique providence$/i, region: 'essex' },
  { pattern: /^conseil scolaire de district catholique du nouvel-ontario$/i, region: 'greater-sudbury' },
  { pattern: /^conseil scolaire catholique des grandes rivières$/i, region: 'cochrane' },
  { pattern: /^conseil scolaire public du grand nord de l'ontario$/i, region: 'greater-sudbury' },
  { pattern: /^conseil scolaire catholique franco-nord$/i, region: 'nipissing' },
  { pattern: /^conseil scolaire public du nord-est de l'ontario$/i, region: 'timiskaming' },
  { pattern: /^conseil scolaire catholique des aurores boréales$/i, region: 'thunder-bay' },

  // === Hospitals ===
  { pattern: /^the hospital for sick children$/i, region: 'toronto' },
  { pattern: /^scarborough health network$/i, region: 'toronto' },
  { pattern: /^sinai health system$/i, region: 'toronto' },
  { pattern: /^centre for addiction and mental health$/i, region: 'toronto' },
  { pattern: /^north york general hospital$/i, region: 'toronto' },
  { pattern: /^oak valley health$/i, region: 'york' },
  { pattern: /^michael garron hospital$/i, region: 'toronto' },
  { pattern: /^st\. mary's general hospital$/i, region: 'waterloo' },
  { pattern: /^bluewater health$/i, region: 'lambton' },
  { pattern: /^brightshores health system$/i, region: 'grey' },
  { pattern: /^sault area hospital$/i, region: 'algoma' },
  { pattern: /^waypoint centre for mental health care$/i, region: 'simcoe' },
  { pattern: /^st\. joseph's care group$/i, region: 'thunder-bay' },
  { pattern: /^providence care centre$/i, region: 'frontenac' },
  { pattern: /^baycrest hospital$/i, region: 'toronto' },
  { pattern: /^holland bloorview kids rehabilitation hospital$/i, region: 'toronto' },
  { pattern: /^brant community healthcare system$/i, region: 'brant' },
  { pattern: /^hôpital montfort$/i, region: 'ottawa' },
  { pattern: /^hôtel-dieu grace healthcare$/i, region: 'essex' },
  { pattern: /^ross memorial hospital$/i, region: 'kawartha-lakes' },
  { pattern: /^georgian bay general hospital$/i, region: 'simcoe' },
  { pattern: /^northumberland hills hospital$/i, region: 'northumberland' },
  { pattern: /^headwater health care centre$/i, region: 'dufferin' },
  { pattern: /^west park healthcare centre$/i, region: 'toronto' },
  { pattern: /^perth and smiths falls district hospital$/i, region: 'lanark' },
  { pattern: /^erie shores healthcare$/i, region: 'essex' },
  { pattern: /^st\. joseph's general hospital$/i, region: 'thunder-bay' },

  // === Regional/County Governments ===
  { pattern: /^regional municipality of york police services$/i, region: 'york' },
  { pattern: /^regional municipality of york$/i, region: 'york' },
  { pattern: /^county of simcoe$/i, region: 'simcoe' },
  { pattern: /^county of essex$/i, region: 'essex' },
  { pattern: /^county of lambton$/i, region: 'lambton' },
  { pattern: /^county of oxford$/i, region: 'oxford' },
  { pattern: /^county of hastings$/i, region: 'hastings' },
  { pattern: /^county of frontenac$/i, region: 'frontenac' },
  { pattern: /^county of grey$/i, region: 'grey' },
  { pattern: /^county of northumberland$/i, region: 'northumberland' },
  { pattern: /^county of brant$/i, region: 'brant' },
  { pattern: /^county of wellington$/i, region: 'wellington' },
  { pattern: /^county of bruce$/i, region: 'bruce' },
  { pattern: /^county of middlesex$/i, region: 'middlesex' },
  { pattern: /^county of perth$/i, region: 'perth' },
  { pattern: /^county of elgin$/i, region: 'elgin' },

  // === Other Organizations ===
  { pattern: /^canadian institute for health info$/i, region: 'toronto' },
  { pattern: /^eastern ontario regional laboratory association \(eorla\)$/i, region: 'ottawa' },
  { pattern: /^university of western ontario$/i, region: 'middlesex' },
  { pattern: /^greater essex county district school board$/i, region: 'essex' },
  { pattern: /^king's university college$/i, region: 'middlesex' },
  { pattern: /^st lawrence college$/i, region: 'frontenac' },
  { pattern: /^la cité collegiale$/i, region: 'ottawa' },
  { pattern: /^collège boréal$/i, region: 'greater-sudbury' },
  { pattern: /^city of st catharines$/i, region: 'niagara' },
  { pattern: /^northern ontario school of medicine$/i, region: 'greater-sudbury' },
  { pattern: /^town of whitby$/i, region: 'durham' },
  { pattern: /^city of pickering$/i, region: 'durham' },
  { pattern: /^town of ajax$/i, region: 'durham' },
  { pattern: /^municipality of clarington$/i, region: 'durham' },
  { pattern: /^town of caledon$/i, region: 'peel' },
  { pattern: /^town of georgina$/i, region: 'york' },
  { pattern: /^town of whitchurch-stouffville$/i, region: 'york' },
  { pattern: /^town of east gwillimbury$/i, region: 'york' },
  { pattern: /^town of newmarket$/i, region: 'york' },
  { pattern: /^town of bradford west gwillimbury$/i, region: 'york' },
  { pattern: /^township of king$/i, region: 'york' },
  { pattern: /^town of innisfil$/i, region: 'simcoe' },
  { pattern: /^town of new tecumseth$/i, region: 'simcoe' },
  { pattern: /^town of wasaga beach$/i, region: 'simcoe' },
  { pattern: /^town of midland$/i, region: 'simcoe' },
  { pattern: /^town of lasalle$/i, region: 'essex' },
  { pattern: /^town of amherstburg$/i, region: 'essex' },
  { pattern: /^town of lakeshore$/i, region: 'essex' },
  { pattern: /^town of tecumseh$/i, region: 'essex' },
  { pattern: /^town of essex$/i, region: 'essex' },
  { pattern: /^town of kingsville$/i, region: 'essex' },
  { pattern: /^municipality of leamington$/i, region: 'essex' },
  { pattern: /^south simcoe police service$/i, region: 'simcoe' },
  { pattern: /^city of clarence-rockland$/i, region: 'prescott-russell' },
  { pattern: /^town of fort erie$/i, region: 'niagara' },
  { pattern: /^city of thorold$/i, region: 'niagara' },
  { pattern: /^city of port colborne$/i, region: 'niagara' },
  { pattern: /^town of pelham$/i, region: 'niagara' },
  { pattern: /^town of lincoln$/i, region: 'niagara' },
  { pattern: /^town of grimsby$/i, region: 'niagara' },
  { pattern: /^bruyère continuing care$/i, region: 'ottawa' },
  { pattern: /^mars discovery district$/i, region: 'toronto' },
  { pattern: /^ices$/i, region: 'toronto' },
  { pattern: /^royal ontario museum$/i, region: 'toronto' },
  { pattern: /^art gallery of ontario$/i, region: 'toronto' },
  { pattern: /^victoria university$/i, region: 'toronto' },
  { pattern: /^salvation army \(governing council\)$/i, region: 'toronto' },
  { pattern: /^perimeter institute$/i, region: 'waterloo' },
  { pattern: /^science north$/i, region: 'greater-sudbury' },

  // Province-wide organizations -> Toronto (HQ)
  { pattern: /^ontario\b/i, region: 'toronto' },
  { pattern: /^province of ontario/i, region: 'toronto' },
  { pattern: /hydro one/i, region: 'toronto' },
  { pattern: /metrolinx/i, region: 'toronto' },
  { pattern: /ehealth ontario/i, region: 'toronto' },
  { pattern: /ontario power generation/i, region: 'toronto' },
  { pattern: /workplace safety/i, region: 'toronto' },
  { pattern: /independent electricity/i, region: 'toronto' },
  { pattern: /financial services regulatory/i, region: 'toronto' },
  { pattern: /alcohol and gaming/i, region: 'toronto' },
  { pattern: /liquor control board/i, region: 'toronto' },
  { pattern: /ontario securities/i, region: 'toronto' },
  { pattern: /ontario energy board/i, region: 'toronto' },
  { pattern: /infrastructure ontario/i, region: 'toronto' },
  { pattern: /ontario lottery/i, region: 'toronto' },
  { pattern: /legal aid ontario/i, region: 'toronto' },
  { pattern: /ontario health/i, region: 'toronto' },
  { pattern: /ontario clean water/i, region: 'toronto' },
  { pattern: /ontario racing/i, region: 'toronto' },
  { pattern: /ornge/i, region: 'toronto' },
  { pattern: /ontario northland/i, region: 'nipissing' },

  // Specific city/region matches
  { pattern: /\btoronto\b/i, region: 'toronto' },
  { pattern: /\bottawa\b/i, region: 'ottawa' },
  { pattern: /\bhamilton\b/i, region: 'hamilton' },
  { pattern: /\blondon\b/i, region: 'middlesex' },
  { pattern: /\bwindsor\b/i, region: 'essex' },
  { pattern: /\bkingston\b/i, region: 'frontenac' },
  { pattern: /\bkitchener\b/i, region: 'waterloo' },
  { pattern: /\bwaterloo\b/i, region: 'waterloo' },
  { pattern: /\bguelph\b/i, region: 'wellington' },
  { pattern: /\bthunder bay\b/i, region: 'thunder-bay' },
  { pattern: /\bsudbury\b/i, region: 'greater-sudbury' },
  { pattern: /\bbarrie\b/i, region: 'simcoe' },
  { pattern: /\bsimcoe county\b/i, region: 'simcoe' },
  { pattern: /\bniagara\b/i, region: 'niagara' },
  { pattern: /\bst\. catharines\b/i, region: 'niagara' },
  { pattern: /\bwelland\b/i, region: 'niagara' },
  { pattern: /\bbrantford\b/i, region: 'brant' },
  { pattern: /\bpeterborough\b/i, region: 'peterborough' },
  { pattern: /\bbelleville\b/i, region: 'hastings' },
  { pattern: /\bquinte\b/i, region: 'hastings' },
  { pattern: /\bcornwall\b/i, region: 'stormont-dundas-glengarry' },
  { pattern: /\bbrockville\b/i, region: 'leeds-grenville' },
  { pattern: /\bchatham\b/i, region: 'chatham-kent' },
  { pattern: /\bsarnia\b/i, region: 'lambton' },
  { pattern: /\bsault ste/i, region: 'algoma' },
  { pattern: /\bnorth bay\b/i, region: 'nipissing' },
  { pattern: /\btimmins\b/i, region: 'cochrane' },
  { pattern: /\bkenora\b/i, region: 'kenora' },
  { pattern: /\bdryden\b/i, region: 'kenora' },
  { pattern: /\bfort frances\b/i, region: 'rainy-river' },
  { pattern: /\boshawa\b/i, region: 'durham' },
  { pattern: /\bdurham\b/i, region: 'durham' },
  { pattern: /\bmississauga\b/i, region: 'peel' },
  { pattern: /\bbrampton\b/i, region: 'peel' },
  { pattern: /\bpeel\b/i, region: 'peel' },
  { pattern: /\byork region\b/i, region: 'york' },
  { pattern: /\bmarkham\b/i, region: 'york' },
  { pattern: /\bvaughan\b/i, region: 'york' },
  { pattern: /\brichmond hill\b/i, region: 'york' },
  { pattern: /\bnewmarket\b/i, region: 'york' },
  { pattern: /\baurora\b/i, region: 'york' },
  { pattern: /\boakville\b/i, region: 'halton' },
  { pattern: /\bburlington\b/i, region: 'halton' },
  { pattern: /\bhalton\b/i, region: 'halton' },
  { pattern: /\bmilton\b/i, region: 'halton' },
  { pattern: /\bcambridge\b/i, region: 'waterloo' },
  { pattern: /\bstratford\b/i, region: 'perth' },
  { pattern: /\bwoodstock\b/i, region: 'oxford' },
  { pattern: /\bst\. thomas\b/i, region: 'elgin' },
  { pattern: /\bowen sound\b/i, region: 'grey' },
  { pattern: /\bcollingwood\b/i, region: 'simcoe' },
  { pattern: /\borillia\b/i, region: 'simcoe' },
  { pattern: /\bcobourg\b/i, region: 'northumberland' },
  { pattern: /\bport hope\b/i, region: 'northumberland' },
  { pattern: /\blindsay\b/i, region: 'kawartha-lakes' },
  { pattern: /\bkawartha\b/i, region: 'kawartha-lakes' },
  { pattern: /\bpembroke\b/i, region: 'renfrew' },
  { pattern: /\brenfrew\b/i, region: 'renfrew' },
  { pattern: /\bparry sound\b/i, region: 'parry-sound' },
  { pattern: /\bhuntsville\b/i, region: 'muskoka' },
  { pattern: /\bmuskoka\b/i, region: 'muskoka' },
  { pattern: /\bbruce county\b/i, region: 'bruce' },
  { pattern: /\bbruce power\b/i, region: 'bruce' },
  { pattern: /\bwalkerton\b/i, region: 'bruce' },
  { pattern: /\bgrey county\b/i, region: 'grey' },
  { pattern: /\bhuron\b/i, region: 'huron' },
  { pattern: /\bperth county\b/i, region: 'perth' },
  { pattern: /\bnorfolk\b/i, region: 'haldimand-norfolk' },
  { pattern: /\bhaldimand\b/i, region: 'haldimand-norfolk' },
  { pattern: /\bdufferin\b/i, region: 'dufferin' },
  { pattern: /\borangeville\b/i, region: 'dufferin' },
  { pattern: /\bcochrane\b/i, region: 'cochrane' },
  { pattern: /\bkapuskasing\b/i, region: 'cochrane' },
  { pattern: /\bhearst\b/i, region: 'cochrane' },
  { pattern: /\bkirkland lake\b/i, region: 'timiskaming' },
  { pattern: /\btimiskaming\b/i, region: 'timiskaming' },
  { pattern: /\bmanitoulin\b/i, region: 'manitoulin' },
  { pattern: /\bespanola\b/i, region: 'sudbury-district' },
  { pattern: /\bprince edward\b/i, region: 'prince-edward' },
  { pattern: /\bpicton\b/i, region: 'prince-edward' },
  { pattern: /\blennox\b/i, region: 'lennox-addington' },
  { pattern: /\bnapanee\b/i, region: 'lennox-addington' },
  { pattern: /\blanark\b/i, region: 'lanark' },
  { pattern: /\bsmith falls\b/i, region: 'lanark' },
  { pattern: /\bprescott\b/i, region: 'prescott-russell' },
  { pattern: /\brussell\b/i, region: 'prescott-russell' },
  { pattern: /\bhawkesbury\b/i, region: 'prescott-russell' },
  { pattern: /\bhaliburton\b/i, region: 'haliburton' },

  // University-specific
  { pattern: /\bqueen'?s university\b/i, region: 'frontenac' },
  { pattern: /\buniversity of guelph\b/i, region: 'wellington' },
  { pattern: /\bmcmaster\b/i, region: 'hamilton' },
  { pattern: /\bwestern university\b/i, region: 'middlesex' },
  { pattern: /\blakehead\b/i, region: 'thunder-bay' },
  { pattern: /\blaurentian\b/i, region: 'greater-sudbury' },
  { pattern: /\bnipissing university\b/i, region: 'nipissing' },
  { pattern: /\balgoma university\b/i, region: 'algoma' },
  { pattern: /\btrent university\b/i, region: 'peterborough' },
  { pattern: /\bbrock university\b/i, region: 'niagara' },
  { pattern: /\bwilfrid laurier\b/i, region: 'waterloo' },
  { pattern: /\byork university\b/i, region: 'toronto' },
  { pattern: /\bryerson\b/i, region: 'toronto' },
  { pattern: /\btoronto metropolitan/i, region: 'toronto' },
  { pattern: /\bocad/i, region: 'toronto' },
  { pattern: /\buniversity of windsor\b/i, region: 'essex' },
  { pattern: /\bcarleton\b/i, region: 'ottawa' },
  { pattern: /\bontario tech\b/i, region: 'durham' },
  { pattern: /\buoit\b/i, region: 'durham' },

  // Hospital-specific
  { pattern: /\bsunnybrook\b/i, region: 'toronto' },
  { pattern: /\bmount sinai\b/i, region: 'toronto' },
  { pattern: /\bsick kids\b|sickkids/i, region: 'toronto' },
  { pattern: /\bwomen'?s college\b/i, region: 'toronto' },
  { pattern: /\bst\. michael/i, region: 'toronto' },
  { pattern: /\buniversity health network/i, region: 'toronto' },
  { pattern: /\bhumber river/i, region: 'toronto' },
  { pattern: /\bjoseph brant/i, region: 'halton' },
  { pattern: /\bgrand river hospital/i, region: 'waterloo' },
  { pattern: /\broyal victoria/i, region: 'hastings' },
  { pattern: /\blakeridge/i, region: 'durham' },
  { pattern: /\btrillium health/i, region: 'peel' },
  { pattern: /\bwilliam osler/i, region: 'peel' },
  { pattern: /\bmackenzie health/i, region: 'york' },
  { pattern: /\bsouthlake/i, region: 'york' },
  { pattern: /\bhealth sciences north/i, region: 'greater-sudbury' },
  { pattern: /\bkingston health/i, region: 'frontenac' },
  { pattern: /\bhotel dieu/i, region: 'frontenac' },

  // College-specific
  { pattern: /\bgeorgian college\b/i, region: 'simcoe' },
  { pattern: /\bfanshawe\b/i, region: 'middlesex' },
  { pattern: /\bcentennial college\b/i, region: 'toronto' },
  { pattern: /\bseneca\b/i, region: 'toronto' },
  { pattern: /\bhumber college\b|humber institute/i, region: 'toronto' },
  { pattern: /\bgeorge brown\b/i, region: 'toronto' },
  { pattern: /\bsheridan\b/i, region: 'halton' },
  { pattern: /\bmohawk college\b/i, region: 'hamilton' },
  { pattern: /\bconestoga college\b/i, region: 'waterloo' },
  { pattern: /\bnorthern college\b/i, region: 'cochrane' },
  { pattern: /\bcambrian college\b/i, region: 'greater-sudbury' },
  { pattern: /\bconfederation college\b/i, region: 'thunder-bay' },
  { pattern: /\bcanadore\b/i, region: 'nipissing' },
  { pattern: /\balgonquin college\b/i, region: 'ottawa' },
  { pattern: /\bst\. lawrence college\b/i, region: 'frontenac' },
  { pattern: /\bst\. clair college\b/i, region: 'essex' },
  { pattern: /\blambton college\b/i, region: 'lambton' },
  { pattern: /\bfleming college\b|sir sandford fleming/i, region: 'peterborough' },
  { pattern: /\bloyal.?ist college\b/i, region: 'hastings' },
  { pattern: /\bdurham college\b/i, region: 'durham' },
  { pattern: /\bniagara college\b/i, region: 'niagara' },
  { pattern: /\bsault college\b/i, region: 'algoma' },
  { pattern: /\bboreal/i, region: 'greater-sudbury' },
  { pattern: /\bla cite/i, region: 'ottawa' },
];

function matchEmployerToRegion(employerName) {
  for (const rule of EMPLOYER_REGION_RULES) {
    if (rule.pattern.test(employerName)) {
      return rule.region;
    }
  }
  return null;
}

async function main() {
  console.log('=== POPULATING REGIONS ===\n');

  // Step 1: Get all employers
  console.log('Step 1: Fetching all employers...');
  const { data: employers, error: empErr } = await supabase
    .from('employers')
    .select('id, name, sector, region_id')
    .order('headcount', { ascending: false });
  if (empErr) { console.error('Error:', empErr.message); return; }
  console.log(`  Found ${employers.length} employers\n`);

  // Step 2: Map each employer to a region
  console.log('Step 2: Mapping employers to regions...');
  let mapped = 0, unmapped = 0;
  const unmappedList = [];
  const employerRegionMap = new Map(); // employer_id -> region_id

  for (const emp of employers) {
    const regionId = matchEmployerToRegion(emp.name);
    if (regionId) {
      employerRegionMap.set(emp.id, regionId);
      mapped++;
    } else {
      unmapped++;
      unmappedList.push(emp.name);
    }
  }
  console.log(`  Mapped: ${mapped}, Unmapped: ${unmapped}`);
  if (unmappedList.length > 0 && unmappedList.length <= 50) {
    console.log('  Unmapped employers:');
    unmappedList.forEach(n => console.log(`    - ${n}`));
  } else if (unmappedList.length > 50) {
    console.log(`  First 50 unmapped employers:`);
    unmappedList.slice(0, 50).forEach(n => console.log(`    - ${n}`));
  }

  // Step 3: Update employers table with region_id
  console.log('\nStep 3: Updating employers with region_id...');
  let updatedEmps = 0;
  for (const [empId, regionId] of employerRegionMap) {
    const region = REGIONS.find(r => r.id === regionId);
    const { error } = await supabase
      .from('employers')
      .update({ region_id: regionId })
      .eq('id', empId);
    if (!error) updatedEmps++;
  }
  console.log(`  Updated ${updatedEmps} employers\n`);

  // Step 4: Aggregate salary data per region from disclosures
  console.log('Step 4: Aggregating salary data per region...');

  // Clear existing regions
  await supabase.from('regions').delete().neq('region_id', '---impossible---');

  const regionRows = [];
  for (const region of REGIONS) {
    // Find all employer_ids mapped to this region
    const empIdsForRegion = [];
    for (const [empId, regId] of employerRegionMap) {
      if (regId === region.id) empIdsForRegion.push(empId);
    }

    if (empIdsForRegion.length === 0) continue;

    // Get total employee count for this region
    let totalCount = 0;
    let allSalaries = [];

    // Query in batches of employer_ids (Supabase .in() has limits)
    for (let i = 0; i < empIdsForRegion.length; i += 50) {
      const batch = empIdsForRegion.slice(i, i + 50);
      const { count } = await supabase
        .from('disclosures')
        .select('*', { count: 'exact', head: true })
        .in('employer_id', batch)
        .eq('year', 2025);
      totalCount += count || 0;
    }

    // Get salary sample for median calculation (use employers table medians as proxy)
    // More accurate: get actual salaries from disclosures for 2024
    for (let i = 0; i < empIdsForRegion.length; i += 50) {
      const batch = empIdsForRegion.slice(i, i + 50);
      // Get a sample of salaries
      const { data: salData } = await supabase
        .from('disclosures')
        .select('salary_paid')
        .in('employer_id', batch)
        .eq('year', 2025)
        .order('salary_paid', { ascending: true })
        .limit(1000);
      if (salData) allSalaries.push(...salData.map(d => d.salary_paid));
    }

    if (totalCount === 0) continue;

    // Calculate median
    allSalaries.sort((a, b) => a - b);
    let medianSalary;
    if (allSalaries.length > 0) {
      const mid = Math.floor(allSalaries.length / 2);
      medianSalary = allSalaries.length % 2 === 0
        ? (allSalaries[mid - 1] + allSalaries[mid]) / 2
        : allSalaries[mid];
    } else {
      medianSalary = 0;
    }

    regionRows.push({
      region_id: region.geoUid,
      name: region.name,
      median_salary: Math.round(medianSalary),
      employee_count: totalCount,
      lat: region.lat,
      lng: region.lng,
    });

    console.log(`  ${region.name}: ${totalCount.toLocaleString()} employees, median $${Math.round(medianSalary).toLocaleString()}`);
  }

  // Step 5: Insert into regions table
  console.log(`\nStep 5: Inserting ${regionRows.length} regions...`);
  for (const row of regionRows) {
    const { error } = await supabase.from('regions').upsert(row, { onConflict: 'region_id' });
    if (error) console.error(`  Error for ${row.name}:`, error.message);
  }

  // Step 6: Update disclosures with region info
  console.log('\nStep 6: Updating disclosures with region_id (batch by employer)...');
  let discUpdated = 0;
  let batchCount = 0;
  for (const [empId, regionId] of employerRegionMap) {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region) continue;

    const { error, count } = await supabase
      .from('disclosures')
      .update({ region_id: region.geoUid, region_name: region.name })
      .eq('employer_id', empId);

    if (!error) discUpdated++;
    batchCount++;
    if (batchCount % 200 === 0) console.log(`  Progress: ${batchCount}/${employerRegionMap.size} employers...`);
  }
  console.log(`  Updated disclosures for ${discUpdated} employers\n`);

  // Final counts
  console.log('=== FINAL COUNTS ===');
  const { count: regCount } = await supabase.from('regions').select('*', { count: 'exact', head: true });
  const { count: discWithRegion } = await supabase.from('disclosures').select('*', { count: 'exact', head: true }).neq('region_id', null);
  const { count: totalDisc } = await supabase.from('disclosures').select('*', { count: 'exact', head: true });
  console.log(`  Regions: ${regCount}`);
  console.log(`  Disclosures with region: ${discWithRegion?.toLocaleString()} / ${totalDisc?.toLocaleString()}`);
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
