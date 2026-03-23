import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { employers } from "./employers";
import { roleFamilies } from "./role-families";
import { regions } from "./regions";

export const disclosures = sqliteTable("disclosures", {
  /** Deterministic hash of (year, employer, firstName, lastName, jobTitle) */
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  sector: text("sector").notNull(),
  /** References employers.id */
  employerId: text("employer_id")
    .notNull()
    .references(() => employers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  jobTitle: text("job_title").notNull(),
  salaryPaid: real("salary_paid").notNull(),
  taxableBenefits: real("taxable_benefits").notNull(),
  /** Computed: salaryPaid + taxableBenefits */
  totalCompensation: real("total_compensation").notNull(),
  /** Inflation-adjusted salary to the latest year in the dataset */
  salaryCpiAdjusted: real("salary_cpi_adjusted"),
  /** References role_families.id */
  roleFamilyId: text("role_family_id").references(() => roleFamilies.id),
  /** References regions.id */
  regionId: text("region_id").references(() => regions.id),
  /** Fuzzy-matched stable person identifier */
  personId: text("person_id"),
  /** Year-over-year salary % change */
  yoySalaryDelta: real("yoy_salary_delta"),
});

export const insertDisclosureSchema = createInsertSchema(disclosures);
export const selectDisclosureSchema = createSelectSchema(disclosures);

export type Disclosure = typeof disclosures.$inferSelect;
export type NewDisclosure = typeof disclosures.$inferInsert;
