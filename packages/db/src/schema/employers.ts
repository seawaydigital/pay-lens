import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { regions } from "./regions";

export const employers = sqliteTable("employers", {
  /** Slug-based identifier */
  id: text("id").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  sector: text("sector").notNull(),
  /** References regions.id */
  regionId: text("region_id").references(() => regions.id),
  firstYear: integer("first_year"),
  latestYear: integer("latest_year"),
});

export const insertEmployerSchema = createInsertSchema(employers);
export const selectEmployerSchema = createSelectSchema(employers);

export type Employer = typeof employers.$inferSelect;
export type NewEmployer = typeof employers.$inferInsert;
