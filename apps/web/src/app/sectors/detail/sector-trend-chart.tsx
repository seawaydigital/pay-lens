'use client';

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

interface SectorTrendChartProps {
  sectorName: string;
}

const trendData = [
  { year: 2019, headcount: 32400 },
  { year: 2020, headcount: 35100 },
  { year: 2021, headcount: 38200 },
  { year: 2022, headcount: 41500 },
  { year: 2023, headcount: 44800 },
  { year: 2024, headcount: 48200 },
];

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
