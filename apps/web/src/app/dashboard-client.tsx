'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { DataCaveatBanner } from '@/components/layout/data-caveat-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import {
  getStatsSummary,
  getHistoricalSeries,
  getSectorsByYear,
  getTopEmployersByYear,
} from '@/lib/db';

// Dynamic imports for Recharts-based components (no SSR)
const SectorDonut = dynamic(
  () => import('@/components/charts/sector-donut').then((m) => m.SectorDonut),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);

const TopEmployersBar = dynamic(
  () => import('@/components/charts/top-employers-bar').then((m) => m.TopEmployersBar),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full rounded-lg" /> }
);

const YoYSparkline = dynamic(
  () => import('@/components/charts/yoy-sparkline').then((m) => m.YoYSparkline),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);

const AmIOnTheList = dynamic(
  () => import('@/components/benchmark/am-i-on-the-list').then((m) => m.AmIOnTheList),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> }
);

interface YearStats {
  totalEmployees: number;
  totalCompensation: number;
  medianSalary: number;
  yoyGrowth: number;
}

interface SectorData {
  name: string;
  count: number;
  medianSalary: number;
}

interface EmployerData {
  id: string;
  name: string;
  sector: string;
  headcount: number;
  medianSalary: number;
}

interface YearData {
  year: number;
  count: number;
  totalComp: number;
  median: number;
}

const AVAILABLE_YEARS = Array.from({ length: 30 }, (_, i) => 2025 - i);

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function DashboardClient() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [latestYear, setLatestYear] = useState(2025);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [sectors, setSectors] = useState<SectorData[] | null>(null);
  const [employers, setEmployers] = useState<EmployerData[] | null>(null);
  const [byYear, setByYear] = useState<YearData[]>([]);
  const [isLoadingBase, setIsLoadingBase] = useState(true);
  const [isLoadingYear, setIsLoadingYear] = useState(true);

  // Load base data (historical series, stats summary) once
  useEffect(() => {
    async function loadBase() {
      try {
        const [summary, historicalData] = await Promise.all([
          getStatsSummary(),
          getHistoricalSeries(),
        ]);

        const latest = summary?.latest_year ?? 2025;
        setLatestYear(latest);
        setSelectedYear(latest);

        setByYear(
          historicalData.map((h) => ({
            year: h.year,
            count: h.total_employees,
            totalComp: h.total_compensation,
            median: h.median_salary,
          }))
        );
      } catch (error) {
        console.error('Failed to load base dashboard data:', error);
      } finally {
        setIsLoadingBase(false);
      }
    }
    loadBase();
  }, []);

  // Load year-specific data whenever selectedYear changes
  const loadYearData = useCallback(async (year: number, allYears: YearData[]) => {
    setIsLoadingYear(true);
    try {
      const [sectorsData, employersData] = await Promise.all([
        getSectorsByYear(year),
        getTopEmployersByYear(year, 10),
      ]);

      // Pull stats from historical_series for this year
      const yrRecord = allYears.find((y) => y.year === year);
      const prevRecord = allYears.find((y) => y.year === year - 1);
      const yoyGrowth = yrRecord && prevRecord
        ? ((yrRecord.count - prevRecord.count) / prevRecord.count) * 100
        : 0;

      setYearStats(yrRecord ? {
        totalEmployees: yrRecord.count,
        totalCompensation: yrRecord.totalComp,
        medianSalary: yrRecord.median,
        yoyGrowth,
      } : null);

      setSectors(sectorsData);
      setEmployers(employersData);
    } catch (error) {
      console.error('Failed to load year data:', error);
    } finally {
      setIsLoadingYear(false);
    }
  }, []);

  // Trigger year load once byYear is populated
  useEffect(() => {
    if (byYear.length > 0) {
      loadYearData(selectedYear, byYear);
    }
  }, [selectedYear, byYear, loadYearData]);

  const isLoading = isLoadingBase || isLoadingYear;

  return (
    <div className="space-y-8">
      {/* Header + Year Selector */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description="Ontario public sector salary disclosure at a glance."
        />
        <div className="flex items-center gap-2">
          <label htmlFor="dash-year" className="text-sm font-medium text-sunshine-700">
            Viewing year:
          </label>
          <div className="relative">
            <select
              id="dash-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none rounded-lg border border-sunshine-300 bg-white pl-3 pr-8 py-1.5 text-sm font-semibold text-sunshine-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sunshine-400 cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}{y === latestYear ? ' (latest)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-sunshine-500" />
          </div>
        </div>
      </div>

      {/* Row 1: Stat Cards — all scoped to selectedYear */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !yearStats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Employees on List"
              value={formatNumber(yearStats.totalEmployees)}
              description={`Unique disclosures in ${selectedYear}`}
            />
            <StatCard
              title="Total Disclosed Pay"
              value={`$${(yearStats.totalCompensation / 1e9).toFixed(1)}B`}
              description={`Total compensation in ${selectedYear}`}
            />
            <StatCard
              title="Median Salary"
              value={formatCurrency(yearStats.medianSalary)}
              description={`Median across all ${selectedYear} disclosures`}
            />
            <StatCard
              title={selectedYear === latestYear ? 'YoY Growth' : `vs ${selectedYear - 1}`}
              value={`${yearStats.yoyGrowth >= 0 ? '+' : ''}${formatPercent(yearStats.yoyGrowth)}`}
              description={`Change in headcount from ${selectedYear - 1}`}
            />
          </>
        )}
      </div>

      {/* Row 2: Sector + Employer charts — scoped to selectedYear */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
            {selectedYear} — Employees by Sector
          </p>
          <SectorDonut
            data={sectors ?? []}
            isLoading={isLoading || !sectors}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
            {selectedYear} — Top Employers by Headcount
          </p>
          <TopEmployersBar
            data={employers ?? []}
            isLoading={isLoading || !employers}
          />
        </div>
      </div>

      {/* Row 3: Historical trend (always all years) */}
      <div>
        <p className="mb-2 text-xs font-medium text-sunshine-500 uppercase tracking-wide">
          1996–2025 — Year-over-Year Growth
        </p>
        <YoYSparkline
          data={byYear}
          isLoading={isLoadingBase}
        />
      </div>

      {/* Row 4: Am I on the List? */}
      <AmIOnTheList
        medianSalary={yearStats?.medianSalary ?? 122262}
        totalEmployees={yearStats?.totalEmployees ?? 404914}
      />

      {/* Row 5: Data Caveat */}
      <DataCaveatBanner />
    </div>
  );
}
