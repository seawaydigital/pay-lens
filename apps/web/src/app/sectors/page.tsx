'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowUpDown, Layers, Users, DollarSign, TrendingUp } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getSectors } from '@/lib/db';

const SectorVelocityStream = dynamic(
  () =>
    import('@/components/charts/sector-velocity-stream').then(
      (mod) => mod.SectorVelocityStream
    ),
  { ssr: false }
);

interface Sector {
  id: string;
  name: string;
  count: number;
  medianSalary: number;
  totalComp: number;
}

type SortKey = 'count' | 'medianSalary' | 'totalComp' | 'name';

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    getSectors()
      .then((data) => {
        setSectors(
          data.map((s) => ({
            id: s.id,
            name: s.name,
            count: s.employee_count,
            medianSalary: s.median_salary,
            totalComp: s.total_compensation,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const diff = a[sortBy] - b[sortBy];
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [sectors, sortBy, sortDir]);

  const totalEmployees = useMemo(
    () => sectors.reduce((sum, s) => sum + s.count, 0),
    [sectors]
  );

  const totalCompensation = useMemo(
    () => sectors.reduce((sum, s) => sum + s.totalComp, 0),
    [sectors]
  );

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
        title="Sectors"
        description="Compare compensation across Ontario public sector categories."
      />

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-sunshine-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sunshine-600">
                <Layers className="h-4 w-4" />
                <span className="text-sm">Total Sectors</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-sunshine-900">
                {sectors.length}
              </p>
            </div>
            <div className="rounded-lg border border-sunshine-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sunshine-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">Total Employees</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-sunshine-900">
                {formatNumber(totalEmployees)}
              </p>
            </div>
            <div className="rounded-lg border border-sunshine-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sunshine-600">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Compensation</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-sunshine-900">
                {formatCurrency(totalCompensation)}
              </p>
            </div>
          </div>

          {/* Velocity Chart */}
          <div className="mt-8">
            <SectorVelocityStream isLoading={false} />
          </div>

          {/* Sort bar */}
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-sunshine-600">
              {sectors.length} sector{sectors.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              {([
                ['count', 'Headcount'],
                ['medianSalary', 'Median Salary'],
                ['totalComp', 'Total Comp'],
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
                  {sortBy === key && <ArrowUpDown className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((sector) => (
              <Link
                key={sector.id}
                href={`/sectors/detail/?id=${sector.id}`}
                className="group block rounded-lg border border-sunshine-200 bg-white p-5 shadow-sm transition-all hover:border-sunshine-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-sunshine-900 group-hover:text-sunshine-700">
                    {sector.name}
                  </h3>
                  <Layers className="h-5 w-5 shrink-0 text-sunshine-400" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1 text-sunshine-600">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Employees</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-sunshine-900">
                      {formatNumber(sector.count)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-sunshine-600">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-xs">Median</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-sunshine-900">
                      {formatCurrency(sector.medianSalary)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-sunshine-600">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="text-xs">Total</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-sunshine-900">
                      {formatCurrency(sector.totalComp)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <DataCaveatBanner className="mt-8" />
    </main>
  );
}
