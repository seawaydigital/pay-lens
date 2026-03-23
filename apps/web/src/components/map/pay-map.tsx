'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useCallback, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
} from 'react-leaflet';

import { formatCurrency, formatNumber } from '@/lib/utils';

import { MapLegend } from './map-legend';
import type { RegionDetail } from './region-detail-panel';

// Fix Leaflet default icon paths for bundled assets
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface PayMapProps {
  regions: RegionDetail[];
  onRegionSelect?: (region: RegionDetail) => void;
}

/** Ontario approximate bounding box */
const ONTARIO_BOUNDS: L.LatLngBoundsExpression = [
  [41.5, -95.5], // SW corner
  [56.5, -74.0], // NE corner
];

const ONTARIO_CENTER: L.LatLngExpression = [50.0, -85.0];
const DEFAULT_ZOOM = 5;

/**
 * Map a salary value to a color on a green-amber-red scale.
 */
function salaryToColor(salary: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (salary - min) / range));

  // Green -> Amber -> Red
  if (t < 0.5) {
    const local = t * 2;
    const r = Math.round(34 + local * (234 - 34));
    const g = Math.round(197 - local * (197 - 179));
    const b = Math.round(94 - local * (94 - 8));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const local = (t - 0.5) * 2;
  const r = Math.round(234 + local * (239 - 234));
  const g = Math.round(179 - local * (179 - 68));
  const b = Math.round(8 + local * (68 - 8));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Scale employee count to circle radius using sqrt scaling.
 */
function countToRadius(count: number, minCount: number, maxCount: number): number {
  const MIN_RADIUS = 5;
  const MAX_RADIUS = 30;
  const range = Math.sqrt(maxCount) - Math.sqrt(minCount) || 1;
  const t = (Math.sqrt(count) - Math.sqrt(minCount)) / range;
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export function PayMap({ regions, onRegionSelect }: PayMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { minSalary, maxSalary, minCount, maxCount } = useMemo(() => {
    const salaries = regions.map((r) => r.medianSalary);
    const counts = regions.map((r) => r.count);
    return {
      minSalary: Math.min(...salaries),
      maxSalary: Math.max(...salaries),
      minCount: Math.min(...counts),
      maxCount: Math.max(...counts),
    };
  }, [regions]);

  const handleClick = useCallback(
    (region: RegionDetail) => {
      onRegionSelect?.(region);
    },
    [onRegionSelect]
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={ONTARIO_CENTER}
        zoom={DEFAULT_ZOOM}
        maxBounds={ONTARIO_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4}
        maxZoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {regions.map((region) => {
          const radius = countToRadius(region.count, minCount, maxCount);
          const color = salaryToColor(region.medianSalary, minSalary, maxSalary);
          const isHovered = hoveredId === region.regionId;

          return (
            <CircleMarker
              key={region.regionId}
              center={[region.lat, region.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: isHovered ? 0.9 : 0.7,
                color: isHovered ? '#1e293b' : '#fff',
                weight: isHovered ? 2.5 : 1.5,
              }}
              eventHandlers={{
                mouseover: () => setHoveredId(region.regionId),
                mouseout: () => setHoveredId(null),
                click: () => handleClick(region),
              }}
            >
              <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
                <div className="min-w-[140px]">
                  <p className="font-bold">{region.name}</p>
                  <p className="text-sm">
                    Median: {formatCurrency(region.medianSalary)}
                  </p>
                  <p className="text-sm">
                    Employees: {formatNumber(region.count)}
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <MapLegend
        minSalary={minSalary}
        maxSalary={maxSalary}
        className="absolute bottom-4 left-4 z-[1000] w-48"
      />
    </div>
  );
}
