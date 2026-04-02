'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Building2, Users, DollarSign, MapPin, Briefcase } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

import { getEmployerById, getEmployerDisclosures } from '@/lib/db';
import type { Disclosure } from '@/lib/turso';
import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface EmployerView {
  id: string;
  name: string;
  sector: string;
  regionId: string;
  headcount: number;
  medianSalary: number;
}

interface SalaryBand {
  band: string;
  count: number;
}

interface TopRole {
  title: string;
  count: number;
  medianSalary: number;
}

interface YearCount {
  year: number;
  count: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSalaryBands(disclosures: Disclosure[]): SalaryBand[] {
  const bands: { label: string; min: number; max: number }[] = [
    { label: '$100-110K', min: 100000, max: 110000 },
    { label: '$110-120K', min: 110000, max: 120000 },
    { label: '$120-150K', min: 120000, max: 150000 },
    { label: '$150-200K', min: 150000, max: 200000 },
    { label: '$200-300K', min: 200000, max: 300000 },
    { label: '$300K+', min: 300000, max: Infinity },
  ];

  return bands
    .map((b) => ({
      band: b.label,
      count: disclosures.filter(
        (d) => d.salary_paid >= b.min && d.salary_paid < b.max
      ).length,
    }))
    .filter((b) => b.count > 0);
}

function buildTopRoles(disclosures: Disclosure[]): TopRole[] {
  const map: Record<string, number[]> = {};
  for (const d of disclosures) {
    const title = d.job_title;
    if (!map[title]) map[title] = [];
    map[title].push(d.salary_paid);
  }

  const roles: TopRole[] = [];
  const titles = Object.keys(map);
  for (const title of titles) {
    const salaries = map[title];
    salaries.sort((a: number, b: number) => a - b);
    const mid = Math.floor(salaries.length / 2);
    const median =
      salaries.length % 2 === 0
        ? (salaries[mid - 1] + salaries[mid]) / 2
        : salaries[mid];
    roles.push({ title, count: salaries.length, medianSalary: median });
  }

  return roles.sort((a, b) => b.count - a.count).slice(0, 10);
}

function buildHeadcountByYear(disclosures: Disclosure[]): YearCount[] {
  const map: Record<number, number> = {};
  for (const d of disclosures) {
    map[d.year] = (map[d.year] ?? 0) + 1;
  }
  return Object.keys(map)
    .map((y) => ({ year: Number(y), count: map[Number(y)] }))
    .sort((a, b) => a.year - b.year);
}

// ── Main Content ─────────────────────────────────────────────────────────────

function EmployerProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [employer, setEmployer] = useState<EmployerView | null>(null);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    Promise.all([getEmployerById(id), getEmployerDisclosures(id)])
      .then(([emp, discs]) => {
        if (emp) {
          setEmployer({
            id: emp.id,
            name: emp.name,
            sector: emp.sector,
            regionId: emp.region_id,
            headcount: emp.headcount,
            medianSalary: emp.median_salary,
          });
          setDisclosures(discs);
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

  const salaryBands = useMemo(
    () => buildSalaryBands(disclosures),
    [disclosures]
  );
  const topRoles = useMemo(() => buildTopRoles(disclosures), [disclosures]);
  const headcountByYear = useMemo(
    () => buildHeadcountByYear(disclosures),
    [disclosures]
  );

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      </main>
    );
  }

  if (notFound || !employer) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/employers"
          className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employers
        </Link>
        <div className="mt-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-sunshine-300" />
          <h2 className="mt-4 text-xl font-semibold text-sunshine-900">
            Employer not found
          </h2>
          <p className="mt-2 text-sm text-sunshine-600">
            The employer you are looking for does not exist or the link may be incorrect.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link
        href="/employers"
        className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employers
      </Link>

      <div className="mt-6">
        <PageHeader title={employer.name} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
            <Building2 className="h-3.5 w-3.5" />
            {employer.sector}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-sunshine-600">
            <MapPin className="h-3.5 w-3.5" />
            Region {employer.regionId}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <Users className="h-4 w-4" />
            <span className="text-sm">Employees on List</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatNumber(employer.headcount)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Median Salary</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(employer.medianSalary)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm">Total Disclosures</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatNumber(disclosures.length)}
          </p>
        </div>
      </div>

      {/* Data sections */}
      <div className="mt-8 space-y-6">
        {/* Salary Distribution */}
        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Salary Distribution
          </h2>
          {salaryBands.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryBands}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#fde68a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="band"
                    tick={{ fill: '#78350f', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#78350f', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) =>
                      [`${Number(value).toLocaleString('en-CA')} employees`, 'Count']
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    name="Employees"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
              No salary data available
            </div>
          )}
        </section>

        {/* Headcount by Year */}
        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Headcount by Year
          </h2>
          {headcountByYear.length > 1 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcountByYear}>
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
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [
                      Number(value).toLocaleString('en-CA'),
                      'Employees',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ fill: '#d97706', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Headcount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
              {headcountByYear.length === 1
                ? `Only ${headcountByYear[0].year} data available (${formatNumber(headcountByYear[0].count)} employees)`
                : 'No year data available'}
            </div>
          )}
        </section>

        {/* Top Roles */}
        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Top Roles
          </h2>
          {topRoles.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sunshine-200">
                    <th className="pb-2 text-left font-semibold text-sunshine-700">
                      Job Title
                    </th>
                    <th className="pb-2 text-right font-semibold text-sunshine-700">
                      Count
                    </th>
                    <th className="pb-2 text-right font-semibold text-sunshine-700">
                      Median Salary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topRoles.map((role, i) => (
                    <tr
                      key={role.title}
                      className={
                        i < topRoles.length - 1
                          ? 'border-b border-sunshine-100'
                          : ''
                      }
                    >
                      <td className="py-2.5 text-sunshine-900 font-medium">
                        {role.title}
                      </td>
                      <td className="py-2.5 text-right text-sunshine-700">
                        {formatNumber(role.count)}
                      </td>
                      <td className="py-2.5 text-right text-sunshine-900 font-medium">
                        {formatCurrency(role.medianSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
              No role data available
            </div>
          )}
        </section>
      </div>

      <DataCaveatBanner className="mt-8" />
    </main>
  );
}

export default function EmployerProfilePage() {
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
      <EmployerProfileContent />
    </Suspense>
  );
}
