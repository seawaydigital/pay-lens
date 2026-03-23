export const PARQUET_BASE =
  process.env.NEXT_PUBLIC_R2_URL || '/data';

export const DISCLOSURES_URL = `${PARQUET_BASE}/disclosures.parquet`;
export const DISCLOSURES_RECENT_URL = `${PARQUET_BASE}/disclosures-recent.parquet`;
export const EMPLOYERS_URL = `${PARQUET_BASE}/employers.parquet`;
export const EMPLOYEES_URL = `${PARQUET_BASE}/employees.parquet`;
export const CPI_URL = `${PARQUET_BASE}/cpi.parquet`;
