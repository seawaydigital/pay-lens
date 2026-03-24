import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Request Name Removal',
  'Request suppression of your name from Pay Lens Ontario Sunshine List search results.'
);

export default function OptOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
