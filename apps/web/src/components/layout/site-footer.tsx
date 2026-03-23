import Link from 'next/link';

import { SITE_NAME } from '@/lib/constants';

export function SiteFooter() {
  return (
    <footer className="border-t border-sunshine-200 bg-cream-100 mt-12">
      <div className="container py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-sunshine-900">
              {SITE_NAME} &mdash; Ontario&apos;s public sector salary data, made
              useful
            </p>
            <p className="text-xs text-sunshine-700">
              Data source: Ontario Public Sector Salary Disclosure
            </p>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/methodology"
              className="text-sm text-sunshine-700 hover:text-sunshine-900 transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="/api-docs"
              className="text-sm text-sunshine-700 hover:text-sunshine-900 transition-colors"
            >
              API
            </Link>
            <Link
              href="/about"
              className="text-sm text-sunshine-700 hover:text-sunshine-900 transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        <p className="mt-4 text-xs text-sunshine-600">
          The Ontario Sunshine List only includes public sector employees earning
          $100,000 or more. Salaries below this threshold are not disclosed.
        </p>
      </div>
    </footer>
  );
}
