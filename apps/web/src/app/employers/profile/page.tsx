'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Users, DollarSign, MapPin } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface Employer {
  id: string;
  name: string;
  sector: string;
  regionId: string;
  headcount: number;
  medianSalary: number;
}

function EmployerProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [employer, setEmployer] = useState<Employer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    fetch('/data/employers-index.json')
      .then((res) => res.json())
      .then((data: Employer[]) => {
        const found = data.find((e) => e.id === id);
        if (found) {
          setEmployer(found);
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
      </div>

      {/* Placeholder sections */}
      <div className="mt-8 space-y-6">
        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Salary Distribution
          </h2>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
            Chart coming soon
          </div>
        </section>

        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Headcount Trend
          </h2>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
            Chart coming soon
          </div>
        </section>

        <section className="rounded-lg border border-sunshine-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-sunshine-900">
            Top Roles
          </h2>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
            Data coming soon
          </div>
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
