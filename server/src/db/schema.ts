import { pgTable, uuid, varchar, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemsTable = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  partNumber: varchar("part_number", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  specifications: jsonb("specifications").$type<Record<string, any>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bomsTable = pgTable("boms", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .references(() => workspacesTable.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).default("v1.0").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bomItemsTable = pgTable("bom_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bomId: uuid("bom_id")
    .references(() => bomsTable.id, { onDelete: "cascade" })
    .notNull(),
  itemId: uuid("item_id")
    .references(() => itemsTable.id, { onDelete: "restrict" })
    .notNull(),
  quantity: doublePrecision("quantity").notNull(),
  referenceDesignator: varchar("reference_designator", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Workspace = typeof workspacesTable.$inferSelect;
export type NewWorkspace = typeof workspacesTable.$inferInsert;

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

export type BOM = typeof bomsTable.$inferSelect;
export type NewBOM = typeof bomsTable.$inferInsert;

export type BOMItem = typeof bomItemsTable.$inferSelect;
export type NewBOMItem = typeof bomItemsTable.$inferInsert;
