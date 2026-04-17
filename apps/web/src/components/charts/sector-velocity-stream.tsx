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
  { year: 2023, 'School Boards': 93800, 'Hospitals': 48900, 'Universities': 43200, 'Municipalities': 33400, 'Government': 40800, 'Crown Agencies': 25800 },
  { year: 2024, 'School Boards': 98500, 'Hospitals': 51200, 'Universities': 45800, 'Municipalities': 35600, 'Government': 42100, 'Crown Agencies': 28450 },
  { year: 2025, 'School Boards': 103200, 'Hospitals': 53800, 'Universities': 48100, 'Municipalities': 37500, 'Government': 43500, 'Crown Agencies': 30200 },
];

// Fill + stroke kept slightly different so band boundaries stay crisp
const SECTOR_FILLS: Record<string, string> = {
  'School Boards':  '#fbbf24', // amber   — education
  'Hospitals':      '#f87171', // red     — health
  'Universities':   '#60a5fa', // blue    — academia
  'Municipalities': '#4ade80', // green   — local govt
  'Government':     '#c084fc', // purple  — provincial
  'Crown Agencies': '#22d3ee', // cyan    — agencies
};

const SECTOR_STROKES: Record<string, string> = {
  'School Boards':  '#d97706',
  'Hospitals':      '#dc2626',
  'Universities':   '#2563eb',
  'Municipalities': '#16a34a',
  'Government':     '#9333ea',
  'Crown Agencies': '#0891b2',
};

const SECTOR_KEYS = Object.keys(SECTOR_FILLS);

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
              stroke={SECTOR_STROKES[key]}
              fill={SECTOR_FILLS[key]}
              fillOpacity={0.85}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
