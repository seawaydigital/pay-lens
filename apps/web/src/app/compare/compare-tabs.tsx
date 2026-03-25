'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/compare', label: 'Employers' },
  { href: '/compare/people', label: 'People' },
] as const;

export function CompareTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-sunshine-200 mb-6">
      <nav className="flex gap-6" aria-label="Compare tabs">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/compare'
              ? pathname === '/compare'
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'pb-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-sunshine-600 text-sunshine-900'
                  : 'border-transparent text-sunshine-500 hover:text-sunshine-700 hover:border-sunshine-300'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
