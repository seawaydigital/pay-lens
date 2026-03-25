'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { ONTARIO_REGIONS } from '@/lib/geo/regions';
import { getBenchmarks } from '@/lib/db';
import type { Benchmark } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Dynamic imports for chart / visualization components (SSR disabled)
// ---------------------------------------------------------------------------

const RoleInputForm = dynamic(
  () =>
    import('@/components/benchmark/role-input-form').then(
      (m) => m.RoleInputForm
    ),
  { ssr: false, loading: () => <InputFormSkeleton /> }
);

const PercentileRuler = dynamic(
  () =>
    import('@/components/benchmark/percentile-ruler').then(
      (m) => m.PercentileRuler
    ),
  { ssr: false, loading: () => <ChartSkeleton label="Percentile Ruler" /> }
);

const SalaryDistribution = dynamic(
  () =>
    import('@/components/charts/salary-distribution').then(
      (m) => m.SalaryDistribution
    ),
  { ssr: false, loading: () => <ChartSkeleton label="Salary Distribution" /> }
);

const InstitutionBreakdown = dynamic(
  () =>
    import('@/components/benchmark/institution-breakdown').then(
      (m) => m.InstitutionBreakdown
    ),
  {
    ssr: false,
    loading: () => <ChartSkeleton label="Institution Breakdown" />,
  }
);

