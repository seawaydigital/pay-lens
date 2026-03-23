import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Benchmark My Role',
  'Compare your salary against similar roles in Ontario public sector. See percentiles, distribution, and trends.'
);

export default function BenchmarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
