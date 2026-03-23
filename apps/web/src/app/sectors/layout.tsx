import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sectors | Pay Lens',
  description:
    'Explore Ontario Sunshine List compensation data by public sector category. Compare headcounts, median salaries, and total compensation across sectors.',
};

export default function SectorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
