export const SITE_NAME = 'Pay Lens';

export const SITE_DESCRIPTION =
  "Ontario's $100K+ public sector salaries — searched, sorted, and benchmarked";

export const SUNSHINE_THRESHOLD = 100_000;

export const FIRST_YEAR = 1996;

export const LATEST_YEAR = 2024;

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Benchmark', href: '/benchmark' },
  { label: 'Pay Map', href: '/map' },
  { label: 'Compare', href: '/compare' },
  { label: 'Employers', href: '/employers' },
  { label: 'Sectors', href: '/sectors' },
] as const;

export const SECTORS = [
  'Government of Ontario',
  'Crown Agencies',
  'Municipalities',
  'School Boards',
  'Universities',
  'Colleges',
  'Hospitals',
  'Ontario Power Generation',
  'Hydro One',
  'Ontario Provincial Police',
  'Judiciary',
  'Legislative Assembly',
  'Children\'s Aid Societies',
  'Community Colleges',
  'Public Health Units',
  'Boards of Public Health',
  'Transit Authorities',
  'Electricity Distributors',
  'Other Public Sector Employers',
] as const;
