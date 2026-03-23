/* Type stubs for packages not yet installed or loaded at runtime. */

declare module '@duckdb/duckdb-wasm' {
  export class ConsoleLogger {}
  export class AsyncDuckDB {
    constructor(logger: ConsoleLogger, worker: Worker);
    instantiate(mainModule: string, pthreadWorker?: string): Promise<void>;
    connect(): Promise<AsyncDuckDBConnection>;
  }
  export interface AsyncDuckDBConnection {
    query(sql: string): Promise<ArrowResult>;
    close(): Promise<void>;
  }
  export interface ArrowResult {
    toArray(): Record<string, unknown>[];
  }
  export interface DuckDBBundle {
    mainModule: string;
    mainWorker?: string;
    pthreadWorker?: string;
  }
  export function getJsDelivrBundles(): DuckDBBundle[];
  export function selectBundle(
    bundles: DuckDBBundle[]
  ): Promise<DuckDBBundle>;
}

declare module '/pagefind/pagefind.js' {
  const pagefind: {
    search: (query: string) => Promise<{
      results: Array<{
        id: string;
        score: number;
        data: () => Promise<{
          url: string;
          meta: { title: string };
          excerpt: string;
        }>;
      }>;
    }>;
  };
  export default pagefind;
}
