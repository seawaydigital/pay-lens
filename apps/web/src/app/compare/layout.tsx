import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Compare Employers',
  'Side-by-side comparison of Ontario public sector employers.'
);

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
