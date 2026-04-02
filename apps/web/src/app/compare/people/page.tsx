'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, Search, TrendingUp, User, DollarSign, Calendar, Briefcase } from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { searchDisclosures, getPersonDisclosures } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import type { Disclosure } from '@/lib/turso';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonSlot {
  /** The disclosure used to identify them (the one the user clicked) */
  selected: Disclosure;
  /** All disclosures for this person across all years */
  allYears: Disclosure[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SLOT_COLORS = ['#d97706', '#059669', '#7c3aed'] as const;
const SLOT_BG = [
  'bg-amber-50 border-amber-300',
  'bg-emerald-50 border-emerald-300',
  'bg-violet-50 border-violet-300',
] as const;

function fullName(d: Disclosure) {
  return `${d.first_name} ${d.last_name}`;
}

function latestDisclosure(allYears: Disclosure[]): Disclosure {
  return allYears.reduce((a, b) => (b.year > a.year ? b : a), allYears[0]);
}

// ── Person Selector ──────────────────────────────────────────────────────────

function PersonSelector({
  person,
  onSelect,
  onRemove,
  slotIndex,
}: {
  person: PersonSlot | null;
  onSelect: (slot: PersonSlot) => void;
  onRemove: () => void;
  slotIndex: number;
}) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<Disclosure[]>([]);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — deduplicate by name, keep latest year per person
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchDisclosures({ query, pageSize: 30 });
        // Deduplicate: keep only the latest-year entry per unique name
        const seen = new Map<string, Disclosure>();
        for (const d of data) {
          const key = `${d.first_name.toLowerCase()}|${d.last_name.toLowerCase()}|${d.employer.toLowerCase()}`;
          const existing = seen.get(key);
          if (!existing || d.year > existing.year) {
            seen.set(key, d);
          }
        }
        setResults(Array.from(seen.values()).slice(0, 10));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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

  const handleSelect = async (d: Disclosure) => {
    setOpen(false);
    setQuery('');
    try {
      const allYears = await getPersonDisclosures(d.first_name, d.last_name);
      onSelect({ selected: d, allYears });
    } catch {
      onSelect({ selected: d, allYears: [d] });
    }
  };

  if (person) {
    const latest = latestDisclosure(person.allYears);
    return (
      <div
        className={cn(
          'rounded-lg border-2 p-4 flex items-center justify-between gap-3',
          SLOT_BG[slotIndex]
        )}
      >
        <div className="min-w-0">
          <p className="font-semibold text-sunshine-900 truncate">
            {fullName(latest)}
          </p>
          <p className="text-sm text-sunshine-700 truncate">
            {latest.job_title} at {latest.employer}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-full p-1 text-sunshine-600 hover:bg-sunshine-200/50 transition-colors"
          aria-label={`Remove ${fullName(latest)}`}
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
          placeholder="Search people..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          className="w-full rounded-lg border-2 border-sunshine-200 bg-white py-2.5 pl-9 pr-3 text-sm text-sunshine-900 placeholder:text-sunshine-400 focus:border-sunshine-400 focus:outline-none focus:ring-2 focus:ring-sunshine-400/20 transition-colors"
        />
      </div>
      {open && (query.trim().length > 0) && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-sunshine-200 bg-white shadow-lg">
          {loading ? (
            <li className="px-4 py-3 text-sm text-sunshine-500">
              Searching...
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-sunshine-500">
              No results found
            </li>
          ) : (
            results.map((d) => (
              <li key={d.id}>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-sunshine-200/30 transition-colors"
                  onClick={() => handleSelect(d)}
                >
                  <span className="font-medium text-sunshine-900">
                    {fullName(d)}
                  </span>
                  <span className="ml-1 text-sunshine-600">
                    &mdash; {d.job_title} at {d.employer}
                  </span>
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

function ComparePeopleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [slots, setSlots] = React.useState<(PersonSlot | null)[]>([
    null,
    null,
  ]);

  // Hydrate from URL on mount
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const namesParam = searchParams.get('names');
    if (!namesParam) return;

    const names = namesParam
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (names.length === 0) return;

    // Fill initial slots
    const initialSlots: (PersonSlot | null)[] = names.map(() => null);
    while (initialSlots.length < 2) initialSlots.push(null);
    setSlots(initialSlots);

    // Fetch each person
    names.forEach(async (name, i) => {
      const parts = name.split(' ');
      if (parts.length < 2) return;
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      try {
        const allYears = await getPersonDisclosures(firstName, lastName);
        if (allYears.length > 0) {
          setSlots((prev) => {
            const next = [...prev];
            next[i] = { selected: allYears[0], allYears };
            return next;
          });
        }
      } catch {
        // ignore
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL params
  const syncUrl = React.useCallback(
    (newSlots: (PersonSlot | null)[]) => {
      const selected = newSlots.filter(Boolean) as PersonSlot[];
      if (selected.length >= 2) {
        const names = selected
          .map((s) => fullName(latestDisclosure(s.allYears)))
          .join(',');
        router.replace(`/compare/people?names=${encodeURIComponent(names)}`, {
          scroll: false,
        });
      } else {
        router.replace('/compare/people', { scroll: false });
      }
    },
    [router]
  );

  const handleSelect = (index: number, person: PersonSlot) => {
    const next = [...slots];
    next[index] = person;
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

  const selectedPeople = slots.filter(Boolean) as PersonSlot[];
  const canCompare = selectedPeople.length >= 2;

  // Derived: latest disclosure per person
  const latests = selectedPeople.map((p) => latestDisclosure(p.allYears));

  // Max salary for bar visualization
  const maxSalary = canCompare
    ? Math.max(...latests.map((d) => d.salary_paid))
    : 1;
  const maxTotalComp = canCompare
    ? Math.max(...latests.map((d) => d.salary_paid + d.taxable_benefits))
    : 1;
  const maxBenefits = canCompare
    ? Math.max(...latests.map((d) => d.taxable_benefits))
    : 1;

  // Salary history chart data
  const salaryHistory = React.useMemo(() => {
    if (!canCompare) return [];
    const yearMap: Record<number, Record<string, number>> = {};
    selectedPeople.forEach((p) => {
      p.allYears.forEach((d) => {
        if (!yearMap[d.year]) yearMap[d.year] = {};
        yearMap[d.year][fullName(d)] = d.salary_paid;
      });
    });
    return Object.entries(yearMap)
      .map(([year, values]) => ({ year: Number(year), ...values }))
      .sort((a, b) => a.year - b.year);
  }, [canCompare, selectedPeople]);

  const hasSalaryHistory = salaryHistory.length > 1;

  // Year-over-Year change (latest two years per person)
  const yoyChanges = React.useMemo(() => {
    if (!canCompare) return [];
    return selectedPeople.map((p) => {
      const sorted = [...p.allYears].sort((a, b) => b.year - a.year);
      if (sorted.length < 2) return null;
      const curr = sorted[0];
      const prev = sorted[1];
      const dollarChange = curr.salary_paid - prev.salary_paid;
      const pctChange =
        prev.salary_paid > 0
          ? (dollarChange / prev.salary_paid) * 100
          : 0;
      return {
        from: prev.year,
        to: curr.year,
        dollarChange,
        pctChange,
      };
    });
  }, [canCompare, selectedPeople]);

  const gridCols =
    selectedPeople.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare People"
        description="Side-by-side comparison of individuals on the Ontario Sunshine List."
      />

      <div className="rounded-lg border border-sunshine-200 bg-white p-4 text-sm text-sunshine-700">
        <p className="font-semibold text-sunshine-900 mb-1">How it works</p>
        <p>
          Search for 2–3 people by name to compare their salaries, benefits,
          roles, and salary history across all years they appear on the list.
          All available years of data are included automatically.
        </p>
      </div>

      <DataCaveatBanner />

      {/* ── Person Selectors ─────────────────────────────────────────── */}
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
                  Person {i + 1}
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
              <PersonSelector
                person={slot}
                onSelect={(p) => handleSelect(i, p)}
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
            Add person
          </Button>
        )}
      </div>

      {/* ── Comparison Cards ───────────────────────────────────────────── */}
      {canCompare && (
        <div className="space-y-4">
          {/* Name */}
          <ComparisonRow
            label="Name"
            icon={<User className="h-4 w-4 text-sunshine-600" />}
          >
            <div className={cn('grid gap-4', gridCols)}>
              {selectedPeople.map((p, i) => {
                const latest = latests[i];
                return (
                  <div key={i} className="text-center">
                    <p
                      className="text-lg font-bold"
                      style={{ color: SLOT_COLORS[i] }}
                    >
                      {fullName(latest)}
                    </p>
                  </div>
                );
              })}
            </div>
          </ComparisonRow>

          {/* Current Role */}
          <ComparisonRow
            label="Current Role"
            icon={<Briefcase className="h-4 w-4 text-sunshine-600" />}
          >
            <div className={cn('grid gap-4', gridCols)}>
              {latests.map((d, i) => (
                <div key={i} className="text-center">
                  <p className="text-sm font-medium text-sunshine-900">
                    {d.job_title}
                  </p>
                  <p className="text-xs text-sunshine-600 mt-0.5">
                    {d.employer}
                  </p>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Sector */}
          <ComparisonRow label="Sector">
            <div className={cn('grid gap-4', gridCols)}>
              {latests.map((d, i) => (
                <div key={i} className="text-center">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: `${SLOT_COLORS[i]}18`,
                      color: SLOT_COLORS[i],
                    }}
                  >
                    {d.sector}
                  </span>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Salary (Latest Year) */}
          <ComparisonRow
            label={`Salary (${latests[0]?.year ?? 'Latest'})`}
            icon={<DollarSign className="h-4 w-4 text-sunshine-600" />}
          >
            <div className={cn('grid gap-4', gridCols)}>
              {latests.map((d, i) => (
                <div key={i} className="space-y-1.5">
                  <p
                    className="text-center text-lg font-bold"
                    style={{ color: SLOT_COLORS[i] }}
                  >
                    {formatCurrency(d.salary_paid)}
                  </p>
                  <div className="h-3 w-full rounded-full bg-sunshine-200/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.salary_paid / maxSalary) * 100}%`,
                        backgroundColor: SLOT_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Total Compensation */}
          <ComparisonRow
            label="Total Compensation"
            icon={<DollarSign className="h-4 w-4 text-sunshine-600" />}
          >
            <div className={cn('grid gap-4', gridCols)}>
              {latests.map((d, i) => {
                const total = d.salary_paid + d.taxable_benefits;
                return (
                  <div key={i} className="space-y-1.5">
                    <p
                      className="text-center text-lg font-bold"
                      style={{ color: SLOT_COLORS[i] }}
                    >
                      {formatCurrency(total)}
                    </p>
                    <div className="h-3 w-full rounded-full bg-sunshine-200/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(total / maxTotalComp) * 100}%`,
                          backgroundColor: SLOT_COLORS[i],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ComparisonRow>

          {/* Taxable Benefits */}
          <ComparisonRow label="Taxable Benefits">
            <div className={cn('grid gap-4', gridCols)}>
              {latests.map((d, i) => (
                <div key={i} className="space-y-1.5">
                  <p
                    className="text-center text-lg font-bold"
                    style={{ color: SLOT_COLORS[i] }}
                  >
                    {formatCurrency(d.taxable_benefits)}
                  </p>
                  <div className="h-3 w-full rounded-full bg-sunshine-200/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${maxBenefits > 0 ? (d.taxable_benefits / maxBenefits) * 100 : 0}%`,
                        backgroundColor: SLOT_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Years on List */}
          <ComparisonRow
            label="Years on List"
            icon={<Calendar className="h-4 w-4 text-sunshine-600" />}
          >
            <div className={cn('grid gap-4', gridCols)}>
              {selectedPeople.map((p, i) => (
                <div key={i} className="text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: SLOT_COLORS[i] }}
                  >
                    {p.allYears.length}
                  </p>
                  <p className="text-xs text-sunshine-600 mt-0.5">
                    {p.allYears
                      .map((d) => d.year)
                      .sort()
                      .join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </ComparisonRow>

          {/* Salary History Chart */}
          {hasSalaryHistory && (
            <ComparisonRow
              label="Salary History"
              icon={<TrendingUp className="h-4 w-4 text-sunshine-600" />}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salaryHistory}>
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
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    {selectedPeople.map((p, i) => {
                      const name = fullName(latestDisclosure(p.allYears));
                      return (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          name={name}
                          stroke={SLOT_COLORS[i]}
                          strokeWidth={2.5}
                          dot={{ fill: SLOT_COLORS[i], r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ComparisonRow>
          )}

          {/* Year-over-Year Change */}
          {yoyChanges.some((c) => c !== null) && (
            <ComparisonRow
              label="Year-over-Year Change"
              icon={<TrendingUp className="h-4 w-4 text-sunshine-600" />}
            >
              <div className={cn('grid gap-4', gridCols)}>
                {yoyChanges.map((change, i) => (
                  <div key={i} className="text-center">
                    {change ? (
                      <>
                        <p
                          className="text-lg font-bold"
                          style={{ color: SLOT_COLORS[i] }}
                        >
                          {change.dollarChange >= 0 ? '+' : ''}
                          {formatCurrency(change.dollarChange)}
                        </p>
                        <p className="text-sm text-sunshine-700">
                          {change.pctChange >= 0 ? '+' : ''}
                          {change.pctChange.toFixed(1)}%
                        </p>
                        <p className="text-xs text-sunshine-500 mt-0.5">
                          {change.from} &rarr; {change.to}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-sunshine-500">
                        Only 1 year of data
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ComparisonRow>
          )}
        </div>
      )}

      {/* Empty state */}
      {!canCompare && (
        <div className="rounded-lg border-2 border-dashed border-sunshine-200 bg-sunshine-200/10 p-12 text-center">
          <User className="mx-auto h-10 w-10 text-sunshine-400 mb-3" />
          <p className="text-lg font-semibold text-sunshine-900">
            Select at least two people to compare
          </p>
          <p className="text-sm text-sunshine-600 mt-1">
            Use the search boxes above to find individuals from the Sunshine
            List.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ComparePeoplePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      }
    >
      <ComparePeopleContent />
    </Suspense>
  );
}
