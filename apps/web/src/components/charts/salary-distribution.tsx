'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatNumber } from '@/lib/utils';

interface SalaryDistributionProps {
  data: Array<{ bucket: number; count: number }>;
  userSalary?: number;
  isLoading?: boolean;
}

function formatBucket(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${(value / 1_000).toFixed(0)}K`;
}

interface DistributionTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { bucket: number; count: number };
  }>;
}

function DistributionTooltip({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rangeStart = formatBucket(d.bucket);
  const rangeEnd = formatBucket(d.bucket + 5_000);
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">
        {rangeStart} &ndash; {rangeEnd}
      </p>
      <p className="text-sm text-muted-foreground">
        Employees: {formatNumber(d.count)}
      </p>
    </div>
  );
}

export function SalaryDistribution({
  data,
  userSalary,
  isLoading,
}: SalaryDistributionProps) {
  return (
    <ChartContainer title="Salary Distribution" height={300} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="bucket"
            tickFormatter={formatBucket}
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatNumber}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip content={<DistributionTooltip />} />
          <Bar
            dataKey="count"
            fill="#d97706"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          {userSalary != null && (
            <ReferenceLine
              x={userSalary}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: 'YOU',
                position: 'top',
                fill: '#dc2626',
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
