'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface SectorData {
  name: string;
  count: number;
  medianSalary: number;
}

interface SectorDonutProps {
  data: SectorData[];
  isLoading?: boolean;
}

const COLORS = [
  '#d97706', // amber-600
  '#b45309', // amber-700
  '#92400e', // amber-800
  '#78350f', // amber-900
  '#ca8a04', // yellow-600
  '#059669', // green
  '#047857', // green-700
  '#065f46', // green-800
];

// Shorten long sector names for the Y-axis
function shortName(name: string): string {
  return name
    .replace('Government of Ontario – ', 'Govt – ')
    .replace('Government of Ontario - ', 'Govt – ')
    .replace('Hospitals & Boards of Public Health', 'Hospitals & Public Health')
    .replace('Municipalities & Services', 'Municipalities')
    .replace('Other Public Sector Employers', 'Other Public Sector')
    .replace('Ontario Power Generation', 'OPG');
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SectorData & { fill: string; shortName: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-sunshine-200 bg-white p-3 shadow-md">
      <p className="font-semibold text-sm text-sunshine-900">{d.name}</p>
      <p className="text-sm text-sunshine-600">
        Employees: {formatNumber(d.count)}
      </p>
      <p className="text-sm text-sunshine-600">
        Median Salary: {formatCurrency(d.medianSalary)}
      </p>
    </div>
  );
}

export function SectorDonut({ data, isLoading }: SectorDonutProps) {
  const top8 = data
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((d) => ({ ...d, shortName: shortName(d.name) }));

  const chartHeight = Math.max(300, top8.length * 44);

  return (
    <ChartContainer title="Employees by Sector" height={chartHeight} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top8} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#78350f', fontSize: 12 }}
            tickFormatter={(v) => {
              if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
              return String(v);
            }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={150}
            tick={{ fill: '#78350f', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef3c7' }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {top8.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
