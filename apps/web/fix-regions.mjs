/**
 * Fix region mapping for Pay Lens Supabase database.
 *
 * Strategy:
 * 1. Update employers table with region_id based on name patterns (~2800 rows)
 * 2. Normalize any slug-based region_ids to geoUid format
 * 3. Propagate region_id from employers to disclosures (batched by year+sector)
 * 4. Standardize sector names
 * 5. Rebuild sectors + regions tables
 *
 * Uses Supabase Management API with retry logic and rate-limit backoff.
 * Run with: node fix-regions.mjs
 *
 * Completed 2026-03-28: Coverage improved from ~32% to ~95% across all years.
 */

const API_URL = 'https://api.supabase.com/v1/projects/jmuitsmxtoqjeogidstj/database/query';
const API_KEY = 'sbp_9def4122934cad20f407436a9d25802f9374a0ee';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSQL(sql, label, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let res;
    try {
      const start = Date.now();
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (res.status === 429) {
        const wait = attempt * 15000;
        console.log(`  RATE LIMITED [attempt ${attempt}] ${label || ''} — waiting ${wait/1000}s...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        if (text.includes('statement timeout') && attempt < retries) {
          console.log(`  TIMEOUT [attempt ${attempt}] ${label}`);
          await sleep(5000);
          continue;
        }
        console.error(`  FAIL [${elapsed}s] ${label}: ${text.substring(0, 200)}`);
        return null;
      }
      const data = await res.json();
      if (label) console.log(`  OK   [${elapsed}s] ${label}`);
      await sleep(2000);
      return data;
    } catch (e) {
      console.log(`  NETWORK ERROR [attempt ${attempt}] ${label}: ${e.message}`);
      await sleep(10000);
      continue;
    }
  }
  console.error(`  GAVE UP: ${label}`);
  return null;
}

// ══════════════════════════════════════════════════════════════════
// Reference data
// ══════════════════════════════════════════════════════════════════

const REGION_NAMES = {
  '3501': 'Stormont, Dundas and Glengarry', '3502': 'Prescott and Russell',
  '3506': 'Ottawa', '3507': 'Leeds and Grenville', '3509': 'Lanark',
  '3510': 'Frontenac', '3511': 'Lennox and Addington', '3512': 'Hastings',
  '3513': 'Prince Edward', '3514': 'Northumberland', '3515': 'Peterborough',
  '3516': 'Kawartha Lakes', '3518': 'Durham', '3519': 'York',
  '3520': 'Toronto', '3521': 'Peel', '3522': 'Dufferin',
  '3523': 'Wellington', '3524': 'Halton', '3525': 'Hamilton',
  '3526': 'Niagara', '3528': 'Haldimand-Norfolk', '3529': 'Brant',
  '3530': 'Waterloo', '3531': 'Perth', '3532': 'Oxford',
  '3534': 'Elgin', '3536': 'Chatham-Kent', '3537': 'Essex',
  '3538': 'Lambton', '3539': 'Middlesex', '3540': 'Huron',
  '3541': 'Bruce', '3542': 'Grey', '3543': 'Simcoe',
  '3544': 'Muskoka', '3546': 'Haliburton', '3547': 'Renfrew',
  '3548': 'Nipissing', '3549': 'Parry Sound', '3551': 'Manitoulin',
  '3552': 'Sudbury District', '3553': 'Greater Sudbury', '3554': 'Timiskaming',
  '3556': 'Cochrane', '3557': 'Algoma', '3558': 'Thunder Bay',
  '3559': 'Rainy River', '3560': 'Kenora',
};

const REGION_COORDS = {
  '3501': [45.03, -74.99], '3502': [45.38, -74.63], '3506': [45.42, -75.69],
  '3507': [44.62, -75.85], '3509': [44.97, -76.45], '3510': [44.38, -76.57],
  '3511': [44.47, -77.05], '3512': [44.51, -77.57], '3513': [43.95, -77.09],
  '3514': [44.12, -77.87], '3515': [44.31, -78.32], '3516': [44.53, -78.73],
  '3518': [43.94, -78.86], '3519': [43.98, -79.47], '3520': [43.65, -79.38],
  '3521': [43.68, -79.75], '3522': [44.06, -80.11], '3523': [43.75, -80.45],
  '3524': [43.48, -79.88], '3525': [43.26, -79.87], '3526': [43.10, -79.23],
  '3528': [42.88, -80.17], '3529': [43.14, -80.27], '3530': [43.45, -80.49],
  '3531': [43.58, -81.00], '3532': [43.10, -80.73], '3534': [42.72, -81.08],
  '3536': [42.38, -82.18], '3537': [42.17, -82.95], '3538': [42.93, -82.13],
  '3539': [43.00, -81.25], '3540': [43.71, -81.51], '3541': [44.29, -81.17],
  '3542': [44.42, -80.72], '3543': [44.39, -79.85], '3544': [45.05, -79.30],
  '3546': [45.05, -78.53], '3547': [45.47, -77.10], '3548': [46.31, -79.46],
  '3549': [45.34, -79.94], '3551': [45.72, -81.98], '3552': [46.62, -81.00],
  '3553': [46.49, -81.00], '3554': [47.52, -79.87], '3556': [49.07, -81.02],
  '3557': [46.53, -83.52], '3558': [48.38, -89.25], '3559': [48.72, -93.57],
  '3560': [51.00, -90.00],
};

const SLUG_TO_GEO = {
  'stormont-dundas-glengarry': '3501', 'prescott-russell': '3502',
  'ottawa': '3506', 'leeds-grenville': '3507', 'lanark': '3509',
  'frontenac': '3510', 'lennox-addington': '3511', 'hastings': '3512',
  'prince-edward': '3513', 'northumberland': '3514', 'peterborough': '3515',
  'kawartha-lakes': '3516', 'durham': '3518', 'york': '3519',
  'toronto': '3520', 'peel': '3521', 'dufferin': '3522',
  'wellington': '3523', 'halton': '3524', 'hamilton': '3525',
  'niagara': '3526', 'haldimand-norfolk': '3528', 'brant': '3529',
  'waterloo': '3530', 'perth': '3531', 'oxford': '3532',
  'elgin': '3534', 'chatham-kent': '3536', 'essex': '3537',
  'lambton': '3538', 'middlesex': '3539', 'huron': '3540',
  'bruce': '3541', 'grey': '3542', 'simcoe': '3543',
  'muskoka': '3544', 'haliburton': '3546', 'renfrew': '3547',
  'nipissing': '3548', 'parry-sound': '3549', 'manitoulin': '3551',
  'sudbury-district': '3552', 'greater-sudbury': '3553', 'timiskaming': '3554',
  'cochrane': '3556', 'algoma': '3557', 'thunder-bay': '3558',
  'rainy-river': '3559', 'kenora': '3560',
};

// Employer name patterns grouped by region geoUid
const EMPLOYER_REGION_MAP = {
  '3520': [ // Toronto
    'City Of Toronto%', '%Toronto District School Board%', '%Toronto Catholic District School Board%',
    'University Of Toronto%', 'University Health Network%', 'Sunnybrook Health Sciences%',
    'York University%', 'Unity Health Toronto%', 'Ontario Power Generation%',
    'Ontario Provincial Police%', 'Metrolinx%', 'Solicitor General%', 'Attorney General%',
    'Public and Business Service%', 'Hydro One%', 'Municipal Property Assessment%',
    'Legislative Assembly%', 'Children, Community and Social Services%',
    'Environment, Conservation and Parks%', 'Labour, Immigration, Training and Skills Development%',
    'Natural Resources%', 'Economic Development%', 'Treasury Board%', 'Ministry of %',
    'Ontario Securities Commission%', 'Workplace Safety%', 'Infrastructure Ontario%',
    'Ontario Lottery%', 'Liquor Control Board%', 'LCBO%',
    'Independent Electricity System Operator%', 'Electrical Safety Authority%',
    'Ontario Energy Board%', 'Ontario Health%', 'Cancer Care Ontario%',
    'Centre for Addiction and Mental Health%', 'CAMH%', 'Sinai Health%',
    'Toronto Police%', 'Ryerson University%', 'Toronto Metropolitan University%',
    'George Brown College%', 'Seneca College%', 'Humber College%', 'Centennial College%',
    'Ontario College of Art%', 'Toronto Transit Commission%', 'TTC%',
    'Sick Kids%', 'SickKids%', 'Hospital for Sick Children%',
    'St. Michael%Hospital%', "Women%s College Hospital%", 'Michael Garron Hospital%',
    'North York General Hospital%', 'Scarborough Health Network%', 'Humber River Hospital%',
    'Baycrest%', 'Toronto East Health%',
  ],
  '3506': ['City Of Ottawa%', 'Ottawa-Carleton District School Board%', 'Ottawa Catholic School Board%',
    'The Ottawa Hospital%', 'University Of Ottawa%', 'Carleton University%',
    'Algonquin College%', 'Ottawa Police%', "Children%s Hospital of Eastern Ontario%",
    'CHEO%', 'Royal Ottawa%', 'Queensway Carleton Hospital%', 'Montfort Hospital%', 'Bruyere%'],
  '3525': ['City Of Hamilton%', 'Hamilton Health Sciences%', 'Hamilton-Wentworth District School Board%',
    'Hamilton-Wentworth Catholic%', 'McMaster University%', 'Mohawk College%',
    "St. Joseph%s Healthcare Hamilton%", 'Hamilton Police%'],
  '3521': ['City Of Mississauga%', 'City Of Brampton%', 'Regional Municipality Of Peel%',
    'Peel District School Board%', 'Dufferin-Peel Catholic%', 'Trillium Health Partners%',
    'William Osler Health%', 'Peel Regional Police%', 'Sheridan College%'],
  '3518': ['Regional Municipality Of Durham%', 'Durham District School Board%',
    'Durham Catholic District School Board%', 'Durham Regional Police%',
    'Lakeridge Health%', 'Ontario Tech University%', 'University Of Ontario Institute%', 'Durham College%'],
  '3519': ['Regional Municipality Of York%', 'York Region District School Board%',
    'York Catholic District School Board%', 'York Regional Police%',
    'Mackenzie Health%', 'Southlake Regional Health%', 'Markham Stouffville Hospital%', 'Seneca%Polytechnic%'],
  '3524': ['Halton District School Board%', 'Halton Catholic District School Board%',
    'Regional Municipality Of Halton%', 'Halton Healthcare%', 'Halton Regional Police%', 'Joseph Brant Hospital%'],
  '3530': ['Waterloo Region District School Board%', 'Waterloo Catholic District School Board%',
    'Regional Municipality Of Waterloo%', 'University Of Waterloo%', 'Wilfrid Laurier University%',
    'Conestoga College%', 'Grand River Hospital%', "St. Mary%s General Hospital%",
    'Waterloo Regional Police%', 'City Of Kitchener%', 'City Of Cambridge%'],
  '3543': ['Simcoe County District School Board%', 'Simcoe Muskoka Catholic%',
    'County Of Simcoe%', 'City Of Barrie%', 'Royal Victoria Regional Health%', 'Georgian College%'],
  '3539': ['Thames Valley District School Board%', 'London Health Sciences%', 'City Of London%',
    'Western University%', 'Fanshawe College%', 'London Police%',
    "St. Joseph%s Health Care London%", 'Middlesex-London%'],
  '3526': ['District School Board Of Niagara%', 'Niagara Catholic District School Board%',
    'Regional Municipality Of Niagara%', 'Niagara Health%', 'Niagara College%',
    'Brock University%', 'Niagara Regional Police%', 'Niagara Parks Commission%',
    'City Of St. Catharines%', 'City Of Niagara Falls%'],
  '3523': ['University Of Guelph%', 'Upper Grand District School Board%', 'Wellington Catholic%',
    'City Of Guelph%', 'Guelph General Hospital%'],
  '3510': ["Queen%s University%", 'Limestone District School Board%', 'City Of Kingston%',
    'Kingston Health Sciences%', 'St. Lawrence College%'],
  '3537': ['University Of Windsor%', 'Greater Essex County District School Board%',
    'Windsor-Essex Catholic%', 'City Of Windsor%', 'Windsor Regional Hospital%',
    'St. Clair College%', 'Windsor Police%'],
  '3515': ['Trent University%', 'Kawartha Pine Ridge District School Board%',
    'City Of Peterborough%', 'Peterborough Regional Health%', 'Fleming College%'],
  '3553': ['City Of Greater Sudbury%', 'Laurentian University%', 'Rainbow District School Board%',
    'Sudbury Catholic District School Board%', 'Health Sciences North%',
    'Cambrian College%', 'College Boreal%', 'Greater Sudbury Police%'],
  '3558': ['Lakehead University%', 'Thunder Bay Catholic District School Board%',
    'Lakehead District School Board%', 'City Of Thunder Bay%',
    'Thunder Bay Regional Health%', 'Confederation College%', 'Thunder Bay Police%'],
  '3512': ['Hastings and Prince Edward District School Board%', 'City Of Belleville%',
    'Loyalist College%', 'Quinte Health%'],
  '3529': ['City Of Brantford%', 'Grand Erie District School Board%', 'Brant Community Healthcare%'],
  '3532': ['City Of Woodstock%', 'Oxford County%'],
  '3538': ['Lambton Kent District School Board%', 'City Of Sarnia%', 'Lambton College%'],
  '3548': ['Nipissing University%', 'Near North District School Board%',
    'City Of North Bay%', 'North Bay Regional Health%', 'Canadore College%'],
  '3547': ['Renfrew County District School Board%', 'Renfrew County Catholic%',
    'County Of Renfrew%', 'Pembroke Regional Hospital%'],
  '3557': ['Algoma District School Board%', 'City Of Sault Ste. Marie%', 'Sault Area Hospital%', 'Sault College%'],
  '3556': ['City Of Timmins%', 'Cochrane-Temiskaming%', 'District School Board Ontario North East%', 'Timmins and District Hospital%'],
  '3536': ['Municipality Of Chatham-Kent%', 'Chatham-Kent Health%'],
  '3516': ['City Of Kawartha Lakes%'],
  '3514': ['Northumberland Hills Hospital%'],
  '3544': ['District Municipality Of Muskoka%', 'Muskoka Algonquin Healthcare%'],
  '3528': ['Haldimand-Norfolk%', 'Norfolk%General Hospital%'],
  '3531': ['Avon Maitland District School Board%', 'Huron Perth Catholic%', 'City Of Stratford%'],
  '3534': ['City Of St. Thomas%', 'County Of Elgin%'],
  '3522': ['County Of Dufferin%', 'Headwaters Health%'],
};

async function main() {
  console.log('=== Fix Region Mapping for Pay Lens ===\n');

  // ── Step 1: Map employers to regions by name pattern ──
  console.log('-- Step 1: Update employers with region_id --');
  for (const [regionId, patterns] of Object.entries(EMPLOYER_REGION_MAP)) {
    const conditions = patterns.map(p => `name ILIKE '${p.replace(/'/g, "''")}'`).join(' OR ');
    await runSQL(
      `UPDATE employers SET region_id = '${regionId}' WHERE (${conditions}) AND (region_id IS NULL OR region_id = '')`,
      `${regionId} (${REGION_NAMES[regionId]}) — ${patterns.length} patterns`
    );
  }
  // Short-name government ministries
  for (const [name, maxLen] of [['Transportation', 20], ['Education', 15], ['Finance', 12], ['Health', 10]]) {
    await runSQL(
      `UPDATE employers SET region_id = '3520' WHERE name ILIKE '${name}' AND LENGTH(name) < ${maxLen} AND (region_id IS NULL OR region_id = '')`,
      `short: ${name}`
    );
  }

  // ── Step 2: Normalize slug-based region_ids to geoUid ──
  console.log('\n-- Step 2: Normalize slug region_ids --');
  const caseParts = Object.entries(SLUG_TO_GEO).map(([s, g]) => `WHEN '${s}' THEN '${g}'`).join(' ');
  await runSQL(
    `UPDATE employers SET region_id = CASE region_id ${caseParts} ELSE region_id END WHERE region_id !~ '^[0-9]+$' AND region_id IS NOT NULL AND region_id != ''`,
    'employers slug->geoUid'
  );

  // Normalize disclosures slug->geoUid per year per sector
  const sectorsResult = await runSQL(
    `SELECT DISTINCT sector FROM disclosures WHERE sector IS NOT NULL AND sector != '' ORDER BY sector`, 'get sectors'
  );
  const sectors = sectorsResult ? sectorsResult.map(r => r.sector) : [];

  const ridCase = Object.entries(SLUG_TO_GEO).map(([s, g]) => `WHEN '${s}' THEN '${g}'`).join(' ');
  const rnameCase = Object.entries(SLUG_TO_GEO)
    .map(([s, g]) => `WHEN '${s}' THEN '${(REGION_NAMES[g] || '').replace(/'/g, "''")}'`).join(' ');

  for (const year of [2023, 2024, 2025]) {
    for (const sector of sectors) {
      const sectorEsc = sector.replace(/'/g, "''");
      await runSQL(
        `UPDATE disclosures SET region_id = CASE region_id ${ridCase} ELSE region_id END, region_name = CASE region_id ${rnameCase} ELSE region_name END WHERE region_id !~ '^[0-9]+$' AND region_id IS NOT NULL AND region_id != '' AND year = ${year} AND sector = '${sectorEsc}'`,
        `${year}/${sector.substring(0, 50)}`
      );
    }
  }

  // ── Step 3: Propagate region_id from employers to unmapped disclosures ──
  console.log('\n-- Step 3: Propagate to unmapped disclosures --');
  const allGeoIds = Object.keys(REGION_NAMES);
  for (const year of [2023, 2024, 2025]) {
    console.log(`  Year ${year}:`);
    for (const regionId of allGeoIds) {
      if (regionId === '3520') {
        // Toronto: batch by sector to avoid timeout
        for (const sector of sectors) {
          const sectorEsc = sector.replace(/'/g, "''");
          await runSQL(
            `UPDATE disclosures d SET region_id = '3520', region_name = 'Toronto' FROM employers e WHERE d.employer_id = e.id AND e.region_id = '3520' AND d.sector = '${sectorEsc}' AND (d.region_id IS NULL OR d.region_id = '') AND d.year = ${year}`,
            `${year}/3520/${sector.substring(0, 40)}`
          );
        }
        continue;
      }
      const regionName = (REGION_NAMES[regionId] || '').replace(/'/g, "''");
      await runSQL(
        `UPDATE disclosures d SET region_id = '${regionId}', region_name = '${regionName}' FROM employers e WHERE d.employer_id = e.id AND e.region_id = '${regionId}' AND (d.region_id IS NULL OR d.region_id = '') AND d.year = ${year}`,
        `${year}/${regionId} ${REGION_NAMES[regionId]}`
      );
    }
  }

  // ── Step 4: Standardize sector names ──
  console.log('\n-- Step 4: Standardize sector names --');
  const sectorFixes = [
    [`UPDATE disclosures SET sector = 'Government of Ontario \u2013 Ministries' WHERE sector = 'Government of Ontario - Ministries'`, 'disclosures GoO Ministries'],
    [`UPDATE disclosures SET sector = 'Government of Ontario \u2013 Judiciary' WHERE sector = 'Government of Ontario - Judiciary'`, 'disclosures GoO Judiciary'],
    [`UPDATE disclosures SET sector = 'Government of Ontario \u2013 Legislative Assembly and Offices' WHERE sector = 'Government of Ontario - Legislative Assembly and Offices'`, 'disclosures GoO Legislative'],
    [`UPDATE disclosures SET sector = 'Hospitals & Boards of Public Health' WHERE sector = 'hospitals & Boards of Public Health'`, 'disclosures hospitals case'],
    [`UPDATE employers SET sector = 'Government of Ontario \u2013 Ministries' WHERE sector = 'Government of Ontario - Ministries'`, 'employers GoO Ministries'],
    [`UPDATE employers SET sector = 'Government of Ontario \u2013 Judiciary' WHERE sector = 'Government of Ontario - Judiciary'`, 'employers GoO Judiciary'],
    [`UPDATE employers SET sector = 'Government of Ontario \u2013 Legislative Assembly and Offices' WHERE sector = 'Government of Ontario - Legislative Assembly and Offices'`, 'employers GoO Legislative'],
    [`UPDATE employers SET sector = 'Hospitals & Boards of Public Health' WHERE sector = 'hospitals & Boards of Public Health'`, 'employers hospitals case'],
  ];
  for (const [sql, label] of sectorFixes) await runSQL(sql, label);

  // ── Step 5: Rebuild sectors table ──
  console.log('\n-- Step 5: Rebuild sectors --');
  await runSQL(`DELETE FROM sectors`, 'clear sectors');
  await runSQL(`
    INSERT INTO sectors (id, name, employee_count, avg_salary, median_salary, min_salary, max_salary, total_compensation)
    SELECT LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sector, ' ', '-'), ',', ''), '.', ''), '&', 'and'), E'\\u2013', '-')),
      sector, COUNT(*), ROUND(AVG(salary_paid)::numeric, 2),
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid),
      MIN(salary_paid), MAX(salary_paid), SUM(salary_paid)
    FROM disclosures WHERE year = 2025 AND sector IS NOT NULL AND sector != '' GROUP BY sector
  `, 'rebuild sectors');

  // ── Step 6: Rebuild regions table ──
  console.log('\n-- Step 6: Rebuild regions --');
  await runSQL(`DELETE FROM regions`, 'clear regions');
  await runSQL(`
    INSERT INTO regions (region_id, name, median_salary, employee_count, lat, lng)
    SELECT region_id, region_name,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_paid), COUNT(*), 0, 0
    FROM disclosures WHERE year = 2025 AND region_id IS NOT NULL AND region_id != ''
    GROUP BY region_id, region_name
  `, 'insert regions');

  const latCase2 = Object.entries(REGION_COORDS).map(([id, [lat]]) => `WHEN '${id}' THEN ${lat}`).join(' ');
  const lngCase2 = Object.entries(REGION_COORDS).map(([id, [, lng]]) => `WHEN '${id}' THEN ${lng}`).join(' ');
  await runSQL(`UPDATE regions SET lat = CASE region_id ${latCase2} ELSE 0 END, lng = CASE region_id ${lngCase2} ELSE 0 END`, 'lat/lng');

  // ── Step 7: Verify ──
  console.log('\n-- Verification --');
  let result = await runSQL(`SELECT region_id, name, employee_count, ROUND(median_salary::numeric, 0) as median FROM regions ORDER BY employee_count DESC`, 'final regions');
  if (result) {
    let total = 0;
    for (const r of result) { total += r.employee_count; console.log(`  ${r.region_id} ${r.name}: ${r.employee_count} ($${r.median})`); }
    console.log(`  Total: ${total}`);
  }
  for (const year of [2023, 2024, 2025]) {
    result = await runSQL(`SELECT COUNT(*) as total, COUNT(CASE WHEN region_id IS NOT NULL AND region_id != '' THEN 1 END) as mapped FROM disclosures WHERE year = ${year}`, `coverage ${year}`);
    if (result) {
      const r = result[0];
      console.log(`  ${year}: ${r.mapped}/${r.total} (${(r.mapped/r.total*100).toFixed(1)}%)`);
    }
  }
  console.log('\nDone!');
}

main().catch(console.error);
