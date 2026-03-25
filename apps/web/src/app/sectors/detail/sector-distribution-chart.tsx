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

const fallbackData: DistributionBucket[] = [
  { bucket: '$100K-$110K', count: 4200 },
  { bucket: '$110K-$120K', count: 6800 },
  { bucket: '$120K-$130K', count: 5400 },
  { bucket: '$130K-$140K', count: 3600 },
  { bucket: '$140K-$150K', count: 2800 },
  { bucket: '$150K-$175K', count: 1900 },
  { bucket: '$175K-$200K', count: 980 },
  { bucket: '$200K-$250K', count: 520 },
  { bucket: '$250K+', count: 180 },
];

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
  const chartData = data && data.length > 0 ? data : fallbackData;
  return (
    <ChartContainer title={`Salary Distribution \u2014 ${sectorName}`} height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
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
