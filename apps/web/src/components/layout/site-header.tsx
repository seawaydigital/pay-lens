'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';

import { SITE_NAME, NAV_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-sunshine-900 text-cream-50 shadow-md">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <span className="text-sunshine-400">&#9728;</span>
          {SITE_NAME}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-cream-100/80 hover:text-cream-50 transition-colors rounded-md hover:bg-sunshine-800/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search + mobile toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center relative">
            <Search className="absolute left-2.5 h-4 w-4 text-sunshine-400" />
            <Input
              placeholder="Search names..."
              className="h-8 w-48 bg-sunshine-800/50 border-sunshine-700 text-cream-50 placeholder:text-cream-100/40 pl-8 focus-visible:ring-sunshine-400"
            />
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-cream-50 hover:bg-sunshine-800/50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-sunshine-800 bg-sunshine-900 pb-4">
          <div className="container flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-cream-100/80 hover:text-cream-50 hover:bg-sunshine-800/50 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="px-3 pt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-sunshine-400" />
                <Input
                  placeholder="Search names..."
                  className="h-8 w-full bg-sunshine-800/50 border-sunshine-700 text-cream-50 placeholder:text-cream-100/40 pl-8 focus-visible:ring-sunshine-400"
                />
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
