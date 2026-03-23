'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface YearData {
  year: number;
  count: number;
  totalComp: number;
  median: number;
}

interface YoYSparklineProps {
  data: YearData[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: YearData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{d.year}</p>
      <p className="text-sm text-muted-foreground">
        Employees: {d.count.toLocaleString('en-CA')}
      </p>
      <p className="text-sm text-muted-foreground">
        Total Pay: {formatCurrency(d.totalComp)}
      </p>
      <p className="text-sm text-muted-foreground">
        Median: {formatCurrency(d.median)}
      </p>
    </div>
  );
}

export function YoYSparkline({ data, isLoading }: YoYSparklineProps) {
  return (
    <ChartContainer title="Year-over-Year Growth Trend" height={300} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5e6c8" />
          <XAxis
            dataKey="year"
            fontSize={12}
            tick={{ fill: '#78350f' }}
          />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v)}
            fontSize={12}
            tick={{ fill: '#78350f' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#d97706"
            strokeWidth={2}
            fill="url(#amberGradient)"
            dot={{ fill: '#d97706', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#b45309' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
