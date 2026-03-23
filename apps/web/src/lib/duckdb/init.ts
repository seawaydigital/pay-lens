import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let initPromise: Promise<AsyncDuckDB> | null = null;

export async function getDuckDB(): Promise<AsyncDuckDB> {
  if (typeof window === 'undefined') {
    throw new Error('getDuckDB() can only be called in the browser');
  }

  if (db) return db;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const duckdb = await import('@duckdb/duckdb-wasm');
    const bundles = duckdb.getJsDelivrBundles();

    const bundle = await duckdb.selectBundle(bundles);

    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const instance = new duckdb.AsyncDuckDB(logger, worker);
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);

    db = instance;
    return instance;
  })();

  return initPromise;
}
