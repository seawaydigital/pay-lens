'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/components/charts/chart-container';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface InstitutionData {
  type: string;
  median: number;
  count: number;
}

interface InstitutionBreakdownProps {
  data: InstitutionData[];
  isLoading?: boolean;
}

const GRADIENT_COLORS = [
  '#d97706', // amber-600
  '#b45309', // amber-700
  '#92400e', // amber-800
  '#78350f', // amber-900
];

function getBarColor(index: number, total: number): string {
  if (total <= 1) return GRADIENT_COLORS[0];
  const ratio = index / (total - 1);
  const colorIndex = Math.min(
    Math.floor(ratio * GRADIENT_COLORS.length),
    GRADIENT_COLORS.length - 1
  );
  return GRADIENT_COLORS[colorIndex];
}

interface BreakdownTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: InstitutionData;
  }>;
}

function BreakdownTooltip({ active, payload }: BreakdownTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{d.type}</p>
      <p className="text-sm text-muted-foreground">
        Median: {formatCurrency(d.median)}
      </p>
      <p className="text-sm text-muted-foreground">
        Employees: {formatNumber(d.count)}
      </p>
    </div>
  );
}

export function InstitutionBreakdown({
  data,
  isLoading,
}: InstitutionBreakdownProps) {
  const sorted = [...data].sort((a, b) => b.median - a.median);
  const chartHeight = Math.max(300, sorted.length * 40);

  return (
    <ChartContainer
      title="By Institution Type"
      height={chartHeight}
      isLoading={isLoading}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `$${(v / 1_000_000).toFixed(1)}M`
                : `$${(v / 1_000).toFixed(0)}K`
            }
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="type"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<BreakdownTooltip />} />
          <Bar dataKey="median" radius={[0, 4, 4, 0]} maxBarSize={30}>
            {sorted.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(index, sorted.length)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
