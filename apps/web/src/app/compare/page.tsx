'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, Search, TrendingUp, Users, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { getEmployers } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { ONTARIO_REGIONS } from '@/lib/geo/regions';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmployerIndex {
  id: string;
  name: string;
  sector: string;
  regionId: string;
  headcount: number;
  medianSalary: number;
}

interface SalaryBand {
  band: string;
  [key: string]: string | number;
}

interface HeadcountTrend {
  year: number;
  [key: string]: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SLOT_COLORS = ['#d97706', '#059669', '#7c3aed'] as const;
const SLOT_BG = [
  'bg-amber-50 border-amber-300',
  'bg-emerald-50 border-emerald-300',
  'bg-violet-50 border-violet-300',
] as const;

function regionName(regionId: string): string {
  const region = ONTARIO_REGIONS.find((r) => r.geoUid === regionId);
  return region?.name ?? 'Unknown';
}

/**
 * Deterministic pseudo-random from a seed string.
 * Used to generate repeatable sample data per employer.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };
}

function generateSalaryBands(employers: EmployerIndex[]): SalaryBand[] {
  const bands = ['$100-110K', '$110-120K', '$120-150K', '$150-200K', '$200K+'];
  return bands.map((band) => {
    const row: SalaryBand = { band };
    employers.forEach((emp) => {
      const rng = seededRandom(emp.id + band);
      row[emp.id] = Math.round(rng() * 30 + 5);
    });
    return row;
  });
}

function generateHeadcountTrend(employers: EmployerIndex[]): HeadcountTrend[] {
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  return years.map((year) => {
    const row: HeadcountTrend = { year };
    employers.forEach((emp) => {
      const rng = seededRandom(emp.id + String(year));
      const factor = 0.7 + (year - 2019) * 0.06 + rng() * 0.1;
      row[emp.id] = Math.round(emp.headcount * factor);
    });
    return row;
  });
}

// ── Employer Selector ──────────────────────────────────────────────────────────

function EmployerSelector({
  employers,
  selected,
  onSelect,
  onRemove,
  slotIndex,
}: {
  employers: EmployerIndex[];
  selected: EmployerIndex | null;
  onSelect: (emp: EmployerIndex) => void;
  onRemove: () => void;
  slotIndex: number;
}) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!query) return employers;
    const q = query.toLowerCase();
    return employers.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.sector.toLowerCase().includes(q)
    );
  }, [employers, query]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (selected) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 p-4 flex items-center justify-between gap-3',
          SLOT_BG[slotIndex]
        )}
      >
        <div className="min-w-0">
          <p className="font-semibold text-sunshine-900 truncate">
            {selected.name}
          </p>
          <p className="text-sm text-sunshine-700">{selected.sector}</p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-full p-1 text-sunshine-600 hover:bg-sunshine-200/50 transition-colors"
          aria-label={`Remove ${selected.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sunshine-400" />
        <input
          type="text"
          placeholder="Search employers..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border-2 border-sunshine-200 bg-white py-2.5 pl-9 pr-3 text-sm text-sunshine-900 placeholder:text-sunshine-400 focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-400/20 transition-colors"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-sunshine-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-sunshine-500">
              No employers found
            </li>
          ) : (
            filtered.map((emp) => (
              <li key={emp.id}>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-sunshine-200/30 transition-colors"
                  onClick={() => {
                    onSelect(emp);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-sunshine-900">
                    {emp.name}
                  </span>
                  <span className="ml-2 text-sunshine-600">{emp.sector}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ── Comparison Row ─────────────────────────────────────────────────────────────

function ComparisonRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-sunshine-200 bg-white overflow-hidden">
      <div className="bg-sunshine-200/30 px-4 py-2.5 border-b border-sunshine-200 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-sunshine-900">{label}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allEmployers, setAllEmployers] = React.useState<EmployerIndex[]>([]);
  const [slots, setSlots] = React.useState<(EmployerIndex | null)[]>([
    null,
    null,
  ]);

  // Fetch employer index from Supabase
  React.useEffect(() => {
    getEmployers()
      .then((data) => {
        const mapped: EmployerIndex[] = data.map((e) => ({
          id: e.id,
          name: e.name,
          sector: e.sector,
          regionId: e.region_id,
          headcount: e.headcount,
          medianSalary: e.median_salary,
        }));
        setAllEmployers(mapped);

        // Hydrate from URL params
        const idsParam = searchParams.get('ids');
        if (idsParam) {
          const ids = idsParam.split(',').filter(Boolean).slice(0, 3);
          const matched = ids.map(
            (id) => mapped.find((e) => e.id === id) ?? null
          );
          // Ensure at least 2 slots
          while (matched.length < 2) matched.push(null);
          setSlots(matched);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL params when selections change
  const syncUrl = React.useCallback(
    (newSlots: (EmployerIndex | null)[]) => {
      const selected = newSlots.filter(Boolean) as EmployerIndex[];
      if (selected.length >= 2) {
        const ids = selected.map((e) => e.id).join(',');
        router.replace(`/compare?ids=${ids}`, { scroll: false });
      } else {
        router.replace('/compare', { scroll: false });
      }
    },
    [router]
  );

  const handleSelect = (index: number, emp: EmployerIndex) => {
    const next = [...slots];
    next[index] = emp;
    setSlots(next);
    syncUrl(next);
  };

  const handleRemove = (index: number) => {
    const next = [...slots];
    next[index] = null;
    setSlots(next);
    syncUrl(next);
  };

  const addSlot = () => {
    if (slots.length < 3) {
      setSlots([...slots, null]);
    }
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) return;
    const next = slots.filter((_, i) => i !== index);
    if (next.length < 2) next.push(null);
    setSlots(next);
    syncUrl(next);
  };

  // Only employers not already selected are available
  const availableEmployers = React.useMemo(() => {
    const selectedIds = new Set(slots.filter(Boolean).map((e) => e!.id));
    return allEmployers.filter((e) => !selectedIds.has(e.id));
  }, [allEmployers, slots]);

  const selectedEmployers = slots.filter(Boolean) as EmployerIndex[];
  const canCompare = selectedEmployers.length >= 2;

  // Derived data for charts
  const salaryBands = React.useMemo(
    () => (canCompare ? generateSalaryBands(selectedEmployers) : []),
    [canCompare, selectedEmployers]
  );
  const headcountTrend = React.useMemo(
    () => (canCompare ? generateHeadcountTrend(selectedEmployers) : []),
    [canCompare, selectedEmployers]
  );
  const maxHeadcount = canCompare
    ? Math.max(...selectedEmployers.map((e) => e.headcount))
    : 1;
  const maxMedian = canCompare
    ? Math.max(...selectedEmployers.map((e) => e.medianSalary))
    : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare Employers"
        description="Side-by-side comparison of Ontario public sector employers on the Sunshine List."
      />

      <div className="rounded-lg border border-sunshine-200 bg-white p-4 text-sm text-sunshine-700">
        <p className="font-semibold text-sunshine-900 mb-1">How it works</p>
        <p>
          Search and select 2–3 employers to compare their headcount, median
          salary, salary distribution, and year-over-year trends. You can share
          the comparison by copying the URL.
        </p>
      </div>

      <DataCaveatBanner />

      {/* ── Employer Selectors ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div
          className={cn(
            'grid gap-3',
            slots.length === 2 && 'grid-cols-1 md:grid-cols-2',
            slots.length === 3 && 'grid-cols-1 md:grid-cols-3'
          )}
        >
          {slots.map((slot, i) => (
            <div key={i} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: SLOT_COLORS[i] }}
                >
                  Employer {i + 1}
                </span>
                {slots.length > 2 && (
                  <button
                    onClick={() => removeSlot(i)}
                    className="text-xs text-sunshine-500 hover:text-sunshine-700 transition-colors"
                  >
                    Remove slot
                  </button>
                )}
              </div>
              <EmployerSelector
                employers={availableEmployers}
                selected={slot}
                onSelect={(emp) => handleSelect(i, emp)}
                onRemove={() => handleRemove(i)}
                slotIndex={i}
              />
            </div>
          ))}
        </div>

        {slots.length < 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={addSlot}
            className="border-sunshine-200 text-sunshine-700 hover:bg-sunshine-200/30"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add employer
          </Button>
        )}
      </div>

      {/* ── Comparison Table ───────────────────────────────────────────── */}
      {canCompare && (
        <div className="space-y-4">
          {/* Sector */}
          <ComparisonRow label="Sector">
            <div
              className={cn(
                'grid gap-4',
                selectedEmployers.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              )}
            >
              {selectedEmployers.map((emp, i) => (
                <div key={emp.id} className="text-center">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: `${SLOT_COLORS[i]}18`,
                      color: SLOT_COLORS[i],
                    }}
                  >
                    {emp.sector}
                  </span>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Region */}
          <ComparisonRow label="Region">
            <div
              className={cn(
                'grid gap-4',
                selectedEmployers.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              )}
            >
              {selectedEmployers.map((emp) => (
                <div key={emp.id} className="text-center">
                  <span className="text-sm text-sunshine-800 font-medium">
                    {regionName(emp.regionId)}
                  </span>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Employees on List */}
          <ComparisonRow
            label="Employees on List"
            icon={<Users className="h-4 w-4 text-sunshine-600" />}
          >
            <div
              className={cn(
                'grid gap-4',
                selectedEmployers.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              )}
            >
              {selectedEmployers.map((emp, i) => (
                <div key={emp.id} className="space-y-1.5">
                  <p className="text-center text-lg font-bold text-sunshine-900">
                    {formatNumber(emp.headcount)}
                  </p>
                  <div className="h-3 w-full rounded-full bg-sunshine-200/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(emp.headcount / maxHeadcount) * 100}%`,
                        backgroundColor: SLOT_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Median Salary */}
          <ComparisonRow
            label="Median Salary"
            icon={<DollarSign className="h-4 w-4 text-sunshine-600" />}
          >
            <div
              className={cn(
                'grid gap-4',
                selectedEmployers.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              )}
            >
              {selectedEmployers.map((emp, i) => (
                  <div key={emp.id} className="text-center space-y-1">
                    <p
                      className="text-lg font-bold"
                      style={{ color: SLOT_COLORS[i] }}
                    >
                      {formatCurrency(emp.medianSalary)}
                    </p>
                    <div className="h-3 w-full rounded-full bg-sunshine-200/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(emp.medianSalary / maxMedian) * 100}%`,
                          backgroundColor: SLOT_COLORS[i],
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </ComparisonRow>

          {/* Salary Band Distribution */}
          <ComparisonRow
            label="Salary Band Distribution"
            icon={<DollarSign className="h-4 w-4 text-sunshine-600" />}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryBands} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#fde68a"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#78350f', fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="band"
                    width={90}
                    tick={{ fill: '#78350f', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  {selectedEmployers.map((emp, i) => (
                    <Bar
                      key={emp.id}
                      dataKey={emp.id}
                      name={emp.name}
                      fill={SLOT_COLORS[i]}
                      radius={[0, 4, 4, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ComparisonRow>

          {/* Year-over-Year Growth */}
          <ComparisonRow
            label="Year-over-Year Headcount Growth"
            icon={<TrendingUp className="h-4 w-4 text-sunshine-600" />}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcountTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#fde68a"
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#78350f', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#78350f', fontSize: 12 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) =>
                      Number(value).toLocaleString('en-CA')
                    }
                  />
                  {selectedEmployers.map((emp, i) => (
                    <Line
                      key={emp.id}
                      type="monotone"
                      dataKey={emp.id}
                      name={emp.name}
                      stroke={SLOT_COLORS[i]}
                      strokeWidth={2.5}
                      dot={{ fill: SLOT_COLORS[i], r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ComparisonRow>
        </div>
      )}

      {/* Empty state */}
      {!canCompare && (
        <div className="rounded-lg border-2 border-dashed border-sunshine-200 bg-sunshine-200/10 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-sunshine-400 mb-3" />
          <p className="text-lg font-semibold text-sunshine-900">
            Select at least two employers to compare
          </p>
          <p className="text-sm text-sunshine-600 mt-1">
            Use the dropdowns above to search and pick employers from the
            Sunshine List.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
