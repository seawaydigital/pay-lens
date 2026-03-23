'use client';

import { useCallback, useRef, useState } from 'react';

interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  score: number;
}

interface PagefindInstance {
  search: (query: string) => Promise<{
    results: Array<{
      id: string;
      score: number;
      data: () => Promise<{ url: string; meta: { title: string }; excerpt: string }>;
    }>;
  }>;
}

export function usePagefind() {
  const [isLoading, setIsLoading] = useState(false);
  const pagefindRef = useRef<PagefindInstance | null>(null);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (typeof window === 'undefined') return [];

    setIsLoading(true);

    try {
      if (!pagefindRef.current) {
        // @ts-expect-error -- Pagefind is generated at build time, not a real module
        pagefindRef.current = await import(/* webpackIgnore: true */ '/pagefind/pagefind.js');
      }

      const pf = pagefindRef.current;
      if (!pf) return [];

      const response = await pf.search(query);
      const results = await Promise.all(
        response.results.slice(0, 20).map(async (result) => {
          const data = await result.data();
          return {
            id: result.id,
            url: data.url,
            title: data.meta.title,
            excerpt: data.excerpt,
            score: result.score,
          };
        })
      );

      return results;
    } catch {
      // Pagefind not available (e.g. in dev mode)
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { search, isLoading };
}
