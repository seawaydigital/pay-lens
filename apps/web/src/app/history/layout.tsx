import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Historical Explorer',
  'Explore Ontario Sunshine List data from 2023 to 2025. Track salary trends, headcount growth, and inflation-adjusted compensation across public sector employers.'
);

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
