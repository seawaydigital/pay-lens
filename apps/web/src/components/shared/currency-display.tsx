'use client';

import { formatCurrency } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number;
  adjusted?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  adjusted = false,
  className,
}: CurrencyDisplayProps) {
  return <span className={className}>{formatCurrency(amount, adjusted)}</span>;
}
