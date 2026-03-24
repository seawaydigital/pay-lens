'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Anomaly {
  id: string;
  name: string;
  employer: string;
  salaryPrev: number;
  salaryCurr: number;
  flag: 'large_increase' | 'large_decrease' | 'new_high_entry' | 'multi_employer';
}

interface AnomalyScatterChartProps {
  anomalies: Anomaly[];
}

const FLAG_COLORS: Record<string, string> = {
  large_increase: '#d97706',
  large_decrease: '#2563eb',
  new_high_entry: '#7c3aed',
  multi_employer: '#ea580c',
};

const FLAG_LABELS: Record<string, string> = {
  large_increase: 'Large Increase',
  large_decrease: 'Large Decrease',
  new_high_entry: 'New High Entry',
  multi_employer: 'Multi-Employer',
};

function formatAxisTick(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${(value / 1_000).toFixed(0)}K`;
}

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Anomaly & { x: number; y: number };
  }>;
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-sunshine-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-sunshine-900">{d.name}</p>
      <p className="text-xs text-sunshine-600">{d.employer}</p>
      <div className="mt-1 space-y-0.5 text-sunshine-800">
        <p>
          Previous: {d.salaryPrev === 0 ? 'N/A' : formatCurrency(d.salaryPrev)}
        </p>
        <p>Current: {formatCurrency(d.salaryCurr)}</p>
      </div>
    </div>
  );
}

export function AnomalyScatterChart({ anomalies }: AnomalyScatterChartProps) {
  const flagGroups = Object.keys(FLAG_COLORS).reduce(
    (acc, flag) => {
      acc[flag] = anomalies
        .filter((a) => a.flag === flag)
        .map((a) => ({
          ...a,
          x: a.salaryPrev,
          y: a.salaryCurr,
        }));
      return acc;
    },
    {} as Record<string, Array<Anomaly & { x: number; y: number }>>
  );

  const maxVal = Math.max(
    ...anomalies.map((a) => Math.max(a.salaryPrev, a.salaryCurr)),
    100000
  );
  const axisMax = Math.ceil(maxVal / 50000) * 50000 + 50000;

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
          <XAxis
            type="number"
            dataKey="x"
            name="Previous Salary"
            domain={[0, axisMax]}
            tickFormatter={formatAxisTick}
            tick={{ fontSize: 12, fill: '#92400e' }}
            label={{
              value: 'Previous Salary',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 12, fill: '#b45309' },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Current Salary"
            domain={[0, axisMax]}
            tickFormatter={formatAxisTick}
            tick={{ fontSize: 12, fill: '#92400e' }}
            label={{
              value: 'Current Salary',
              angle: -90,
              position: 'insideLeft',
              offset: 0,
              style: { fontSize: 12, fill: '#b45309' },
            }}
          />
          <Tooltip content={<ScatterTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          {/* Diagonal no-change reference line */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: axisMax, y: axisMax },
            ]}
            stroke="#d1d5db"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'No Change',
              position: 'insideTopRight',
              style: { fontSize: 11, fill: '#9ca3af' },
            }}
          />
          {Object.entries(flagGroups).map(([flag, data]) =>
            data.length > 0 ? (
              <Scatter
                key={flag}
                name={FLAG_LABELS[flag]}
                data={data}
                fill={FLAG_COLORS[flag]}
                fillOpacity={0.8}
                r={6}
              />
            ) : null
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
