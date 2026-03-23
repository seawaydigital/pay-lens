'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, Briefcase, Building2, DollarSign } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { formatCurrency } from '@/lib/utils';

interface Disclosure {
  id: string;
  year: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  employer: string;
  employerId: string;
  sector: string;
  salaryPaid: number;
  taxableBenefits: number;
  totalCompensation: number;
  regionId: string;
  regionName: string;
}

function PersonDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [person, setPerson] = useState<Disclosure | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    fetch('/data/sample-disclosures.json')
      .then((res) => res.json())
      .then((data: Disclosure[]) => {
        const found = data.find((d) => d.id === id);
        if (found) {
          setPerson(found);
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

  if (notFound || !person) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
        <div className="mt-12 text-center">
          <User className="mx-auto h-12 w-12 text-sunshine-300" />
          <h2 className="mt-4 text-xl font-semibold text-sunshine-900">
            Employee not found
          </h2>
          <p className="mt-2 text-sm text-sunshine-600">
            The employee record you are looking for does not exist or the link may be incorrect.
          </p>
        </div>
      </main>
    );
  }

  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-sunshine-600 hover:text-sunshine-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Link>

      <div className="mt-6">
        <PageHeader title={fullName} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
            <Briefcase className="h-3.5 w-3.5" />
            {person.jobTitle}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sunshine-100 px-3 py-1 text-sm font-medium text-sunshine-700">
            <Building2 className="h-3.5 w-3.5" />
            {person.sector}
          </span>
          <span className="text-sm text-sunshine-600">
            {person.year} Disclosure
          </span>
        </div>
      </div>

      {/* Employer link */}
      <div className="mt-6 rounded-lg border border-sunshine-200 bg-white p-5">
        <p className="text-sm text-sunshine-600">Employer</p>
        <Link
          href={`/employers/profile/?id=${person.employerId}`}
          className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-sunshine-700 hover:text-sunshine-900 hover:underline"
        >
          <Building2 className="h-4 w-4" />
          {person.employer}
        </Link>
        <p className="mt-1 text-sm text-sunshine-500">{person.regionName}</p>
      </div>

      {/* Salary breakdown */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Salary Paid</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(person.salaryPaid)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Taxable Benefits</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(person.taxableBenefits)}
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sunshine-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Compensation</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sunshine-900">
            {formatCurrency(person.totalCompensation)}
          </p>
        </div>
      </div>

      {/* Placeholder for salary timeline */}
      <section className="mt-8 rounded-lg border border-sunshine-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-sunshine-900">
          Salary Timeline
        </h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-sunshine-50 text-sm text-sunshine-400">
          Chart coming soon
        </div>
      </section>

      <DataCaveatBanner className="mt-8" />
    </main>
  );
}

export default function PersonPage() {
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
      <PersonDetailContent />
    </Suspense>
  );
}
