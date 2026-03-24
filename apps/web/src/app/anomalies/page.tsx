'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Filter,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const AnomalyScatterChart = dynamic(
  () =>
    import('@/components/charts/anomaly-scatter-chart').then(
      (mod) => mod.AnomalyScatterChart
    ),
  { ssr: false }
);

interface Anomaly {
  id: string;
  name: string;
  employer: string;
  title: string;
  salaryPrev: number;
  salaryCurr: number;
  yearPrev: number;
  yearCurr: number;
  changePercent: number;
  changeAmount: number;
  flag: 'large_increase' | 'large_decrease' | 'new_high_entry' | 'multi_employer';
  possibleReason: string;
}

type SortKey = 'changeAmount' | 'changePercent' | 'salaryCurr';

const FLAG_CONFIG = {
  large_increase: {
    label: 'Large Increase',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    dotColor: '#d97706',
    icon: TrendingUp,
  },
  large_decrease: {
    label: 'Large Decrease',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    dotColor: '#2563eb',
    icon: TrendingDown,
  },
  new_high_entry: {
    label: 'New High Entry',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    dotColor: '#7c3aed',
    icon: UserPlus,
  },
  multi_employer: {
    label: 'Multi-Employer',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    dotColor: '#ea580c',
    icon: Users,
  },
} as const;

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFlag, setFilterFlag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('changeAmount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/data/anomalies.json')
      .then((res) => res.json())
      .then((data: Anomaly[]) => {
        setAnomalies(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...anomalies];
    if (filterFlag !== 'all') {
      result = result.filter((a) => a.flag === filterFlag);
    }
    result.sort((a, b) => {
      const aVal = Math.abs(a[sortBy]);
      const bVal = Math.abs(b[sortBy]);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return result;
  }, [anomalies, filterFlag, sortBy, sortDir]);

  const counts = useMemo(() => {
    const c = { large_increase: 0, large_decrease: 0, new_high_entry: 0, multi_employer: 0 };
    anomalies.forEach((a) => {
      c[a.flag]++;
    });
    return c;
  }, [anomalies]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Salary Anomalies"
          description="Identifying statistically unusual salary changes in Ontario's Sunshine List data"
        />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Anomalies"
        description="Identifying statistically unusual salary changes in Ontario's Sunshine List data"
      />

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          These flags identify statistically unusual changes, not wrongdoing.
          Large salary jumps often have legitimate explanations such as
          severance, retroactive pay, or role changes.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Total Flagged"
          value={anomalies.length}
          icon={AlertTriangle}
          accent="text-sunshine-700"
        />
        <SummaryCard
          label="Large Increases"
          value={counts.large_increase}
          icon={TrendingUp}
          accent="text-amber-600"
        />
        <SummaryCard
          label="Large Decreases"
          value={counts.large_decrease}
          icon={TrendingDown}
          accent="text-blue-600"
        />
        <SummaryCard
          label="New High Entries"
          value={counts.new_high_entry}
          icon={UserPlus}
          accent="text-purple-600"
        />
        <SummaryCard
          label="Multi-Employer"
          value={counts.multi_employer}
          icon={Users}
          accent="text-orange-600"
        />
      </div>

      {/* Scatter chart */}
      <div className="rounded-lg border border-sunshine-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-sunshine-900">
          Salary Change Distribution
        </h2>
        <p className="mb-4 text-sm text-sunshine-700">
          Each point represents a flagged individual. Points above the diagonal
          indicate salary increases; below indicates decreases. New entries
          appear along the left edge.
        </p>
        <AnomalyScatterChart anomalies={anomalies} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sunshine-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-sunshine-600" />
          <select
            value={filterFlag}
            onChange={(e) => setFilterFlag(e.target.value)}
            className="rounded-md border border-sunshine-200 bg-white px-3 py-1.5 text-sm text-sunshine-900 focus:border-sunshine-400 focus:outline-none focus:ring-1 focus:ring-sunshine-400"
          >
            <option value="all">All Types</option>
            <option value="large_increase">Large Increases</option>
            <option value="large_decrease">Large Decreases</option>
            <option value="new_high_entry">New High Entries</option>
            <option value="multi_employer">Multi-Employer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-sunshine-600" />
          <button
            onClick={() => toggleSort('changeAmount')}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              sortBy === 'changeAmount'
                ? 'border-sunshine-400 bg-sunshine-200/50 text-sunshine-900'
                : 'border-sunshine-200 text-sunshine-700 hover:bg-sunshine-200/30'
            )}
          >
            Change Amount {sortBy === 'changeAmount' && (sortDir === 'desc' ? '\u2193' : '\u2191')}
          </button>
          <button
            onClick={() => toggleSort('changePercent')}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              sortBy === 'changePercent'
                ? 'border-sunshine-400 bg-sunshine-200/50 text-sunshine-900'
                : 'border-sunshine-200 text-sunshine-700 hover:bg-sunshine-200/30'
            )}
          >
            Change % {sortBy === 'changePercent' && (sortDir === 'desc' ? '\u2193' : '\u2191')}
          </button>
          <button
            onClick={() => toggleSort('salaryCurr')}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              sortBy === 'salaryCurr'
                ? 'border-sunshine-400 bg-sunshine-200/50 text-sunshine-900'
                : 'border-sunshine-200 text-sunshine-700 hover:bg-sunshine-200/30'
            )}
          >
            Current Salary {sortBy === 'salaryCurr' && (sortDir === 'desc' ? '\u2193' : '\u2191')}
          </button>
        </div>

        <span className="ml-auto text-sm text-sunshine-600">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Anomaly cards */}
      <div className="space-y-3">
        {filtered.map((anomaly) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-sunshine-200 bg-white py-12 text-center text-sunshine-600">
            No anomalies match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-sunshine-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', accent)} />
        <span className="text-sm text-sunshine-600">{label}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', accent)}>{value}</p>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const config = FLAG_CONFIG[anomaly.flag];
  const FlagIcon = config.icon;
  const isIncrease = anomaly.changeAmount >= 0;
  const isNewEntry = anomaly.flag === 'new_high_entry';

  return (
    <div className="rounded-lg border border-sunshine-200 bg-white p-4 transition-colors hover:border-sunshine-400">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-sunshine-900">
              {anomaly.name}
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                config.color
              )}
            >
              <FlagIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-sunshine-700">
            {anomaly.title} &mdash; {anomaly.employer}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-sunshine-600">
            {anomaly.yearPrev}&ndash;{anomaly.yearCurr}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {isNewEntry ? (
            <span className="text-sunshine-600">Not on list</span>
          ) : (
            <span className="font-medium text-sunshine-800">
              {formatCurrency(anomaly.salaryPrev)}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-sunshine-400" />
          <span className="font-medium text-sunshine-800">
            {formatCurrency(anomaly.salaryCurr)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-semibold',
              isIncrease
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            )}
          >
            {isIncrease ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {isIncrease ? '+' : ''}
            {formatCurrency(anomaly.changeAmount)}
          </span>
          {!isNewEntry && (
            <span
              className={cn(
                'text-sm font-medium',
                isIncrease ? 'text-red-600' : 'text-blue-600'
              )}
            >
              ({isIncrease ? '+' : ''}
              {anomaly.changePercent.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs italic text-sunshine-600">
        {anomaly.possibleReason}
      </p>
    </div>
  );
}
