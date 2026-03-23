/**
 * CPI adjustment factors to convert nominal dollars to 2024 constant dollars.
 * Based on Bank of Canada CPI data (2002 = 100 base).
 * Each value represents the multiplier to convert that year's dollars to 2024$.
 */
export const CPI_TABLE: Record<number, number> = {
  1996: 1.637,
  1997: 1.611,
  1998: 1.596,
  1999: 1.568,
  2000: 1.527,
  2001: 1.490,
  2002: 1.456,
  2003: 1.416,
  2004: 1.390,
  2005: 1.360,
  2006: 1.334,
  2007: 1.305,
  2008: 1.276,
  2009: 1.273,
  2010: 1.250,
  2011: 1.214,
  2012: 1.196,
  2013: 1.185,
  2014: 1.162,
  2015: 1.149,
  2016: 1.132,
  2017: 1.115,
  2018: 1.090,
  2019: 1.069,
  2020: 1.060,
  2021: 1.023,
  2022: 0.959,
  2023: 0.924,
  2024: 1.000,
};

/**
 * Adjust a nominal dollar amount from a given year to 2024 constant dollars.
 */
export function adjustForInflation(amount: number, year: number): number {
  const factor = CPI_TABLE[year];
  if (factor === undefined) {
    return amount;
  }
  return Math.round(amount * factor);
}
