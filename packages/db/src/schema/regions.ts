import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const regions = sqliteTable("regions", {
  /** StatCan Census Division code, e.g. "3506" */
  id: text("id").primaryKey(),
  /** Human-readable name, e.g. "Ottawa" */
  name: text("name").notNull(),
  /** GeoJSON join key */
  geoUid: text("geo_uid"),
});

export const insertRegionSchema = createInsertSchema(regions);
export const selectRegionSchema = createSelectSchema(regions);

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;
