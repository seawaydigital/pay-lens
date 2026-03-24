import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Report a Data Error',
  'Report incorrect salary, employer, or job title information on Pay Lens Ontario Sunshine List.'
);

export default function ReportErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
