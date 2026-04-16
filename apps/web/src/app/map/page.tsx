'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

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
        <p className="text-sm text-sunshine-600">Initialising map…</p>
      </div>
    ),
  }
);

const YEARS = [2025, 2024, 2023, 2022, 2021] as const;

// ── Animated progress bar ──────────────────────────────────────────────────────
// Fills to ~80 % while the DB query is in-flight, then snaps to 100 % and fades.

function MapProgressBar({ loading, year }: { loading: boolean; year: number | 'all' }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (loading) {
      setVisible(true);
      setWidth(0);
      timers.current.push(setTimeout(() => setWidth(55), 40));
      timers.current.push(setTimeout(() => setWidth(80), 220));
    } else {
      setWidth(100);
      timers.current.push(setTimeout(() => setVisible(false), 600));
      timers.current.push(setTimeout(() => setWidth(0), 700));
    }
    return () => timers.current.forEach(clearTimeout);
  }, [loading]);

  if (!visible) return null;

  const label = year === 'all' ? 'all years' : `${year}`;

  return (
    <div className="absolute inset-0 z-[1500] flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px]">
      <div className="w-72 space-y-3 rounded-xl border border-sunshine-200 bg-white/95 p-5 shadow-lg">
        <p className="text-sm font-semibold text-sunshine-900">
          Loading {label} regional data…
        </p>
        {/* Track */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-sunshine-100">
          {/* Fill */}
          <div
            className="h-full rounded-full bg-sunshine-500"
            style={{
              width: `${width}%`,
              transition: width === 0 ? 'none' : 'width 0.22s ease-out',
              opacity: width === 100 ? 0 : 1,
              transitionProperty: 'width, opacity',
            }}
          />
        </div>
        <p className="text-xs text-sunshine-500">
          Typically completes in under a second
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2025);

  // Cache loaded year data so switching back to a visited year is instant
  const cache = useState<Map<number | 'all', RegionDetail[]>>(() => new Map())[0];

  useEffect(() => {
    let cancelled = false;

    const cached = cache.get(selectedYear);
    if (cached) {
      setRegions(cached);
      setSelectedRegion(null);
      return;
    }

    setLoading(true);
    setSelectedRegion(null);

    async function fetchData() {
      try {
        const regionsData = await getRegionsByYear(
          selectedYear === 'all' ? undefined : selectedYear
        );
        if (cancelled) return;
        const mapped = regionsData.map((r) => ({
          regionId: r.region_id,
          name: r.name,
          medianSalary: r.median_salary,
          count: r.employee_count,
          lat: r.lat,
          lng: r.lng,
        }));
        cache.set(selectedYear, mapped);
        setRegions(mapped);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedYear, cache]);

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

        {/* ── Year selector ── */}
        <div className="flex items-center gap-1.5 pb-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                selectedYear === y
                  ? 'border-sunshine-800 bg-sunshine-800 text-white shadow-sm'
                  : 'border-sunshine-300 bg-white text-sunshine-700 hover:border-sunshine-500 hover:bg-sunshine-50'
              )}
            >
              {y}
            </button>
          ))}
          <button
            onClick={() => setSelectedYear('all')}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
              selectedYear === 'all'
                ? 'border-sunshine-800 bg-sunshine-800 text-white shadow-sm'
                : 'border-sunshine-300 bg-white text-sunshine-700 hover:border-sunshine-500 hover:bg-sunshine-50'
            )}
          >
            All years
          </button>
        </div>
      </div>

      {/* ── Map container ── */}
      <div
        className="relative mt-4 overflow-hidden rounded-lg border border-sunshine-200 shadow-sm"
        style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
      >
        <MapProgressBar loading={loading} year={selectedYear} />

        <PayMap regions={regions} onRegionSelect={handleRegionSelect} />

        {/* Year badge — bottom-right, above the Leaflet attribution strip */}
        <div className="absolute bottom-8 right-4 z-[1000] rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-sunshine-800 shadow ring-1 ring-sunshine-200 backdrop-blur-sm">
          {selectedYear === 'all' ? 'All years (2021–2025)' : `${selectedYear} data`}
        </div>

        <RegionDetailPanel
          region={selectedRegion}
          onClose={handleClosePanel}
        />
      </div>

      <DataCaveatBanner className="mt-4" />
    </main>
  );
}
