export interface SalaryBucket {
  bucket: number;
  count: number;
}

export interface PercentileStats {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  count: number;
}

export interface EmployerProfile {
  employerId: string;
  name: string;
  sector: string;
  headcount: number;
  medianSalary: number;
  meanSalary: number;
  totalComp: number;
  minSalary: number;
  maxSalary: number;
}

export interface PersonRecord {
  year: number;
  employer: string;
  jobTitle: string;
  salary: number;
  salaryCpiAdjusted: number;
}

export interface SectorSummary {
  sectorId: string;
  name: string;
  headcount: number;
  medianSalary: number;
  totalComp: number;
}

export interface RegionMedian {
  regionId: string;
  medianSalary: number;
  count: number;
}

export interface TopEmployer {
  employerId: string;
  name: string;
  headcount: number;
  medianSalary: number;
}
