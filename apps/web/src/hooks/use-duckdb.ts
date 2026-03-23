'use client';

import { useEffect, useState } from 'react';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { getDuckDB } from '@/lib/duckdb/init';

export function useDuckDB() {
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    setIsLoading(true);

    getDuckDB()
      .then((instance) => {
        if (!cancelled) {
          setDb(instance);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { db, isLoading, error };
}
