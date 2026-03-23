'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { EmployerCard } from '@/components/employer/employer-card';
import { formatNumber } from '@/lib/utils';

interface Employer {
  id: string;
  name: string;
  sector: string;
  regionId: string;
  headcount: number;
  medianSalary: number;
}

type SortKey = 'name' | 'headcount' | 'medianSalary';

export default function EmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('headcount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/data/employers-index.json')
      .then((res) => res.json())
      .then((data: Employer[]) => {
        setEmployers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const set = new Set(employers.map((e) => e.sector));
    return Array.from(set).sort();
  }, [employers]);

  const filtered = useMemo(() => {
    let list = employers;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    if (sectorFilter) {
      list = list.filter((e) => e.sector === sectorFilter);
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const diff = a[sortBy] - b[sortBy];
      return sortDir === 'asc' ? diff : -diff;
    });

    return list;
  }, [employers, search, sectorFilter, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Employers"
        description="Browse and compare all public sector employers on the Sunshine List."
      />

      <DataCaveatBanner className="mt-6" />

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sunshine-500" />
              <input
                type="text"
                placeholder="Search employers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-sunshine-300 bg-white py-2 pl-9 pr-3 text-sm text-sunshine-900 placeholder:text-sunshine-400 focus:border-sunshine-500 focus:outline-none focus:ring-1 focus:ring-sunshine-500"
              />
            </div>

            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-md border border-sunshine-300 bg-white px-3 py-2 text-sm text-sunshine-900 focus:border-sunshine-500 focus:outline-none focus:ring-1 focus:ring-sunshine-500"
            >
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort & count bar */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-sunshine-600">
              {formatNumber(filtered.length)} employer{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              {([
                ['headcount', 'Headcount'],
                ['medianSalary', 'Median Salary'],
                ['name', 'Name'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === key
                      ? 'bg-sunshine-200 text-sunshine-900'
                      : 'text-sunshine-600 hover:bg-sunshine-100'
                  }`}
                >
                  {label}
                  {sortBy === key && (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="mt-12 text-center text-sm text-sunshine-500">
              No employers match your search.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((emp) => (
                <EmployerCard
                  key={emp.id}
                  id={emp.id}
                  name={emp.name}
                  sector={emp.sector}
                  headcount={emp.headcount}
                  medianSalary={emp.medianSalary}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
