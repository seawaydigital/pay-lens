import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, icon, className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-3xl font-bold text-sunshine-600">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {icon && (
            <div className="text-sunshine-400">{icon}</div>
          )}
        </div>

        {delta !== undefined && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              delta >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {delta >= 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            <span>
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}% YoY
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
