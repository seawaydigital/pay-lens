'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatNumber } from '@/lib/utils';

interface SectorVelocityProps {
  isLoading?: boolean;
}

const velocityData = [
  { year: 2019, 'School Boards': 72800, 'Hospitals': 38200, 'Universities': 32400, 'Municipalities': 24800, 'Government': 35600, 'Crown Agencies': 18200 },
  { year: 2020, 'School Boards': 78200, 'Hospitals': 40100, 'Universities': 34600, 'Municipalities': 26200, 'Government': 36800, 'Crown Agencies': 19800 },
  { year: 2021, 'School Boards': 83400, 'Hospitals': 43500, 'Universities': 37200, 'Municipalities': 28900, 'Government': 38200, 'Crown Agencies': 21400 },
  { year: 2022, 'School Boards': 88100, 'Hospitals': 46200, 'Universities': 40100, 'Municipalities': 31200, 'Government': 39500, 'Crown Agencies': 23600 },
  { year: 2023, 'School Boards': 93800, 'Hospitals': 48900, 'Universities': 43200, 'Municipalities': 33400, 'Government': 40800, 'Crown Agencies': 25800 },
  { year: 2024, 'School Boards': 98500, 'Hospitals': 51200, 'Universities': 45800, 'Municipalities': 35600, 'Government': 42100, 'Crown Agencies': 28450 },
];

const SECTOR_COLORS: Record<string, string> = {
  'School Boards': '#d97706',
  'Hospitals': '#92400e',
  'Universities': '#b45309',
  'Municipalities': '#78716c',
  'Government': '#a16207',
  'Crown Agencies': '#65a30d',
};

const SECTOR_KEYS = Object.keys(SECTOR_COLORS);

interface VelocityTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  label?: number;
}

function VelocityTooltip({ active, payload, label }: VelocityTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.dataKey}:</span>
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SectorVelocityStream({ isLoading }: SectorVelocityProps) {
  return (
    <ChartContainer title="Sector Salary Velocity" height={360} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={velocityData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
          <Tooltip content={<VelocityTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
          {SECTOR_KEYS.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={SECTOR_COLORS[key]}
              fill={SECTOR_COLORS[key]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
