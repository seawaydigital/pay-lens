'use client';

import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Disclosure {
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

export type SortField = 'name' | 'salary' | 'employer' | 'total';
export type SortDirection = 'asc' | 'desc';

interface SearchResultsTableProps {
  results: Disclosure[];
  page: number;
  pageSize: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
}

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
}) {
  if (field !== activeField) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-sunshine-400" />;
  }
  return direction === 'asc' ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-sunshine-600" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-sunshine-600" />
  );
}

export function SearchResultsTable({
  results,
  page,
  pageSize,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
}: SearchResultsTableProps) {
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const start = (page - 1) * pageSize;
  const paginatedResults = results.slice(start, start + pageSize);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-sunshine-200 bg-cream-50 py-16 text-center">
        <div className="text-4xl mb-3">&#128269;</div>
        <h3 className="text-lg font-semibold text-sunshine-900">
          No results found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-sunshine-600">
          Try adjusting your search terms or filters to find what you are looking
          for.
        </p>
      </div>
    );
  }

  const sortableHeader = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center font-semibold hover:text-sunshine-600 transition-colors"
    >
      {label}
      <SortIcon field={field} activeField={sortField} direction={sortDirection} />
    </button>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-sunshine-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sunshine-200 bg-cream-50">
              <th className="px-4 py-3 text-left text-sunshine-900">
                {sortableHeader('Name', 'name')}
              </th>
              <th className="px-4 py-3 text-left text-sunshine-900">
                Job Title
              </th>
              <th className="px-4 py-3 text-left text-sunshine-900">
                {sortableHeader('Employer', 'employer')}
              </th>
              <th className="px-4 py-3 text-left text-sunshine-900">Sector</th>
              <th className="px-4 py-3 text-right text-sunshine-900">
                {sortableHeader('Salary', 'salary')}
              </th>
              <th className="px-4 py-3 text-right text-sunshine-900">
                Benefits
              </th>
              <th className="px-4 py-3 text-right text-sunshine-900">
                {sortableHeader('Total', 'total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.map((d, i) => (
              <tr
                key={d.id}
                className={cn(
                  'border-b border-sunshine-100 transition-colors hover:bg-sunshine-50',
                  i % 2 === 0 ? 'bg-white' : 'bg-cream-50/50'
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/person/${d.id}/`}
                    className="font-medium text-sunshine-700 hover:text-sunshine-900 hover:underline"
                  >
                    {d.lastName}, {d.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sunshine-800">{d.jobTitle}</td>
                <td className="px-4 py-3 text-sunshine-800">{d.employer}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-xs">
                    {d.sector}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sunshine-800">
                  {formatCurrency(d.salaryPaid)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sunshine-600">
                  {formatCurrency(d.taxableBenefits)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-sunshine-900">
                  {formatCurrency(d.totalCompensation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-sunshine-600">
            Showing {start + 1}&ndash;{Math.min(start + pageSize, results.length)}{' '}
            of {results.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(p)}
                className={cn(
                  'min-w-[2.25rem]',
                  p === page && 'pointer-events-none'
                )}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
