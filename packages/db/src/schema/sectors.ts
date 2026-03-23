import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sectors = sqliteTable("sectors", {
  /** Slug-based identifier */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertSectorSchema = createInsertSchema(sectors);
export const selectSectorSchema = createSelectSchema(sectors);

export type Sector = typeof sectors.$inferSelect;
export type NewSector = typeof sectors.$inferInsert;
