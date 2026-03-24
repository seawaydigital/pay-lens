import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Historical Explorer',
  'Explore 29 years of Ontario Sunshine List data from 1996 to 2024. Track salary trends, headcount growth, and inflation-adjusted compensation across public sector employers.'
);

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
