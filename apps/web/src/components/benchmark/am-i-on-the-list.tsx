'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SUNSHINE_THRESHOLD } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface AmIOnTheListProps {
  medianSalary: number;
  totalEmployees: number;
}

export function AmIOnTheList({ medianSalary, totalEmployees }: AmIOnTheListProps) {
  const [salary, setSalary] = useState('');
  const [result, setResult] = useState<{
    onList: boolean;
    percentile?: number;
  } | null>(null);

  function handleCheck() {
    const amount = parseFloat(salary.replace(/[,$]/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    const onList = amount >= SUNSHINE_THRESHOLD;
    let percentile: number | undefined;

    if (onList) {
      // Rough percentile estimation based on the salary relative to median
      // If salary equals median, you're at ~50th percentile of the list
      // We use a simple linear model for approximation
      const ratio = amount / medianSalary;
      if (ratio <= 1) {
        percentile = Math.round(50 * ratio);
      } else {
        // Diminishing returns above median
        percentile = Math.min(99, Math.round(50 + 40 * Math.log2(ratio)));
      }
    }

    setResult({ onList, percentile });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCheck();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Am I on the List?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your annual salary to see if you would appear on Ontario&apos;s
          Sunshine List.
        </p>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="e.g. 105,000"
            value={salary}
            onChange={(e) => {
              setSalary(e.target.value);
              setResult(null);
            }}
            onKeyDown={handleKeyDown}
            className="max-w-[200px]"
          />
          <Button onClick={handleCheck}>Check</Button>
        </div>

        {result && (
          <div
            className={`mt-4 rounded-lg p-4 text-sm ${
              result.onList
                ? 'border border-amber-300 bg-amber-50 text-amber-900'
                : 'border border-green-200 bg-green-50 text-green-900'
            }`}
          >
            {result.onList ? (
              <>
                <p className="font-semibold">
                  Yes, you would appear on the Sunshine List.
                </p>
                {result.percentile !== undefined && (
                  <p className="mt-1">
                    Your salary would place you approximately at the{' '}
                    <span className="font-semibold">
                      {result.percentile}th percentile
                    </span>{' '}
                    among the {totalEmployees.toLocaleString('en-CA')} employees
                    currently on the list.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">
                  No, you would not appear on the Sunshine List.
                </p>
                <p className="mt-1">
                  The disclosure threshold is{' '}
                  {formatCurrency(SUNSHINE_THRESHOLD)}. Your salary is below
                  this amount.
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
