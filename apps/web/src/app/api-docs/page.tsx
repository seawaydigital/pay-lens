import { PageHeader } from '@/components/layout/page-header';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'API & Data Export',
  'Access Ontario Sunshine List data via API or download Parquet files.'
);

export default function ApiDocsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="API & Data Export"
        description="Access the full dataset via API or download Parquet files for your own analysis."
      />

      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          The Pay Lens API will provide programmatic access to Ontario Sunshine
          List data, including salary disclosures, employer profiles, and
          aggregated statistics.
        </p>
        <p>
          Downloadable Parquet files will also be available for local analysis
          using tools like DuckDB, Pandas, or Polars.
        </p>
        <p>API documentation coming soon.</p>
      </div>
    </main>
  );
}
