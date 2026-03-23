'use client';

import Link from 'next/link';
import { Building2, Users, DollarSign } from 'lucide-react';

import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface EmployerCardProps {
  id: string;
  name: string;
  sector: string;
  headcount: number;
  medianSalary: number;
  className?: string;
}

export function EmployerCard({
  id,
  name,
  sector,
  headcount,
  medianSalary,
  className,
}: EmployerCardProps) {
  return (
    <Link
      href={`/employers/profile/?id=${id}`}
      className={cn(
        'group block rounded-lg border border-sunshine-200 bg-white p-5 shadow-sm transition-all hover:border-sunshine-400 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-sunshine-900 group-hover:text-sunshine-700">
            {name}
          </h3>
          <span className="mt-1 inline-block rounded-full bg-sunshine-100 px-2.5 py-0.5 text-xs font-medium text-sunshine-700">
            {sector}
          </span>
        </div>
        <Building2 className="h-5 w-5 shrink-0 text-sunshine-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-sunshine-500" />
          <div>
            <p className="text-xs text-sunshine-600">Headcount</p>
            <p className="text-sm font-semibold text-sunshine-900">
              {formatNumber(headcount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-sunshine-500" />
          <div>
            <p className="text-xs text-sunshine-600">Median Salary</p>
            <p className="text-sm font-semibold text-sunshine-900">
              {formatCurrency(medianSalary)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
