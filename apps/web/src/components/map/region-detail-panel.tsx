'use client';

import { X } from 'lucide-react';

import { cn, formatCurrency, formatNumber } from '@/lib/utils';

export interface RegionDetail {
  regionId: string;
  name: string;
  medianSalary: number;
  count: number;
  lat: number;
  lng: number;
}

interface RegionDetailPanelProps {
  region: RegionDetail | null;
  onClose: () => void;
  className?: string;
}

export function RegionDetailPanel({
  region,
  onClose,
  className,
}: RegionDetailPanelProps) {
  if (!region) return null;

  return (
    <div
      className={cn(
        'absolute right-0 top-0 z-[1000] h-full w-80 overflow-y-auto border-l border-sunshine-200 bg-white shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-sunshine-200 px-4 py-3">
        <h2 className="text-lg font-bold text-sunshine-900">{region.name}</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-sunshine-500 hover:bg-sunshine-100 hover:text-sunshine-700"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-sunshine-50 p-3">
            <p className="text-xs text-sunshine-500">Median Salary</p>
            <p className="text-lg font-bold text-sunshine-900">
              {formatCurrency(region.medianSalary)}
            </p>
          </div>
          <div className="rounded-lg bg-sunshine-50 p-3">
            <p className="text-xs text-sunshine-500">Employees</p>
            <p className="text-lg font-bold text-sunshine-900">
              {formatNumber(region.count)}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-sunshine-800">
            Top Employers
          </h3>
          <p className="text-sm text-sunshine-500 italic">
            Employer breakdown coming soon.
          </p>
        </div>

        <div className="rounded-lg border border-sunshine-200 bg-sunshine-50/50 p-3">
          <p className="text-xs text-sunshine-500">Region ID</p>
          <p className="text-sm font-medium text-sunshine-700">
            {region.regionId}
          </p>
        </div>
      </div>
    </div>
  );
}
