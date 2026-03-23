'use client';

import { useEffect, useState } from 'react';
import { useDuckDB } from './use-duckdb';

export function useParquetQuery<T = Record<string, unknown>>(
  sql: string | null,
  deps: unknown[] = []
) {
  const { db, isLoading: dbLoading, error: dbError } = useDuckDB();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !sql) {
      setData(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const conn = await db.connect();
        const result = await conn.query(sql);
        const rows = result.toArray().map((row: Record<string, unknown>) => {
          const obj: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            obj[key] = row[key];
          }
          return obj as T;
        });
        if (!cancelled) {
          setData(rows);
          setIsLoading(false);
        }
        await conn.close();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, sql, ...deps]);

  return {
    data,
    isLoading: dbLoading || isLoading,
    error: dbError || error,
  };
}
