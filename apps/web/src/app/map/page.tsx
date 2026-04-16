'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import type { RegionDetail } from '@/components/map/region-detail-panel';
import { RegionDetailPanel } from '@/components/map/region-detail-panel';
import { DataCaveatBanner } from '@/components/shared/data-caveat-banner';
import { getRegionsByYear } from '@/lib/db';
import { cn } from '@/lib/utils';

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

const YEARS = [2025, 2024, 2023, 2022, 2021] as const;

export default function MapPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2025);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedRegion(null);

    async function fetchData() {
      try {
        const regionsData = await getRegionsByYear(
          selectedYear === 'all' ? undefined : selectedYear
        );
        if (cancelled) return;
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
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedYear]);

  const handleRegionSelect = useCallback((region: RegionDetail) => {
    setSelectedRegion(region);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Regional Pay Map"
          description="Explore median salaries by region across Ontario."
        />

        {/* Year selector */}
        <div className="flex items-center gap-1.5 pb-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                selectedYear === y
                  ? 'bg-sunshine-500 text-white'
                  : 'bg-sunshine-100 text-sunshine-700 hover:bg-sunshine-200'
              )}
            >
              {y}
            </button>
          ))}
          <button
            onClick={() => setSelectedYear('all')}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              selectedYear === 'all'
                ? 'bg-sunshine-500 text-white'
                : 'bg-sunshine-100 text-sunshine-700 hover:bg-sunshine-200'
            )}
          >
            All years
          </button>
        </div>
      </div>

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

            {/* Year badge — always visible on the map */}
            <div className="absolute bottom-4 left-4 z-[1000] rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-sunshine-800 shadow ring-1 ring-sunshine-200 backdrop-blur-sm">
              {selectedYear === 'all' ? 'All years (2021–2025)' : `${selectedYear} data`}
            </div>

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
