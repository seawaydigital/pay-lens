'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import type { RegionDetail } from '@/components/map/region-detail-panel';
import { RegionDetailPanel } from '@/components/map/region-detail-panel';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { getRegions } from '@/lib/db';

const PayMap = dynamic(
  () => import('@/components/map/pay-map').then((mod) => mod.PayMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-sunshine-300 bg-sunshine-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
          <p className="text-sm text-sunshine-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const regionsData = await getRegions();
        setRegions(
          regionsData.map((r) => ({
            regionId: r.region_id,
            name: r.name,
            medianSalary: r.median_salary,
            count: r.employee_count,
            lat: r.lat,
            lng: r.lng,
          }))
        );
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRegionSelect = useCallback((region: RegionDetail) => {
    setSelectedRegion(region);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <PageHeader
        title="Regional Pay Map"
        description="Explore median salaries by region across Ontario."
      />

      <div
        className="relative mt-4 overflow-hidden rounded-lg border border-sunshine-200 shadow-sm"
        style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
              <p className="text-sm text-sunshine-600">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            <PayMap regions={regions} onRegionSelect={handleRegionSelect} />
            <RegionDetailPanel
              region={selectedRegion}
              onClose={handleClosePanel}
            />
          </>
        )}
      </div>

      <DataCaveatBanner className="mt-4" />
    </main>
  );
}
