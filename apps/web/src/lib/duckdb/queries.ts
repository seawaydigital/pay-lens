const PARQUET_BASE_URL = '/data';

export const queries = {
  salaryDistribution(
    roleFamily: string,
    regionId?: string,
    year?: number
  ): string {
    const yearFilter = year ? `AND year = ${year}` : '';
    const regionFilter = regionId
      ? `AND region_id = '${regionId}'`
      : '';
    return `
      SELECT
        FLOOR(salary / 10000) * 10000 AS bucket,
        COUNT(*) AS count
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      WHERE role_family = '${roleFamily}'
        ${yearFilter}
        ${regionFilter}
      GROUP BY bucket
      ORDER BY bucket
    `;
  },

  percentileStats(roleFamily: string, regionId?: string): string {
    const regionFilter = regionId
      ? `AND region_id = '${regionId}'`
      : '';
    return `
      SELECT
        APPROX_QUANTILE(salary, 0.25) AS p25,
        APPROX_QUANTILE(salary, 0.50) AS p50,
        APPROX_QUANTILE(salary, 0.75) AS p75,
        APPROX_QUANTILE(salary, 0.90) AS p90,
        COUNT(*) AS count
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      WHERE role_family = '${roleFamily}'
        ${regionFilter}
    `;
  },

  employerProfile(employerId: string): string {
    return `
      SELECT
        employer_id AS employerId,
        name,
        sector,
        COUNT(*) AS headcount,
        MEDIAN(salary) AS medianSalary,
        AVG(salary) AS meanSalary,
        SUM(salary) AS totalComp,
        MIN(salary) AS minSalary,
        MAX(salary) AS maxSalary
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      WHERE employer_id = '${employerId}'
      GROUP BY employer_id, name, sector
    `;
  },

  personHistory(personId: string): string {
    return `
      SELECT
        year,
        employer,
        job_title AS jobTitle,
        salary,
        salary_cpi_adjusted AS salaryCpiAdjusted
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      WHERE person_id = '${personId}'
      ORDER BY year
    `;
  },

  sectorSummary(sectorId?: string): string {
    const sectorFilter = sectorId
      ? `WHERE sector_id = '${sectorId}'`
      : '';
    return `
      SELECT
        sector_id AS sectorId,
        sector AS name,
        COUNT(*) AS headcount,
        MEDIAN(salary) AS medianSalary,
        SUM(salary) AS totalComp
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      ${sectorFilter}
      GROUP BY sector_id, sector
      ORDER BY headcount DESC
    `;
  },

  topEmployers(limit = 25, year?: number): string {
    const yearFilter = year ? `WHERE year = ${year}` : '';
    return `
      SELECT
        employer_id AS employerId,
        name,
        COUNT(*) AS headcount,
        MEDIAN(salary) AS medianSalary
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      ${yearFilter}
      GROUP BY employer_id, name
      ORDER BY headcount DESC
      LIMIT ${limit}
    `;
  },

  regionMedians(roleFamily?: string, year?: number): string {
    const conditions: string[] = [];
    if (roleFamily) conditions.push(`role_family = '${roleFamily}'`);
    if (year) conditions.push(`year = ${year}`);
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return `
      SELECT
        region_id AS regionId,
        MEDIAN(salary) AS medianSalary,
        COUNT(*) AS count
      FROM read_parquet('${PARQUET_BASE_URL}/disclosures-recent.parquet')
      ${whereClause}
      GROUP BY region_id
      ORDER BY medianSalary DESC
    `;
  },
};
