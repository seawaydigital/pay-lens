'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { DataCaveatBanner } from '@/components/layout/data-caveat-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';

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

interface StatsSummary {
  totalEmployees: number;
  totalCompensation: number;
  medianSalary: number;
  yoyGrowth: number;
  latestYear: number;
  byYear: Array<{
    year: number;
    count: number;
    totalComp: number;
    median: number;
  }>;
}

interface SectorData {
  id: string;
  name: string;
  count: number;
  medianSalary: number;
  totalComp: number;
}

interface EmployerData {
  id: string;
  name: string;
  sector: string;
  headcount: number;
  medianSalary: number;
}

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
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [sectors, setSectors] = useState<SectorData[] | null>(null);
  const [employers, setEmployers] = useState<EmployerData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, sectorsRes, employersRes] = await Promise.all([
          fetch('/data/stats-summary.json'),
          fetch('/data/sectors.json'),
          fetch('/data/employers-index.json'),
        ]);

        const [statsData, sectorsData, employersData] = await Promise.all([
          statsRes.json() as Promise<StatsSummary>,
          sectorsRes.json() as Promise<SectorData[]>,
          employersRes.json() as Promise<EmployerData[]>,
        ]);

        setStats(statsData);
        setSectors(sectorsData);
        setEmployers(employersData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Ontario public sector salary disclosure at a glance."
      />

      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Employees"
              value={formatNumber(stats.totalEmployees)}
              description={`On the ${stats.latestYear} Sunshine List`}
            />
            <StatCard
              title="Total Disclosed Pay"
              value={`$${formatNumber(stats.totalCompensation)}`}
              description="Cumulative compensation"
            />
            <StatCard
              title="Median Salary"
              value={formatCurrency(stats.medianSalary)}
              description="Across all disclosed roles"
            />
            <StatCard
              title="YoY Growth"
              value={`+${formatPercent(stats.yoyGrowth)}`}
              description="New disclosures vs. prior year"
            />
          </>
        )}
      </div>

      {/* Row 2: Sector Donut + Top Employers Bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectorDonut
          data={sectors ?? []}
          isLoading={isLoading || !sectors}
        />
        <TopEmployersBar
          data={employers ?? []}
          isLoading={isLoading || !employers}
        />
      </div>

      {/* Row 3: YoY Growth Trend */}
      <YoYSparkline
        data={stats?.byYear ?? []}
        isLoading={isLoading || !stats}
      />

      {/* Row 4: Am I on the List? */}
      <AmIOnTheList
        medianSalary={stats?.medianSalary ?? 118200}
        totalEmployees={stats?.totalEmployees ?? 377412}
      />

      {/* Row 5: Data Caveat */}
      <DataCaveatBanner />
    </div>
  );
}
