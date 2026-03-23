'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Layers, Users, DollarSign } from 'lucide-react';

import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';

const SectorDistributionChart = dynamic(
  () =>
    import('./sector-distribution-chart').then(
      (mod) => mod.SectorDistributionChart
    ),
  { ssr: false }
);

const SectorTrendChart = dynamic(
  () =>
    import('./sector-trend-chart').then((mod) => mod.SectorTrendChart),
  { ssr: false }
);

interface Sector {
  id: string;
  name: string;
  count: number;
  medianSalary: number;
  totalComp: number;
}

function SectorDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    fetch('/data/sectors.json')
      .then((res) => res.json())
      .then((data: Sector[]) => {
        const found = data.find((s) => s.id === id);
        if (found) {
          setSector(found);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      </main>
    );
  }

  if (notFound || !sector) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/sectors"
          className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sectors
        </Link>
        <div className="mt-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-sunshine-300" />
          <h2 className="mt-4 text-xl font-semibold text-sunshine-900">
            Sector not found
          </h2>
          <p className="mt-2 text-sm text-sunshine-600">
            The sector you are looking for does not exist or the link may be incorrect.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link
        href="/sectors"
        className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sectors
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-bold tracking-tight text-sunshine-900">
          {sector.name}
        </h1>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
          <Layers className="h-3.5 w-3.5" />
          Sector
        </span>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Employees</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatNumber(sector.count)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Median Salary</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(sector.medianSalary)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Compensation</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(sector.totalComp)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 space-y-6">
        <SectorDistributionChart sectorName={sector.name} />
        <SectorTrendChart sectorName={sector.name} />
      </div>

      <DataCaveatBanner className="mt-8" />
    </main>
  );
}

export default function SectorDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
          </div>
        </main>
      }
    >
      <SectorDetailContent />
    </Suspense>
  );
}
