'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/components/charts/chart-container';
import { formatNumber } from '@/lib/utils';

interface DistributionBucket {
  bucket: string;
  count: number;
}

interface SectorDistributionChartProps {
  sectorName: string;
  data?: DistributionBucket[];
}

interface DistTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { bucket: string; count: number };
  }>;
}

function DistTooltip({ active, payload }: DistTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{d.bucket}</p>
      <p className="text-sm text-muted-foreground">
        Employees: {formatNumber(d.count)}
      </p>
    </div>
  );
}

export function SectorDistributionChart({ sectorName, data }: SectorDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title={`Salary Distribution \u2014 ${sectorName}`} height={300}>
        <div className="flex items-center justify-center h-full text-sm text-sunshine-400">
          No distribution data available
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title={`Salary Distribution \u2014 ${sectorName}`} height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={formatNumber}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip content={<DistTooltip />} />
          <Bar
            dataKey="count"
            fill="#d97706"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
