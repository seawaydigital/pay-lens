'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface TimelineDataPoint {
  year: number;
  median: number;
  medianAdjusted: number;
  count: number;
}

interface SalaryTimelineProps {
  data: TimelineDataPoint[];
  showAdjusted: boolean;
  isLoading?: boolean;
}

interface TimelineTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: TimelineDataPoint;
  }>;
  label?: number;
}

function TimelineTooltip({ active, payload, label }: TimelineTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm mb-1">{label}</p>
      <p className="text-sm text-muted-foreground">
        Nominal: {formatCurrency(d.median)}
      </p>
      <p className="text-sm text-muted-foreground">
        Adjusted: {formatCurrency(d.medianAdjusted, true)}
      </p>
      <p className="text-sm text-muted-foreground">
        Employees: {formatNumber(d.count)}
      </p>
    </div>
  );
}

function formatYAxisCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${(value / 1_000).toFixed(0)}K`;
}

export function SalaryTimeline({
  data,
  showAdjusted,
  isLoading,
}: SalaryTimelineProps) {
  return (
    <ChartContainer title="Median Salary Trend" height={300} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => String(v)}
          />
          <YAxis
            tickFormatter={formatYAxisCurrency}
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip content={<TimelineTooltip />} />
          <Legend
            verticalAlign="top"
            height={30}
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="median"
            name="Nominal"
            stroke="#d97706"
            strokeWidth={2}
            dot={{ r: 4, fill: '#d97706' }}
            activeDot={{ r: 6 }}
          />
          {showAdjusted && (
            <Line
              type="monotone"
              dataKey="medianAdjusted"
              name="Inflation-Adjusted"
              stroke="#92400e"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 4, fill: '#92400e' }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
