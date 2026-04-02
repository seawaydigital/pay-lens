'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(
  () => import('./dashboard-client').then((m) => m.DashboardClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
      </div>
    ),
  }
);

export default function DashboardPage() {
  return <DashboardClient />;
}
