import {
  Download,
  Database,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { Badge } from '@/components/ui/badge';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Data Access & API',
  'Download Ontario Sunshine List data in Parquet and JSON formats, or explore planned API endpoints for programmatic access.'
);

const DATA_FILES = [
  {
    name: 'Full Dataset',
    file: 'sunshine-list-2024.parquet',
    path: '/data/sunshine-list-2024.parquet',
    format: 'Parquet',
    size: '~18 MB',
    description:
      'Complete salary disclosure records for all years, including employer, job title, salary, taxable benefits, sector, and region. Ideal for analysis with DuckDB, Pandas, or Polars.',
    icon: Database,
  },
  {
    name: 'Employers Index',
    file: 'employers-index.json',
    path: '/data/employers-index.json',
    format: 'JSON',
    size: '~120 KB',
    description:
      'Index of all employers with their sector, region, and employee counts. Useful for building employer dropdowns or cross-referencing records.',
    icon: FileJson,
  },
  {
    name: 'Sector Aggregates',
    file: 'sectors.json',
    path: '/data/sectors.json',
    format: 'JSON',
    size: '~8 KB',
    description:
      'Aggregate salary statistics broken down by sector, including counts, averages, and median values across disclosure years.',
    icon: FileJson,
  },
  {
    name: 'Regional Salary Data',
    file: 'region-salaries.json',
    path: '/data/region-salaries.json',
    format: 'JSON',
    size: '~15 KB',
    description:
      'Regional salary distributions and statistics, enabling geographic comparison of public sector compensation across Ontario.',
    icon: FileSpreadsheet,
  },
];

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/search?q=...&sector=...&year=...',
    description:
      'Full-text search across salary disclosures with filtering by sector, year, salary range, and employer.',
  },
  {
    method: 'GET',
    path: '/api/employer/:id',
    description:
      'Retrieve employer profile including sector, region, historical employee counts, and salary distributions.',
  },
  {
    method: 'GET',
    path: '/api/benchmark?role=...&region=...',
    description:
      'Compare salaries for a specific role across regions, sectors, and years. Supports inflation adjustment.',
  },
  {
    method: 'GET',
    path: '/api/stats/summary',
    description:
      'Platform-wide summary statistics including total disclosures, median salary, year-over-year growth, and top sectors.',
  },
];

function FormatBadge({ format }: { format: string }) {
  const colorMap: Record<string, string> = {
    Parquet: 'bg-purple-100 text-purple-800 border-purple-200',
    JSON: 'bg-blue-100 text-blue-800 border-blue-200',
    CSV: 'bg-green-100 text-green-800 border-green-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorMap[format] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}
    >
      {format}
    </span>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Data Access & API"
        description="Download the full dataset for local analysis or explore the planned REST API for programmatic access."
      />

      {/* ── Data Downloads ──────────────────────────────── */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-sunshine-900">
          <Download className="h-5 w-5 text-sunshine-600" />
          Data Downloads
        </h2>
        <p className="mt-1 text-sm text-sunshine-700">
          All files are generated from the Ontario Public Sector Salary
          Disclosure and are free to download.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {DATA_FILES.map((file) => {
            const Icon = file.icon;
            return (
              <div
                key={file.file}
                className="flex flex-col justify-between rounded-lg border border-sunshine-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 shrink-0 text-sunshine-600" />
                      <h3 className="font-semibold text-sunshine-900">
                        {file.name}
                      </h3>
                    </div>
                    <FormatBadge format={file.format} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-sunshine-700">
                    {file.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {file.file}
                    <span className="ml-2 text-sunshine-600">{file.size}</span>
                  </span>
                  <a
                    href={file.path}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md border border-sunshine-200 bg-sunshine-200/40 px-3 py-1.5 text-sm font-medium text-sunshine-800 transition-colors hover:bg-sunshine-200/70"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DuckDB Quick Start ──────────────────────────── */}
      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-sunshine-900">
          <Database className="h-5 w-5 text-sunshine-600" />
          DuckDB Quick Start
        </h2>
        <p className="mt-1 text-sm text-sunshine-700">
          The Parquet file works out of the box with DuckDB, Pandas, and Polars
          &mdash; no server required.
        </p>

        <div className="mt-5 space-y-5">
          {/* SQL example */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-sunshine-800">
              SQL &mdash; query directly with DuckDB CLI
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-relaxed text-green-400">
              <code>{`-- Query the Sunshine List with DuckDB
SELECT employer, job_title, salary
FROM 'sunshine-list-2024.parquet'
WHERE salary > 200000
ORDER BY salary DESC;`}</code>
            </pre>
          </div>

          {/* Python example */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-sunshine-800">
              Python &mdash; load into a DataFrame
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-relaxed text-green-400">
              <code>{`import duckdb

df = duckdb.sql("""
    SELECT * FROM 'sunshine-list-2024.parquet'
    WHERE employer LIKE '%University%'
""").df()

print(df.head(20))`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── API Reference (Coming Soon) ─────────────────── */}
      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-sunshine-900">
          <ExternalLink className="h-5 w-5 text-sunshine-600" />
          API Reference
          <Badge
            variant="outline"
            className="ml-1 border-sunshine-400 text-sunshine-700"
          >
            <Clock className="mr-1 h-3 w-3" />
            Coming Soon
          </Badge>
        </h2>
        <p className="mt-1 text-sm text-sunshine-700">
          API endpoints will be available when the platform moves to server-side
          rendering. The following endpoints are planned:
        </p>

        <div className="mt-5 overflow-x-auto rounded-lg border border-sunshine-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sunshine-200 bg-sunshine-200/30">
              <tr>
                <th className="px-4 py-3 font-semibold text-sunshine-900">
                  Method
                </th>
                <th className="px-4 py-3 font-semibold text-sunshine-900">
                  Endpoint
                </th>
                <th className="px-4 py-3 font-semibold text-sunshine-900">
                  Description
                </th>
                <th className="px-4 py-3 font-semibold text-sunshine-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sunshine-200/50">
              {API_ENDPOINTS.map((ep) => (
                <tr key={ep.path} className="hover:bg-sunshine-200/10">
                  <td className="px-4 py-3">
                    <span className="inline-block rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-800">
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-sunshine-800">
                    {ep.path}
                  </td>
                  <td className="px-4 py-3 text-sunshine-700">
                    {ep.description}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="border-sunshine-400 text-sunshine-600"
                    >
                      Coming Soon
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── License & Attribution ───────────────────────── */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-sunshine-900">
          License &amp; Attribution
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-sunshine-700">
          <p>
            Source data is published by the Government of Ontario under the{' '}
            <strong>Public Sector Salary Disclosure</strong> Act. Raw records are
            released annually and are in the public domain.
          </p>
          <p>
            Pay Lens adds role normalization, inflation adjustment (Bank of
            Canada CPI), and regional tagging on top of the original disclosures.
            All derived datasets available on this page are released under the{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sunshine-600 underline underline-offset-2 hover:text-sunshine-800"
            >
              Creative Commons Attribution 4.0 (CC BY 4.0)
            </a>{' '}
            license.
          </p>
          <p>
            If you use this data in research or a publication, please cite{' '}
            <strong>Pay Lens Ontario</strong> as the source.
          </p>
        </div>
      </section>

      {/* ── Data Caveat ─────────────────────────────────── */}
      <DataCaveatBanner className="mt-10" />
    </main>
  );
}
