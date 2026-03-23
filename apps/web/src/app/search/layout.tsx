import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Search',
  'Search Ontario public sector salary disclosures by name, employer, or job title.'
);

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
