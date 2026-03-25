'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/compare', label: 'Employers', icon: Building2, description: 'Compare organizations side by side' },
  { href: '/compare/people', label: 'People', icon: Users, description: 'Compare individual salaries' },
] as const;

export function CompareTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/compare'
              ? pathname === '/compare'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 px-5 py-4 transition-all',
                isActive
                  ? 'border-sunshine-600 bg-sunshine-100/60 shadow-sm'
                  : 'border-sunshine-200 bg-white hover:border-sunshine-400 hover:bg-sunshine-50'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  isActive
                    ? 'bg-sunshine-600 text-white'
                    : 'bg-sunshine-100 text-sunshine-500'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p
                  className={cn(
                    'text-base font-bold',
                    isActive ? 'text-sunshine-900' : 'text-sunshine-700'
                  )}
                >
                  {tab.label}
                </p>
                <p className="text-xs text-sunshine-500">{tab.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
