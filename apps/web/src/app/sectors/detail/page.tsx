'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Layers, Users, DollarSign, TrendingUp } from 'lucide-react';

import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { getSectorById } from '@/lib/db';
import { searchDisclosures } from '@/lib/db';

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

interface SectorView {
  id: string;
  name: string;
  count: number;
  medianSalary: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  totalComp: number;
  yoyGrowth: number;
}

interface DistributionBucket {
  bucket: string;
  count: number;
}

function SectorDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [sector, setSector] = useState<SectorView | null>(null);
  const [distributionData, setDistributionData] = useState<DistributionBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    getSectorById(id)
      .then(async (data) => {
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setSector({
          id: data.id,
          name: data.name,
          count: data.employee_count,
          medianSalary: data.median_salary,
          avgSalary: data.avg_salary,
          minSalary: data.min_salary,
          maxSalary: data.max_salary,
          totalComp: data.total_compensation,
          yoyGrowth: data.yoy_growth,
        });

        // Build salary distribution from actual disclosures
        try {
          const { data: disclosures } = await searchDisclosures({
            sector: data.name,
            pageSize: 1000,
          });

          // Create distribution buckets
          const bucketSize = 10000; // $10K buckets
          const min = Math.floor((data.min_salary || 100000) / bucketSize) * bucketSize;
          const max = Math.ceil((data.max_salary || 300000) / bucketSize) * bucketSize;
          const bucketCounts: Record<string, number> = {};

          for (let b = min; b < max; b += bucketSize) {
            const label =
              b + bucketSize >= max
                ? `$${Math.round(b / 1000)}K+`
                : `$${Math.round(b / 1000)}K-$${Math.round((b + bucketSize) / 1000)}K`;
            bucketCounts[label] = 0;
          }

          for (const d of disclosures) {
            const salary = d.salary_paid;
            const bucketStart = Math.floor(salary / bucketSize) * bucketSize;
            const label =
              bucketStart + bucketSize >= max
                ? `$${Math.round(bucketStart / 1000)}K+`
                : `$${Math.round(bucketStart / 1000)}K-$${Math.round((bucketStart + bucketSize) / 1000)}K`;
            if (label in bucketCounts) {
              bucketCounts[label]++;
            } else {
              // Falls in last bucket
              const lastKey = Object.keys(bucketCounts).pop();
              if (lastKey) bucketCounts[lastKey]++;
            }
          }

          setDistributionData(
            Object.entries(bucketCounts).map(([bucket, count]) => ({ bucket, count }))
          );
        } catch {
          // Distribution chart will be empty if disclosures fail
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
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Year-over-Year Growth</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {sector.yoyGrowth >= 0 ? '+' : ''}{sector.yoyGrowth.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 space-y-6">
        <SectorDistributionChart sectorName={sector.name} data={distributionData} />
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
