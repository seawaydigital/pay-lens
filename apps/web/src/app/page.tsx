import { createMetadata } from '@/lib/seo';
import { DashboardClient } from './dashboard-client';

export const metadata = createMetadata('Dashboard');

export default function DashboardPage() {
  return <DashboardClient />;
}
