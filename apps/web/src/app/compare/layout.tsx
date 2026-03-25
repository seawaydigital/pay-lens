import { createMetadata } from '@/lib/seo';
import { CompareTabs } from './compare-tabs';

export const metadata = createMetadata(
  'Compare',
  'Side-by-side comparison of Ontario public sector employers and individuals.'
);

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <CompareTabs />
      {children}
    </div>
  );
}
