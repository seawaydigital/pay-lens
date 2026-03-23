import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const employees = sqliteTable("employees", {
  /** Deterministic hash-based identifier */
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  firstSeenYear: integer("first_seen_year"),
  lastSeenYear: integer("last_seen_year"),
  /** Number of distinct employers this person has appeared under */
  employerCount: integer("employer_count"),
});

export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