const SalaryTimeline = dynamic(
  () =>
    import('@/components/charts/salary-timeline').then(
      (m) => m.SalaryTimeline
    ),
  { ssr: false, loading: () => <ChartSkeleton label="Salary Timeline" /> }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface DistributionBucket {
  bucket: number;
  count: number;
}

interface InstitutionEntry {
  type: string;
  median: number;
  count: number;
}

interface RegionEntry {
  regionId: string;
  regionName: string;
  median: number;
  count: number;
}

interface TrendEntry {
  year: number;
  median: number;
  medianAdjusted: number;
  count: number;
}

interface RoleData {
  name: string;
  category: string;
  totalRecords: number;
  percentiles: Percentiles;
  distribution: DistributionBucket[];
  byInstitutionType: InstitutionEntry[];
  byRegion: RegionEntry[];
  trend: TrendEntry[];
}

interface BenchmarkData {
  roles: Record<string, RoleData>;
}

interface BenchmarkSelection {
  roleId: string;
  regionId: string | null;
  salary: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Estimate the user's percentile by linear interpolation between known percentile knots. */
function estimatePercentile(salary: number, p: Percentiles): number {
  const knots: [number, number][] = [
    [0, p.p25],
    [25, p.p25],
    [50, p.p50],
    [75, p.p75],
    [90, p.p90],
  ];

  // Below P25
  if (salary <= p.p25) {
    // Estimate linearly from 0 to 25
    const ratio = salary / p.p25;
    return Math.max(1, Math.round(ratio * 25));
  }

  // Above P90
  if (salary >= p.p90) {
    // Estimate linearly from 90 to 100
    const range = p.p90 - p.p75;
    if (range === 0) return 95;
    const excess = (salary - p.p90) / range;
    return Math.min(99, Math.round(90 + excess * 10));
  }

  // Between two knots
  for (let i = 1; i < knots.length - 1; i++) {
    const [pLow, vLow] = knots[i];
    const [pHigh, vHigh] = knots[i + 1];
    if (salary >= vLow && salary <= vHigh) {
      if (vHigh === vLow) return pLow;
      const t = (salary - vLow) / (vHigh - vLow);
      return Math.round(pLow + t * (pHigh - pLow));
    }
  }

  return 50; // fallback
}

/**
 * Generate a rough distribution histogram from percentile/min/max values.
 * Creates ~10 buckets between min_salary and max_salary with estimated counts
 * based on the percentile positions.
 */
function generateDistributionFromPercentiles(b: Benchmark): DistributionBucket[] {
  const min = b.min_salary ?? b.p25 * 0.8;
  const max = b.max_salary ?? b.p90 * 1.3;
  const range = max - min;
  if (range <= 0 || b.sample_size <= 0) return [];

  const numBuckets = 10;
  const bucketWidth = range / numBuckets;
  const buckets: DistributionBucket[] = [];

  // Known CDF points from percentiles
  const cdfPoints: [number, number][] = [
    [min, 0],
    [b.p25, 0.25],
    [b.p50, 0.50],
    [b.p75, 0.75],
    [b.p90, 0.90],
    [max, 1.0],
  ];

  function interpolateCdf(salary: number): number {
    if (salary <= cdfPoints[0][0]) return 0;
    if (salary >= cdfPoints[cdfPoints.length - 1][0]) return 1;
    for (let i = 0; i < cdfPoints.length - 1; i++) {
      const [sLow, cLow] = cdfPoints[i];
      const [sHigh, cHigh] = cdfPoints[i + 1];
      if (salary >= sLow && salary <= sHigh) {
        if (sHigh === sLow) return cLow;
        const t = (salary - sLow) / (sHigh - sLow);
        return cLow + t * (cHigh - cLow);
      }
    }
    return 0.5;
  }

  for (let i = 0; i < numBuckets; i++) {
    const lo = min + i * bucketWidth;
    const hi = lo + bucketWidth;
    const cdfLo = interpolateCdf(lo);
    const cdfHi = interpolateCdf(hi);
    const fraction = cdfHi - cdfLo;
    buckets.push({
      bucket: Math.round(lo + bucketWidth / 2),
      count: Math.max(1, Math.round(fraction * b.sample_size)),
    });
  }

  return buckets;
}

function ordinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function InputFormSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function BenchmarkPage() {
  // ----- data fetch -----
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBenchmarks()
      .then((benchmarks) => {
        const roles: Record<string, RoleData> = {};
        for (const b of benchmarks) {
          roles[b.id] = {
            name: b.role,
            category: b.institution_breakdown?.[0]?.type || 'Other',
            totalRecords: b.sample_size,
            percentiles: { p25: b.p25, p50: b.p50, p75: b.p75, p90: b.p90 },
            distribution: generateDistributionFromPercentiles(b),
            byInstitutionType: b.institution_breakdown || [],
            byRegion: [],
            trend: (b.yearly_trend || []).map((t) => ({
              year: t.year,
              median: t.median,
              medianAdjusted: t.median,
              count: t.count,
            })),
          };
        }
        setBenchmarkData({ roles });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ----- user selection -----
  const [selection, setSelection] = useState<BenchmarkSelection | null>(null);
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);

  const availableRoles = useMemo(() => {
    if (!benchmarkData) return [];
    return Object.entries(benchmarkData.roles).map(([id, role]) => ({
      id,
      name: role.name,
      category: role.category,
    }));
  }, [benchmarkData]);

  const handleSubmit = useCallback(
    (roleId: string, regionId: string | null, salary: number | null) => {
      setSelection({ roleId, regionId, salary });
      setShowInflationAdjusted(false);
    },
    []
  );

  // ----- derived data for the selected role -----
  const roleData = useMemo<RoleData | null>(() => {
    if (!benchmarkData || !selection) return null;
    return benchmarkData.roles[selection.roleId] ?? null;
  }, [benchmarkData, selection]);

  const regionInfo = useMemo(() => {
    if (!selection?.regionId) return null;
    const region = ONTARIO_REGIONS.find(
      (r) => r.geoUid === selection.regionId || r.id === selection.regionId
    );
    return region ?? null;
  }, [selection]);

  const regionData = useMemo<RegionEntry | null>(() => {
    if (!roleData || !selection?.regionId) return null;
    return (
      roleData.byRegion.find(
        (r) =>
          r.regionId === selection.regionId ||
          r.regionId === regionInfo?.geoUid
      ) ?? null
    );
  }, [roleData, selection, regionInfo]);

  const effectivePercentiles = useMemo<Percentiles | null>(() => {
    if (!roleData) return null;
    // If a region is selected and we have regional data, adjust percentiles
    // proportionally based on regional vs provincial median
    if (regionData && roleData.percentiles.p50 > 0) {
      const ratio = regionData.median / roleData.percentiles.p50;
      return {
        p25: Math.round(roleData.percentiles.p25 * ratio),
        p50: Math.round(roleData.percentiles.p50 * ratio),
        p75: Math.round(roleData.percentiles.p75 * ratio),
        p90: Math.round(roleData.percentiles.p90 * ratio),
      };
    }
    return roleData.percentiles;
  }, [roleData, regionData]);

  const userPercentile = useMemo<number | null>(() => {
    if (!selection?.salary || !effectivePercentiles) return null;
    return estimatePercentile(selection.salary, effectivePercentiles);
  }, [selection, effectivePercentiles]);

  const resultTitle = useMemo(() => {
    if (!roleData) return '';
    const regionName =
      regionInfo?.name ?? regionData?.regionName ?? null;
    return regionName
      ? `${roleData.name} \u2014 ${regionName}`
      : roleData.name;
  }, [roleData, regionInfo, regionData]);

  const totalRecords = useMemo(() => {
    if (!roleData) return 0;
    if (regionData) return regionData.count;
    return roleData.totalRecords;
  }, [roleData, regionData]);

  // ----- render -----

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <PageHeader
          title="Benchmark My Role"
          description="See how your compensation compares to similar public sector positions across Ontario."
        />
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p className="font-medium">Unable to load benchmark data</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Benchmark My Role"
        description="See how your compensation compares to similar public sector positions across Ontario."
      />

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Input Form                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-8 max-w-xl">
        {loading ? (
          <InputFormSkeleton />
        ) : (
          <RoleInputForm
            roles={availableRoles}
            regions={ONTARIO_REGIONS}
            onSubmit={handleSubmit}
          />
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Results                                                     */}
      {/* ------------------------------------------------------------------ */}
      {roleData && effectivePercentiles && (
        <section className="mt-12 space-y-8">
          {/* Results heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-sunshine-900">
              {resultTitle}
            </h2>
            <p className="text-sm text-sunshine-600">
              Based on {formatNumber(totalRecords)} Sunshine List records
            </p>
          </div>

          {/* ---- Percentile Hero ---- */}
          {userPercentile !== null && selection?.salary && (
            <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-sunshine-50">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:gap-8 sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-5xl font-extrabold tracking-tight text-amber-600 sm:text-6xl">
                    {ordinalSuffix(userPercentile)}
                  </span>
                  <span className="mt-1 text-sm font-medium uppercase tracking-wider text-amber-700/80">
                    percentile
                  </span>
                </div>

                <div className="h-px w-16 bg-amber-200 sm:h-16 sm:w-px" />

                <div className="space-y-1.5">
                  <p className="text-lg font-semibold text-sunshine-900">
                    Your salary of{' '}
                    <span className="text-amber-700">
                      {formatCurrency(selection.salary)}
                    </span>
                  </p>
                  <p className="text-sunshine-700">
                    {userPercentile <= 50 ? (
                      <>
                        {100 - userPercentile}% of peers earn more than you
                      </>
                    ) : (
                      <>
                        You earn more than {userPercentile}% of peers
                      </>
                    )}
                  </p>
                  <p className="text-sm text-sunshine-500">
                    Based on {formatNumber(totalRecords)} records
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Percentile Ruler ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Percentile Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <PercentileRuler
                p25={effectivePercentiles.p25}
                p50={effectivePercentiles.p50}
                p75={effectivePercentiles.p75}
                p90={effectivePercentiles.p90}
                totalRecords={roleData.totalRecords}
                userSalary={selection?.salary ?? undefined}
              />
            </CardContent>
          </Card>

          {/* ---- Salary Distribution ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Salary Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <SalaryDistribution
                data={roleData.distribution}
                userSalary={selection?.salary ?? undefined}
              />
            </CardContent>
          </Card>

          {/* ---- Institution Breakdown ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Median Salary by Institution Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InstitutionBreakdown data={roleData.byInstitutionType} />
            </CardContent>
          </Card>

          {/* ---- Salary Timeline ---- */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Salary Over Time</CardTitle>
              <Button
                variant={showInflationAdjusted ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInflationAdjusted((prev) => !prev)}
              >
                {showInflationAdjusted
                  ? 'Showing Inflation-Adjusted'
                  : 'Show Inflation-Adjusted'}
              </Button>
            </CardHeader>
            <CardContent>
              <SalaryTimeline
                data={roleData.trend}
                showAdjusted={showInflationAdjusted}
              />
            </CardContent>
          </Card>

          {/* ---- Region Comparison (only if no region was selected) ---- */}
          {!selection?.regionId && roleData.byRegion.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Median Salary by Region
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sunshine-200 text-left">
                        <th className="pb-2 pr-4 font-semibold text-sunshine-800">
                          Region
                        </th>
                        <th className="pb-2 pr-4 text-right font-semibold text-sunshine-800">
                          Median Salary
                        </th>
                        <th className="pb-2 text-right font-semibold text-sunshine-800">
                          Records
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...roleData.byRegion]
                        .sort((a, b) => b.median - a.median)
                        .map((region) => (
                          <tr
                            key={region.regionId}
                            className="border-b border-sunshine-100 last:border-0"
                          >
                            <td className="py-2.5 pr-4 text-sunshine-900">
                              {region.regionName}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-sunshine-800">
                              {formatCurrency(region.median)}
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-sunshine-600">
                              {formatNumber(region.count)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Data Caveat ---- */}
          <DataCaveatBanner className="mt-4" />
        </section>
      )}
    </main>
  );
}
