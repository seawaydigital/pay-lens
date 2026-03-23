import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DataCaveatBannerProps {
  className?: string;
}

export function DataCaveatBanner({ className }: DataCaveatBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-sunshine-200 bg-sunshine-200/30 px-4 py-3 text-sm text-sunshine-800',
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sunshine-600" />
      <p>
        This data only includes public sector employees earning $100,000 or
        more. Entry-level and mid-range salaries are not captured.
      </p>
    </div>
  );
}
