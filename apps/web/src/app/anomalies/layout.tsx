import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Salary Anomalies',
  'Flagged structural anomalies in Ontario Sunshine List salary data — unusual year-over-year changes, new high earners, and multi-employer entries.'
);

export default function AnomaliesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
