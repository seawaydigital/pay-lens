import type { ReactNode } from 'react';

import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata(
  'Regional Pay Map',
  'Explore median salaries by region across Ontario on an interactive map.'
);

export default function MapLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
