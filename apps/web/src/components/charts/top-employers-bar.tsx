'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChartContainer } from './chart-container';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface EmployerData {
  name: string;
  id: string;
  sector: string;
  headcount: number;
  medianSalary: number;
}

interface TopEmployersBarProps {
  data: EmployerData[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: EmployerData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold text-sm">{d.name}</p>
      <p className="text-sm text-muted-foreground">
        Headcount: {formatNumber(d.headcount)}
      </p>
      <p className="text-sm text-muted-foreground">
        Median: {formatCurrency(d.medianSalary)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{d.sector}</p>
    </div>
  );
}

export function TopEmployersBar({ data, isLoading }: TopEmployersBarProps) {
  const top10 = data
    .sort((a, b) => b.headcount - a.headcount)
    .slice(0, 10)
    .map((d) => ({
      ...d,
      shortName: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
    }));

  return (
    <ChartContainer title="Top Employers by Headcount" height={350} isLoading={isLoading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5e6c8" />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatNumber(v)}
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={150}
            fontSize={11}
            tick={{ fill: '#78350f' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="headcount"
            fill="#d97706"
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
