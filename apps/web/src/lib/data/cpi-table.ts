/**
 * CPI adjustment factors to convert nominal dollars to 2025 constant dollars.
 * Based on Bank of Canada CPI data (2002 = 100 base).
 * Each value represents the multiplier to convert that year's dollars to 2025$.
 */
export const CPI_TABLE: Record<number, number> = {
  1996: 1.670,
  1997: 1.643,
  1998: 1.628,
  1999: 1.599,
  2000: 1.558,
  2001: 1.520,
  2002: 1.485,
  2003: 1.444,
  2004: 1.418,
  2005: 1.387,
  2006: 1.361,
  2007: 1.331,
  2008: 1.301,
  2009: 1.298,
  2010: 1.275,
  2011: 1.238,
  2012: 1.220,
  2013: 1.209,
  2014: 1.185,
  2015: 1.172,
  2016: 1.155,
  2017: 1.137,
  2018: 1.112,
  2019: 1.090,
  2020: 1.081,
  2021: 1.043,
  2022: 0.978,
  2023: 0.943,
  2024: 1.020,
  2025: 1.000,
};

/**
 * Adjust a nominal dollar amount from a given year to 2025 constant dollars.
 */
export function adjustForInflation(amount: number, year: number): number {
  const factor = CPI_TABLE[year];
  if (factor === undefined) {
    return amount;
  }
  return Math.round(amount * factor);
}
