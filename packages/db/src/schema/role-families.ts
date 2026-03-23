import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const roleFamilies = sqliteTable("role_families", {
  /** Slug-based identifier */
  id: text("id").primaryKey(),
  /** Canonical role name, e.g. "Registered Nurse" */
  name: text("name").notNull(),
  /** Broad category, e.g. "Healthcare", "Education" */
  category: text("category"),
});

export const insertRoleFamilySchema = createInsertSchema(roleFamilies);
export const selectRoleFamilySchema = createSelectSchema(roleFamilies);

export type RoleFamily = typeof roleFamilies.$inferSelect;
export type NewRoleFamily = typeof roleFamilies.$inferInsert;
