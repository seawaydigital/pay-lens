'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/components/charts/chart-container';
import { formatNumber } from '@/lib/utils';
import { getHistoricalSeries } from '@/lib/db';

interface TrendPoint {
  year: number;
  headcount: number;
}

interface SectorTrendChartProps {
  sectorName: string;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { year: number; headcount: number };
  }>;
  label?: number;
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-sm text-muted-foreground">
        Headcount: {formatNumber(payload[0].value)}
      </p>
    </div>
  );
}

export function SectorTrendChart({ sectorName }: SectorTrendChartProps) {
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistoricalSeries()
      .then((series) => {
        const points: TrendPoint[] = series
          .map((h) => {
            const sectorEntry = h.sectors[sectorName];
            return sectorEntry ? { year: h.year, headcount: sectorEntry.count } : null;
          })
          .filter((p): p is TrendPoint => p !== null)
          .sort((a, b) => a.year - b.year);
        setTrendData(points);
      })
      .catch(() => setTrendData([]))
      .finally(() => setLoading(false));
  }, [sectorName]);

  if (loading) {
    return (
      <ChartContainer title={`Headcount Over Time \u2014 ${sectorName}`} height={300}>
        <div className="flex items-center justify-center h-full">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-sunshine-300 border-t-sunshine-600" />
        </div>
      </ChartContainer>
    );
  }

  if (trendData.length === 0) {
    return (
      <ChartContainer title={`Headcount Over Time \u2014 ${sectorName}`} height={300}>
        <div className="flex items-center justify-center h-full text-sm text-sunshine-400">
          No trend data available for this sector
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title={`Headcount Over Time \u2014 ${sectorName}`} height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trendData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => String(v)}
          />
          <YAxis
            tickFormatter={formatNumber}
            tick={{ fontSize: 12 }}
            width={55}
          />
          <Tooltip content={<TrendTooltip />} />
          <Line
            type="monotone"
            dataKey="headcount"
            stroke="#d97706"
            strokeWidth={2}
            dot={{ r: 4, fill: '#d97706' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
