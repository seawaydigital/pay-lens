import { sqliteTable, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const cpi = sqliteTable("cpi", {
  year: integer("year").primaryKey(),
  annualAvgCpi: real("annual_avg_cpi").notNull(),
  /** Factor to adjust to the latest year in the dataset */
  adjustmentFactor: real("adjustment_factor").notNull(),
});

export const insertCpiSchema = createInsertSchema(cpi);
export const selectCpiSchema = createSelectSchema(cpi);

export type Cpi = typeof cpi.$inferSelect;
export type NewCpi = typeof cpi.$inferInsert;
