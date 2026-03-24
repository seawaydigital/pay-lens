import Link from 'next/link';
import {
  Database,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Download,
  ShieldAlert,
  Github,
  ExternalLink,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Methodology',
  'How Pay Lens collects, cleans, enriches, and presents Ontario Sunshine List data. Full transparency on our data pipeline, normalization, and limitations.'
);

/* ------------------------------------------------------------------ */
/*  Table of contents definition                                       */
/* ------------------------------------------------------------------ */

const TOC = [
  { id: 'data-source', label: 'Data Source' },
  { id: 'etl-pipeline', label: 'ETL Pipeline' },
  { id: 'job-title-normalization', label: 'Job Title Normalization' },
  { id: 'employer-deduplication', label: 'Employer Deduplication' },
  { id: 'region-tagging', label: 'Region Tagging' },
  { id: 'inflation-adjustment', label: 'Inflation Adjustment' },
  { id: 'multi-source-income', label: 'Multi-Source Income' },
  { id: 'anomaly-detection', label: 'Anomaly Detection' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'open-source', label: 'Open Source' },
] as const;

/* ------------------------------------------------------------------ */
/*  Pipeline steps                                                     */
/* ------------------------------------------------------------------ */

const PIPELINE_STEPS = [
  {
    num: 1,
    title: 'Download',
    icon: Download,
    description:
      'Fetch the latest annual CSV files from the Ontario government open data catalogue.',
  },
  {
    num: 2,
    title: 'Normalize',
    icon: Sparkles,
    description:
      'Clean names (capitalization, whitespace), standardize titles, and parse salary and benefit amounts into consistent numeric formats.',
  },
  {
    num: 3,
    title: 'Enrich',
    icon: Database,
    description:
      'Attach region tags, assign role families via fuzzy matching, and compute CPI-adjusted salaries in constant 2024 dollars.',
  },
  {
    num: 4,
    title: 'Validate',
    icon: CheckCircle2,
    description:
      'Run automated assertions on record counts, salary ranges, and referential integrity. The pipeline halts on any failure.',
  },
  {
    num: 5,
    title: 'Load',
    icon: HardDrive,
    description:
      'Export validated data to Parquet (analytics) and JSON (web) formats ready for the front-end application.',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Title normalization examples                                       */
/* ------------------------------------------------------------------ */

const TITLE_EXAMPLES = [
  { raw: 'Sr. Manager, Operations', canonical: 'Senior Manager' },
  { raw: 'Snr Manager Operations', canonical: 'Senior Manager' },
  { raw: 'Assoc. Professor', canonical: 'Associate Professor' },
  { raw: 'Assoc Prof', canonical: 'Associate Professor' },
  { raw: 'Reg. Nurse', canonical: 'Registered Nurse' },
  { raw: 'RN - Emergency Dept', canonical: 'Registered Nurse' },
] as const;

/* ------------------------------------------------------------------ */
/*  CPI sample table                                                   */
/* ------------------------------------------------------------------ */

const CPI_SAMPLES = [
  { year: 1996, factor: 1.637, nominal: 100_000, adjusted: 163_700 },
  { year: 2000, factor: 1.527, nominal: 100_000, adjusted: 152_700 },
  { year: 2010, factor: 1.25, nominal: 100_000, adjusted: 125_000 },
  { year: 2020, factor: 1.06, nominal: 100_000, adjusted: 106_000 },
  { year: 2024, factor: 1.0, nominal: 100_000, adjusted: 100_000 },
] as const;

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-2xl font-bold tracking-tight text-sunshine-900"
    >
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[0.94rem] leading-relaxed text-sunshine-800/90">
      {children}
    </div>
  );
}

function OutboundLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sunshine-700 underline decoration-sunshine-400 underline-offset-2 hover:text-sunshine-900 hover:decoration-sunshine-600 transition-colors"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MethodologyPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Methodology"
        description="Transparency is core to Pay Lens. This page documents every step between the raw government data and the numbers you see on screen."
      />

      {/* ---- Layout: sidebar TOC + content ---- */}
      <div className="mt-10 flex flex-col lg:flex-row gap-10">
        {/* Table of Contents */}
        <nav
          aria-label="Table of contents"
          className="lg:sticky lg:top-20 lg:self-start lg:w-56 shrink-0"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sunshine-600">
            On this page
          </p>
          <ol className="space-y-1 border-l-2 border-sunshine-200">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block pl-4 py-1 text-sm text-sunshine-700 hover:text-sunshine-900 hover:bg-sunshine-200/20 rounded-r transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-16">
          {/* ======================================================= */}
          {/*  1. DATA SOURCE                                          */}
          {/* ======================================================= */}
          <section id="data-source" className="space-y-4">
            <SectionHeading id="data-source">Data Source</SectionHeading>
            <Prose>
              <p>
                Pay Lens is built on data published under the{' '}
                <strong>
                  Ontario Public Sector Salary Disclosure Act, 1996
                </strong>
                . Every year, the Government of Ontario requires public sector
                organizations to disclose the names, positions, salaries, and
                taxable benefits of all employees earning{' '}
                <strong>$100,000 or more</strong> in a calendar year. This
                disclosure is commonly known as the &ldquo;Sunshine List.&rdquo;
              </p>
              <p>
                The data is published annually, typically in late March, and
                covers the preceding calendar year. It spans all major public
                sector categories: provincial ministries, municipalities,
                hospitals, universities, colleges, school boards, police
                services, crown agencies, and more.
              </p>
              <p>Each record in the raw data includes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Employer</strong> &mdash; the organization name
                </li>
                <li>
                  <strong>Surname &amp; Given Name</strong>
                </li>
                <li>
                  <strong>Position / Job Title</strong>
                </li>
                <li>
                  <strong>Salary Paid</strong> &mdash; gross salary for the
                  calendar year
                </li>
                <li>
                  <strong>Taxable Benefits</strong> &mdash; employer-paid
                  taxable benefits
                </li>
              </ul>
              <p>
                The data is available from the{' '}
                <OutboundLink href="https://www.ontario.ca/page/public-sector-salary-disclosure">
                  Ontario Public Sector Salary Disclosure page
                </OutboundLink>
                .
              </p>

              <div className="rounded-md border border-sunshine-200 bg-sunshine-200/20 px-4 py-3 text-sm text-sunshine-800">
                <strong>Note:</strong> The $100,000 disclosure threshold has
                not changed since the Act was introduced in 1996. In
                inflation-adjusted terms, $100,000 in 1996 is equivalent to
                approximately $163,700 in 2024 dollars. This means the list
                captures a growing share of public sector workers each year,
                not because salaries are necessarily rising faster, but because
                the threshold has eroded in real terms.
              </div>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  2. ETL PIPELINE                                         */}
          {/* ======================================================= */}
          <section id="etl-pipeline" className="space-y-4">
            <SectionHeading id="etl-pipeline">ETL Pipeline</SectionHeading>
            <Prose>
              <p>
                Raw CSV files pass through a five-stage extract-transform-load
                pipeline before reaching the front-end. Each stage is
                deterministic and reproducible.
              </p>
            </Prose>

            {/* Pipeline flow */}
            <div className="overflow-x-auto">
              <div className="flex items-start gap-0 min-w-[700px] py-4">
                {PIPELINE_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.num} className="flex items-start">
                      <div className="flex flex-col items-center w-36">
                        {/* Numbered circle */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sunshine-400 bg-sunshine-200/40 text-sunshine-800 font-bold text-lg">
                          {step.num}
                        </div>
                        {/* Icon */}
                        <Icon className="mt-2 h-5 w-5 text-sunshine-600" />
                        {/* Title */}
                        <p className="mt-1 text-sm font-semibold text-sunshine-900">
                          {step.title}
                        </p>
                        {/* Description */}
                        <p className="mt-1 text-center text-xs leading-snug text-sunshine-700 px-1">
                          {step.description}
                        </p>
                      </div>
                      {/* Connector arrow */}
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className="flex items-center pt-5">
                          <div className="w-6 h-0.5 bg-sunshine-400" />
                          <ArrowRight className="h-4 w-4 text-sunshine-400 -ml-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-sunshine-200 bg-sunshine-200/20 px-4 py-3 text-sm text-sunshine-800">
              <strong>Automation:</strong> The pipeline is scheduled to run
              automatically via GitHub Actions on April 1 each year, shortly
              after the Ontario government publishes new data.
            </div>
          </section>

          {/* ======================================================= */}
          {/*  3. JOB TITLE NORMALIZATION                              */}
          {/* ======================================================= */}
          <section id="job-title-normalization" className="space-y-4">
            <SectionHeading id="job-title-normalization">
              Job Title Normalization
            </SectionHeading>
            <Prose>
              <p>
                The raw Sunshine List contains thousands of free-text job
                titles. Because each employer enters titles independently,
                the same role may appear under many different spellings and
                abbreviations. Without normalization, aggregating or comparing
                salaries by role is unreliable.
              </p>
              <p>
                Pay Lens uses{' '}
                <OutboundLink href="https://github.com/rapidfuzz/RapidFuzz">
                  rapidfuzz
                </OutboundLink>
                , a high-performance fuzzy string matching library, to map raw
                titles to a curated set of <strong>canonical role names</strong>
                . The matching process:
              </p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>
                  Strip punctuation, normalize whitespace, and lower-case the
                  raw title.
                </li>
                <li>
                  Compare against the canonical dictionary using token-set
                  ratio scoring.
                </li>
                <li>
                  Accept matches above a configurable confidence threshold.
                </li>
                <li>
                  Unmatched titles are flagged for manual review and tagged as
                  &ldquo;Other&rdquo; until resolved.
                </li>
              </ol>
              <p>
                The current target is <strong>85%+ coverage</strong> &mdash;
                meaning at least 85% of all records map to a recognized
                canonical title. The remaining records retain their original
                titles.
              </p>
            </Prose>

            {/* Example mapping table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-sunshine-200 rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-sunshine-200/30">
                    <th className="px-4 py-2.5 text-left font-semibold text-sunshine-900 border-b border-sunshine-200">
                      Raw Title
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-sunshine-900 border-b border-sunshine-200">
                      Canonical Title
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TITLE_EXAMPLES.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0 ? 'bg-white' : 'bg-sunshine-200/10'
                      }
                    >
                      <td className="px-4 py-2 border-b border-sunshine-200 font-mono text-xs text-sunshine-800">
                        {row.raw}
                      </td>
                      <td className="px-4 py-2 border-b border-sunshine-200 text-sunshine-900 font-medium">
                        {row.canonical}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border border-sunshine-200 bg-sunshine-200/20 px-4 py-3 text-sm text-sunshine-800">
              <strong>Review queue:</strong> Titles that cannot be matched
              automatically are logged and periodically reviewed. If you notice
              a misclassified title, contributions via GitHub are welcome.
            </div>
          </section>

          {/* ======================================================= */}
          {/*  4. EMPLOYER DEDUPLICATION                               */}
          {/* ======================================================= */}
          <section id="employer-deduplication" className="space-y-4">
            <SectionHeading id="employer-deduplication">
              Employer Deduplication
            </SectionHeading>
            <Prose>
              <p>
                Employer names in the raw data are not standardized. The same
                organization may appear under slightly different names across
                years or even within a single year&apos;s disclosure. Common
                variations include differences in capitalization, punctuation,
                the use of &ldquo;The&rdquo; prefixes, French/English variants,
                and name changes following mergers.
              </p>
              <p>
                Pay Lens maintains a curated <strong>alias table</strong> that
                maps variant names to a single canonical employer identifier.
                This table is stored in version control alongside the ETL code,
                making every change transparent and auditable.
              </p>
              <p>
                The alias table is updated each year when new data is released,
                and community contributions to identify missed aliases are
                encouraged.
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  5. REGION TAGGING                                       */}
          {/* ======================================================= */}
          <section id="region-tagging" className="space-y-4">
            <SectionHeading id="region-tagging">Region Tagging</SectionHeading>
            <Prose>
              <p>
                The raw Sunshine List data does not include any geographic
                metadata. To enable geographic analysis &mdash; such as the
                pay map, regional salary benchmarks, and regional comparisons
                &mdash; Pay Lens assigns each employer to a{' '}
                <strong>Statistics Canada Census Division</strong>.
              </p>
              <p>
                This mapping is maintained as a hand-curated lookup table: each
                employer is associated with the Census Division where its
                headquarters or primary office is located. The Census Division
                boundaries are defined by Statistics Canada and provide a
                consistent, well-documented geographic framework across the
                province.
              </p>
              <p>
                This approach enables features like geographic heatmaps and
                regional benchmarking, but comes with an important caveat: the
                region reflects the employer&apos;s administrative location,
                not necessarily where every individual employee works (see{' '}
                <a
                  href="#limitations"
                  className="text-sunshine-700 underline decoration-sunshine-400 underline-offset-2 hover:text-sunshine-900"
                >
                  Limitations
                </a>
                ).
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  6. INFLATION ADJUSTMENT                                 */}
          {/* ======================================================= */}
          <section id="inflation-adjustment" className="space-y-4">
            <SectionHeading id="inflation-adjustment">
              Inflation Adjustment
            </SectionHeading>
            <Prose>
              <p>
                Comparing a salary from 1996 to one from 2024 in raw
                (nominal) dollars is misleading because the purchasing power
                of a dollar changes over time. Pay Lens converts all
                historical salaries to{' '}
                <strong>constant 2024 Canadian dollars</strong> using the
                Consumer Price Index (CPI) published by the Bank of Canada.
              </p>
              <p>The adjustment formula is:</p>
              <div className="rounded-md border border-sunshine-200 bg-sunshine-200/20 px-4 py-3">
                <p className="font-mono text-sm text-sunshine-900">
                  adjusted = nominal &times; (CPI<sub>2024</sub> / CPI
                  <sub>year</sub>)
                </p>
              </div>
              <p>
                In practice, each year has a pre-computed multiplier. The
                table below shows sample values for key years:
              </p>
            </Prose>

            {/* CPI table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-sunshine-200 rounded-md overflow-hidden">
                <thead>
                  <tr className="bg-sunshine-200/30">
                    <th className="px-4 py-2.5 text-left font-semibold text-sunshine-900 border-b border-sunshine-200">
                      Year
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-sunshine-900 border-b border-sunshine-200">
                      Multiplier
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-sunshine-900 border-b border-sunshine-200">
                      $100K Nominal
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-sunshine-900 border-b border-sunshine-200">
                      In 2024 Dollars
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CPI_SAMPLES.map((row, i) => (
                    <tr
                      key={row.year}
                      className={
                        i % 2 === 0 ? 'bg-white' : 'bg-sunshine-200/10'
                      }
                    >
                      <td className="px-4 py-2 border-b border-sunshine-200 font-medium text-sunshine-900">
                        {row.year}
                      </td>
                      <td className="px-4 py-2 border-b border-sunshine-200 text-right font-mono text-sunshine-800">
                        {row.factor.toFixed(3)}
                      </td>
                      <td className="px-4 py-2 border-b border-sunshine-200 text-right text-sunshine-800">
                        $100,000
                      </td>
                      <td className="px-4 py-2 border-b border-sunshine-200 text-right font-medium text-sunshine-900">
                        ${row.adjusted.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Prose>
              <p>
                CPI data is sourced from the{' '}
                <OutboundLink href="https://www.bankofcanada.ca/rates/price-indexes/cpi/">
                  Bank of Canada
                </OutboundLink>{' '}
                via their Valet API. The full adjustment table covering every
                year from 1996 to 2024 is embedded in the application source
                code.
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  7. MULTI-SOURCE INCOME                                  */}
          {/* ======================================================= */}
          <section id="multi-source-income" className="space-y-4">
            <SectionHeading id="multi-source-income">
              Multi-Source Income
            </SectionHeading>
            <Prose>
              <p>
                Some individuals appear on the Sunshine List under{' '}
                <strong>multiple employers</strong> in the same disclosure
                year. This can occur when a person holds concurrent
                appointments &mdash; for example, a physician who is salaried
                by both a hospital and a university, or an executive on
                multiple public agency boards.
              </p>
              <p>
                The raw government data publishes each employer relationship as
                a separate row and does not aggregate or cross-reference them.
                Pay Lens identifies these multi-employer appearances and flags
                them in the interface so that users can see the full picture
                of an individual&apos;s publicly funded compensation.
              </p>
              <p>
                Multi-employer records are matched by name and year. Because
                the data does not include unique personal identifiers, there is
                a small risk of false matches where two different people share
                the same name (see{' '}
                <a
                  href="#limitations"
                  className="text-sunshine-700 underline decoration-sunshine-400 underline-offset-2 hover:text-sunshine-900"
                >
                  Limitations
                </a>
                ).
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  8. ANOMALY DETECTION                                    */}
          {/* ======================================================= */}
          <section id="anomaly-detection" className="space-y-4">
            <SectionHeading id="anomaly-detection">
              Anomaly Detection
            </SectionHeading>
            <Prose>
              <p>
                Pay Lens automatically flags records that exhibit statistically
                unusual patterns in year-over-year salary data. The goal is to
                surface records that merit closer inspection &mdash; not to
                imply wrongdoing.
              </p>
              <p>A record is flagged if it meets any of these criteria:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Large increase:</strong> year-over-year salary
                  increase exceeding 40%
                </li>
                <li>
                  <strong>Large decrease:</strong> year-over-year salary
                  decrease exceeding 30%
                </li>
                <li>
                  <strong>High-value new entry:</strong> first appearance on the
                  list with a salary above $200,000
                </li>
                <li>
                  <strong>Multi-employer:</strong> the individual appears under
                  two or more employers in the same year
                </li>
              </ul>
              <p>
                There are many legitimate explanations for flagged records,
                including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Promotions or role changes</li>
                <li>Partial-year employment (start/end mid-year)</li>
                <li>Retroactive pay adjustments or settlements</li>
                <li>Transition between part-time and full-time status</li>
                <li>Sabbatical or leave in the prior year</li>
              </ul>
              <p>
                Flagged records are collected on the{' '}
                <Link
                  href="/anomalies"
                  className="text-sunshine-700 underline decoration-sunshine-400 underline-offset-2 hover:text-sunshine-900"
                >
                  Anomalies page
                </Link>
                , where they can be filtered and explored in detail.
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  9. LIMITATIONS                                          */}
          {/* ======================================================= */}
          <section id="limitations" className="space-y-4">
            <SectionHeading id="limitations">Limitations</SectionHeading>
            <Prose>
              <p>
                No dataset is perfect. Understanding the limitations of the
                Sunshine List data is essential for interpreting it
                responsibly.
              </p>
            </Prose>

            <div className="space-y-3">
              {[
                {
                  title: '$100K threshold only',
                  detail:
                    'The Sunshine List only captures employees earning $100,000 or more. Entry-level, mid-career, and most part-time salaries are invisible in this dataset.',
                },
                {
                  title: 'Eroding threshold',
                  detail:
                    'The $100,000 threshold set in 1996 is equivalent to approximately $163,700 in 2024 dollars. The list has grown from roughly 4,500 records in 1996 to over 260,000 today, largely because inflation has pushed more employees above a fixed nominal line.',
                },
                {
                  title: 'No private sector comparison',
                  detail:
                    'This dataset covers the public sector only. Pay Lens does not include private sector salary data, so direct public-vs-private comparisons cannot be made within the platform.',
                },
                {
                  title: 'Title normalization is approximate',
                  detail:
                    'The fuzzy matching process targets 85% coverage, meaning roughly 15% of records retain their original free-text titles. Some misclassifications are inevitable.',
                },
                {
                  title: 'Region reflects employer HQ',
                  detail:
                    'Geographic tagging is based on the employer\'s headquarters or primary office, not the employee\'s actual work location. A hospital system headquartered in Toronto may employ staff across multiple cities.',
                },
                {
                  title: 'Taxable benefits only',
                  detail:
                    'The "benefits" column captures taxable benefits only (e.g., car allowances, housing). Non-taxable benefits like health insurance premiums and pension contributions are not disclosed.',
                },
                {
                  title: 'Contractors excluded',
                  detail:
                    'Self-employed contractors and consultants paid by public sector organizations are not covered by the Salary Disclosure Act, even if they earn above $100,000.',
                },
                {
                  title: 'Name-based matching',
                  detail:
                    'Multi-employer and year-over-year tracking relies on name matching. Common names may produce false positives, and name changes (e.g., marriage) may break linkage.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-md border border-sunshine-200 bg-white px-4 py-3"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sunshine-600" />
                  <div>
                    <p className="text-sm font-semibold text-sunshine-900">
                      {item.title}
                    </p>
                    <p className="text-sm text-sunshine-800/80 mt-0.5">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Prose>
              <p>
                For broader Canadian wage context, Statistics Canada publishes
                detailed labour force data through the{' '}
                <OutboundLink href="https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401">
                  Labour Force Survey
                </OutboundLink>
                .
              </p>
            </Prose>
          </section>

          {/* ======================================================= */}
          {/*  10. OPEN SOURCE                                         */}
          {/* ======================================================= */}
          <section id="open-source" className="space-y-4">
            <SectionHeading id="open-source">Open Source</SectionHeading>
            <Prose>
              <p>
                Transparency extends to the code itself. The entire ETL
                pipeline is open source and available for inspection,
                reproduction, and contribution.
              </p>
            </Prose>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-sunshine-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Github className="h-5 w-5 text-sunshine-700" />
                  <p className="font-semibold text-sunshine-900">
                    ETL Pipeline
                  </p>
                </div>
                <p className="text-sm text-sunshine-800/80 mb-3">
                  Python-based data pipeline for downloading, cleaning, and
                  enriching Sunshine List data. Licensed under the MIT License.
                </p>
                <OutboundLink href="https://github.com/paylens/etl">
                  View on GitHub
                </OutboundLink>
              </div>
              <div className="rounded-md border border-sunshine-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-sunshine-700" />
                  <p className="font-semibold text-sunshine-900">
                    Data License
                  </p>
                </div>
                <p className="text-sm text-sunshine-800/80 mb-3">
                  Processed datasets are released under the{' '}
                  <strong>Creative Commons Attribution 4.0</strong> (CC BY 4.0)
                  license. You are free to share and adapt the data with
                  attribution.
                </p>
                <OutboundLink href="https://creativecommons.org/licenses/by/4.0/">
                  CC BY 4.0 License
                </OutboundLink>
              </div>
            </div>

            <Prose>
              <p>
                Contributions are welcome &mdash; whether it is fixing a
                misclassified title, adding a missing employer alias, improving
                region mappings, or enhancing the pipeline logic. Open an issue
                or pull request on GitHub.
              </p>
            </Prose>
          </section>

          {/* ---- Caveat banner ---- */}
          <DataCaveatBanner className="mt-4" />
        </div>
      </div>
    </main>
  );
}
