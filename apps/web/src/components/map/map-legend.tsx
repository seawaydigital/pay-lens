'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface MapLegendProps {
  minSalary: number;
  maxSalary: number;
  className?: string;
}

const GRADIENT_STOPS = [
  { color: '#22c55e', label: 'Lower' },
  { color: '#eab308', label: '' },
  { color: '#ef4444', label: 'Higher' },
];

export function MapLegend({ minSalary, maxSalary, className }: MapLegendProps) {
  const midSalary = Math.round((minSalary + maxSalary) / 2);

  return (
    <div
      className={cn(
        'rounded-lg border border-sunshine-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <p className="mb-2 text-xs font-semibold text-sunshine-800">
        Median Salary
      </p>
      <div
        className="h-3 w-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${GRADIENT_STOPS.map((s) => s.color).join(', ')})`,
        }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-sunshine-600">
        <span>{formatCurrency(minSalary)}</span>
        <span>{formatCurrency(midSalary)}</span>
        <span>{formatCurrency(maxSalary)}</span>
      </div>
      <div className="mt-2 border-t border-sunshine-100 pt-2">
        <p className="text-[10px] text-sunshine-500">
          Circle size = employee count
        </p>
      </div>
    </div>
  );
}
