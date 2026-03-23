'use client';

import { useMemo } from 'react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface PercentileRulerProps {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  userSalary?: number;
  totalRecords: number;
}

function interpolatePercentile(
  salary: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number
): number {
  if (salary <= p25) {
    return Math.max(0, (salary / p25) * 25);
  }
  if (salary <= p50) {
    return 25 + ((salary - p25) / (p50 - p25)) * 25;
  }
  if (salary <= p75) {
    return 50 + ((salary - p50) / (p75 - p50)) * 25;
  }
  if (salary <= p90) {
    return 75 + ((salary - p75) / (p90 - p75)) * 15;
  }
  return Math.min(99, 90 + ((salary - p90) / (p90 * 0.5)) * 10);
}

interface PercentileMarkerProps {
  position: number;
  label: string;
  value: string;
}

function PercentileMarker({ position, label, value }: PercentileMarkerProps) {
  return (
    <div
      className="absolute top-0 flex flex-col items-center -translate-x-1/2"
      style={{ left: `${position}%` }}
    >
      <div className="w-0.5 h-4 bg-foreground/60" />
      <span className="text-[10px] font-medium text-muted-foreground mt-0.5 whitespace-nowrap">
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}

export function PercentileRuler({
  p25,
  p50,
  p75,
  p90,
  userSalary,
  totalRecords,
}: PercentileRulerProps) {
  const userPercentile = useMemo(() => {
    if (userSalary == null) return null;
    return interpolatePercentile(userSalary, p25, p50, p75, p90);
  }, [userSalary, p25, p50, p75, p90]);

  const userPosition = useMemo(() => {
    if (userSalary == null) return null;
    const min = p25 * 0.5;
    const max = p90 * 1.3;
    return Math.max(2, Math.min(98, ((userSalary - min) / (max - min)) * 100));
  }, [userSalary, p25, p90]);

  const markerPositions = useMemo(() => {
    const min = p25 * 0.5;
    const max = p90 * 1.3;
    const toPercent = (v: number) =>
      Math.max(2, Math.min(98, ((v - min) / (max - min)) * 100));
    return {
      p25: toPercent(p25),
      p50: toPercent(p50),
      p75: toPercent(p75),
      p90: toPercent(p90),
    };
  }, [p25, p50, p75, p90]);

  const stats = [
    { label: 'P25', value: p25, description: '25th Percentile' },
    { label: 'Median', value: p50, description: '50th Percentile' },
    { label: 'P75', value: p75, description: '75th Percentile' },
    { label: 'P90', value: p90, description: '90th Percentile' },
  ];

  return (
    <div className="space-y-6">
      {/* Ruler */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Lower</span>
          <span className="text-sm font-medium text-foreground">
            Salary Percentiles
            <span className="text-muted-foreground font-normal ml-1">
              ({formatNumber(totalRecords)} records)
            </span>
          </span>
          <span className="text-xs text-muted-foreground">Higher</span>
        </div>

        {/* Gradient bar */}
        <div className="relative">
          <div
            className="h-3 rounded-full w-full"
            style={{
              background:
                'linear-gradient(to right, #059669, #d97706, #b45309, #92400e)',
            }}
          />

          {/* Percentile markers */}
          <div className="relative h-14 mt-1">
            <PercentileMarker
              position={markerPositions.p25}
              label="P25"
              value={formatCurrency(p25)}
            />
            <PercentileMarker
              position={markerPositions.p50}
              label="P50"
              value={formatCurrency(p50)}
            />
            <PercentileMarker
              position={markerPositions.p75}
              label="P75"
              value={formatCurrency(p75)}
            />
            <PercentileMarker
              position={markerPositions.p90}
              label="P90"
              value={formatCurrency(p90)}
            />
          </div>

          {/* User marker */}
          {userSalary != null && userPosition != null && userPercentile != null && (
            <div
              className="absolute -top-2 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${userPosition}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-md" />
              <div className="mt-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                YOU — P{Math.round(userPercentile)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg border bg-card p-3 text-center',
              stat.label === 'Median' && 'ring-2 ring-amber-600/30'
            )}
          >
            <p className="text-xs text-muted-foreground">{stat.description}</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
