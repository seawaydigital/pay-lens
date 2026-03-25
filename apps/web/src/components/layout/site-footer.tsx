import Link from 'next/link';

import { SITE_NAME } from '@/lib/constants';

const EXPLORE_LINKS = [
  { label: 'Search', href: '/search' },
  { label: 'Benchmark', href: '/benchmark' },
  { label: 'Pay Map', href: '/map' },
  { label: 'Compare', href: '/compare' },
  { label: 'Employers', href: '/employers' },
  { label: 'Sectors', href: '/sectors' },
  { label: 'Historical Explorer', href: '/history' },
  { label: 'Anomalies', href: '/anomalies' },
] as const;

const RESOURCE_LINKS = [
  { label: 'Methodology', href: '/methodology' },
  { label: 'Report an Error', href: '/report-error' },
  { label: 'Request Name Removal', href: '/name-removal' },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-sunshine-900 text-cream-100">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Column 1 — About */}
          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg tracking-tight text-white"
            >
              <span className="text-sunshine-400">&#9728;</span>
              {SITE_NAME}
            </Link>
            <p className="text-sm text-cream-100/80">
              Ontario public sector pay transparency
            </p>
            <p className="text-sm text-cream-100/60">
              Built with public data from the Government of Ontario
            </p>
          </div>

          {/* Column 2 — Explore */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h3>
            <ul className="space-y-2">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-sunshine-200 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Resources & Community */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Resources &amp; Community
            </h3>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-sunshine-200 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-sunshine-800">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 sm:flex-row">
          <p className="text-xs text-cream-100/60">
            &copy; 2024&ndash;2026 {SITE_NAME}. Data sourced from Ontario Public
            Sector Salary Disclosure.
          </p>
          <a
            href="https://github.com/pay-lens/pay-lens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sunshine-200 hover:text-white transition-colors"
          >
            Open source &mdash; MIT License
          </a>
        </div>
      </div>
    </footer>
  );
}
