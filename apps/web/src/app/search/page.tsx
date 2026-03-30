'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SearchResultsTable,
  type Disclosure,
  type SortField,
  type SortDirection,
} from '@/components/search/search-results-table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { exportToCsv } from '@/lib/csv-export';
import { ExportButton } from '@/components/shared/export-button';
import { searchDisclosures, getSectors } from '@/lib/db';
import type { Disclosure as DbDisclosure, Sector } from '@/lib/supabase';

const YEARS = [2025, 2024, 2023];
const PAGE_SIZE = 25;

const SALARY_RANGES = [
  { label: 'All salaries', value: 'all', min: undefined, max: undefined },
  { label: 'Under $120K', value: 'under-120k', min: undefined, max: 120000 },
  { label: '$120K - $150K', value: '120k-150k', min: 120000, max: 150000 },
  { label: '$150K - $200K', value: '150k-200k', min: 150000, max: 200000 },
  { label: '$200K - $300K', value: '200k-300k', min: 200000, max: 300000 },
  { label: '$300K+', value: '300k-plus', min: 300000, max: undefined },
];

function mapDisclosure(d: DbDisclosure): Disclosure {
  return {
    id: d.id,
    year: d.year,
    firstName: d.first_name,
    lastName: d.last_name,
    jobTitle: d.job_title,
    employer: d.employer,
    employerId: d.employer_id ?? '',
    sector: d.sector,
    salaryPaid: d.salary_paid,
    taxableBenefits: d.taxable_benefits,
    totalCompensation: d.total_compensation,
    regionId: d.region_id ?? '',
    regionName: d.region_name ?? '',
  };
}

export default function SearchPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [total, setTotal] = useState(0);
  const [sectorOptions, setSectorOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedSalaryRange, setSelectedSalaryRange] = useState('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('salary');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Debounce query input (300 ms)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  // Load sectors once on mount
  useEffect(() => {
    getSectors()
      .then((sectors: Sector[]) => {
        setSectorOptions(sectors.map((s) => s.name).sort());
      })
      .catch((err) => console.error('Failed to load sectors:', err));
  }, []);

  // Fetch disclosures whenever search params change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const salaryRange = SALARY_RANGES.find((r) => r.value === selectedSalaryRange);

    // searchDisclosures always orders by salary_paid desc in the DB layer.
    // For other sort fields we apply a lightweight client-side sort over the
    // returned page (25 rows), keeping the server doing the heavy lifting.
    void searchDisclosures({
      query: debouncedQuery,
      sector: selectedSector !== 'all' ? selectedSector : undefined,
      year: selectedYear !== 'all' ? parseInt(selectedYear, 10) : undefined,
      minSalary: salaryRange?.min,
      maxSalary: salaryRange?.max,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ data, total: serverTotal }) => {
        if (cancelled) return;

        let mapped = data.map(mapDisclosure);

        // When "All years" is selected, deduplicate by person+employer
        // keeping only the latest year entry per person
        if (!selectedYear || selectedYear === 'all') {
          const seen = new Map<string, Disclosure>();
          for (const d of mapped) {
            const key = `${d.firstName}|${d.lastName}|${d.employer}`.toLowerCase();
            const existing = seen.get(key);
            if (!existing || d.year > existing.year) {
              seen.set(key, d);
            }
          }
          mapped = Array.from(seen.values());
        }

        // Apply client-side sort for fields other than salary (DB always sorts by salary_paid)
        if (sortField !== 'salary') {
          mapped = [...mapped].sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
              case 'name':
                cmp = `${a.lastName}, ${a.firstName}`.localeCompare(
                  `${b.lastName}, ${b.firstName}`
                );
                break;
              case 'employer':
                cmp = a.employer.localeCompare(b.employer);
                break;
              case 'total':
                cmp = a.totalCompensation - b.totalCompensation;
                break;
            }
            return sortDirection === 'asc' ? cmp : -cmp;
          });
        } else if (sortDirection === 'asc') {
          // DB returns desc by default; reverse for asc
          mapped = [...mapped].reverse();
        }

        setDisclosures(mapped);
        setTotal(serverTotal);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load disclosures:', err?.message || err?.code || JSON.stringify(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedSector, selectedYear, selectedSalaryRange, sortField, sortDirection, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedSector, selectedYear, selectedSalaryRange]);

  const totalCompensation = disclosures.reduce((sum, d) => sum + d.totalCompensation, 0);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection(field === 'name' || field === 'employer' ? 'asc' : 'desc');
      }
    },
    [sortField]
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv({
      filename: 'sunshine-list-export.csv',
      headers: ['Name', 'Employer', 'Title', 'Salary', 'Year'],
      rows: disclosures.map((d) => [
        `${d.firstName} ${d.lastName}`,
        d.employer,
        d.jobTitle,
        d.salaryPaid,
        d.year,
      ]),
    });
  }, [disclosures]);

  const hasActiveFilters =
    selectedSector !== 'all' ||
    selectedYear !== '2025' ||
    selectedSalaryRange !== 'all' ||
    query.trim().length > 0;

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedSector('all');
    setSelectedYear('2025');
    setSelectedSalaryRange('all');
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Search"
        description="Find salary disclosures by name, employer, or job title."
      />

      {/* Search and Filters */}
      <div className="mt-6 space-y-4">
        {/* Search input */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sunshine-400" />
          <Input
            type="search"
            placeholder="Search by name, employer, or title..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-sunshine-700">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>

          <div className="w-48">
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger>
                <SelectValue placeholder="All sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {sectorOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select value={selectedSalaryRange} onValueChange={setSelectedSalaryRange}>
              <SelectTrigger>
                <SelectValue placeholder="All salaries" />
              </SelectTrigger>
              <SelectContent>
                {SALARY_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sunshine-600">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <Card className="mt-6 border-sunshine-200">
          <CardContent className="flex flex-wrap items-center gap-6 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-sunshine-600">Showing:</span>
              <Badge variant="secondary" className="font-mono">
                {disclosures.length} results
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-sunshine-600">
                Page compensation:
              </span>
              <span className="text-sm font-semibold text-sunshine-900">
                {formatCurrency(totalCompensation)}
              </span>
            </div>
            {disclosures.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-sunshine-600">Page average:</span>
                <span className="text-sm font-semibold text-sunshine-900">
                  {formatCurrency(
                    Math.round(totalCompensation / disclosures.length)
                  )}
                </span>
              </div>
            )}
            {disclosures.length > 0 && (
              <div className="ml-auto">
                <ExportButton onClick={handleExportCsv} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm text-sunshine-600">Loading disclosures...</div>
          </div>
        ) : (
          <SearchResultsTable
            results={disclosures}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onPageChange={setPage}
          />
        )}
      </div>
    </main>
  );
}
