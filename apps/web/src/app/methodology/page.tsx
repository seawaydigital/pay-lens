import { PageHeader } from '@/components/layout/page-header';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Methodology',
  'How Pay Lens processes and presents Ontario Sunshine List data.'
);

export default function MethodologyPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Methodology"
        description="How we collect, clean, and present Ontario Sunshine List data."
      />

      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          Pay Lens aggregates data from the Ontario government&apos;s annual Public
          Sector Salary Disclosure, covering employees earning $100,000 or more
          in a calendar year.
        </p>
        <p>
          Records are deduplicated, employer names are normalized, and role
          families are assigned using keyword-based classification. CPI
          adjustments use Bank of Canada data to express salaries in constant
          2024 dollars.
        </p>
        <p>Full methodology documentation coming soon.</p>
      </div>
    </main>
  );
}
