'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  '#059669', // green
  '#047857', // green-700
  '#065f46', // green-800
  '#ca8a04', // yellow-600
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SectorData & { fill: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{d.name}</p>
      <p className="text-sm text-muted-foreground">
        Headcount: {formatNumber(d.count)}
      </p>
      <p className="text-sm text-muted-foreground">
        Median: {formatCurrency(d.medianSalary)}
      </p>
    </div>
  );
}

export function SectorDonut({ data, isLoading }: SectorDonutProps) {
  const top8 = data
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <ChartContainer title="Employees by Sector" height={350} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top8}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
          >
            {top8.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
