'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface Sector {
  id: string;
  name: string;
}

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];
const PAGE_SIZE = 10;

const SALARY_RANGES = [
  { label: 'All salaries', value: 'all', min: 0, max: Infinity },
  { label: 'Under $120K', value: 'under-120k', min: 0, max: 120000 },
  { label: '$120K - $150K', value: '120k-150k', min: 120000, max: 150000 },
  { label: '$150K - $200K', value: '150k-200k', min: 150000, max: 200000 },
  { label: '$200K - $300K', value: '200k-300k', min: 200000, max: 300000 },
  { label: '$300K+', value: '300k-plus', min: 300000, max: Infinity },
];

export default function SearchPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [query, setQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedSalaryRange, setSelectedSalaryRange] = useState('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('salary');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [disclosuresRes, sectorsRes] = await Promise.all([
          fetch('/data/sample-disclosures.json'),
          fetch('/data/sectors.json'),
        ]);
        const disclosuresData = await disclosuresRes.json();
        const sectorsData = await sectorsRes.json();
        setDisclosures(disclosuresData);
        setSectors(sectorsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter and sort
  const filteredResults = useMemo(() => {
    let results = [...disclosures];

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(
        (d) =>
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
          d.lastName.toLowerCase().includes(q) ||
          d.firstName.toLowerCase().includes(q) ||
          d.jobTitle.toLowerCase().includes(q) ||
          d.employer.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== 'all') {
      results = results.filter(
        (d) => d.sector.toLowerCase() === selectedSector.toLowerCase()
      );
    }

    // Year filter
    if (selectedYear !== 'all') {
      results = results.filter((d) => d.year === parseInt(selectedYear, 10));
    }

    // Salary range filter
    if (selectedSalaryRange !== 'all') {
      const range = SALARY_RANGES.find((r) => r.value === selectedSalaryRange);
      if (range) {
        results = results.filter(
          (d) => d.salaryPaid >= range.min && d.salaryPaid < range.max
        );
      }
    }

    // Sort
    results.sort((a, b) => {
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
        case 'salary':
          cmp = a.salaryPaid - b.salaryPaid;
          break;
        case 'total':
          cmp = a.totalCompensation - b.totalCompensation;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return results;
  }, [disclosures, query, selectedSector, selectedYear, selectedSalaryRange, sortField, sortDirection]);

  // Stats
  const totalCompensation = useMemo(
    () => filteredResults.reduce((sum, d) => sum + d.totalCompensation, 0),
    [filteredResults]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, selectedSector, selectedYear, selectedSalaryRange]);

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

  const hasActiveFilters =
    selectedSector !== 'all' ||
    selectedYear !== 'all' ||
    selectedSalaryRange !== 'all' ||
    query.trim().length > 0;

  const clearFilters = () => {
    setQuery('');
    setSelectedSector('all');
    setSelectedYear('all');
    setSelectedSalaryRange('all');
  };

  // Unique sectors from the data (for matching against actual disclosure values)
  const disclosureSectors = useMemo(() => {
    const unique = Array.from(new Set(disclosures.map((d) => d.sector))).sort();
    return unique;
  }, [disclosures]);

  // Merge sector names: use sectors.json names but also include any sectors from disclosures
  const sectorOptions = useMemo(() => {
    const sectorNames = new Set(sectors.map((s) => s.name));
    disclosureSectors.forEach((s) => sectorNames.add(s));
    return Array.from(sectorNames).sort();
  }, [sectors, disclosureSectors]);

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
            onChange={(e) => setQuery(e.target.value)}
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
              <span className="text-sm text-sunshine-600">Results:</span>
              <Badge variant="secondary" className="font-mono">
                {formatNumber(filteredResults.length)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-sunshine-600">
                Total compensation:
              </span>
              <span className="text-sm font-semibold text-sunshine-900">
                {formatCurrency(totalCompensation)}
              </span>
            </div>
            {filteredResults.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-sunshine-600">Average:</span>
                <span className="text-sm font-semibold text-sunshine-900">
                  {formatCurrency(
                    Math.round(totalCompensation / filteredResults.length)
                  )}
                </span>
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
            results={filteredResults}
            page={page}
            pageSize={PAGE_SIZE}
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
