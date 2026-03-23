'use client';

import { useQueryState, parseAsBoolean } from 'nuqs';

export function useInflation() {
  const [adjusted, setAdjusted] = useQueryState(
    'adjusted',
    parseAsBoolean.withDefault(false)
  );

  const toggle = () => setAdjusted(!adjusted);

  const label = adjusted ? '2024 dollars' : 'Nominal dollars';

  return { adjusted, toggle, label };
}
