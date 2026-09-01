import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Workspace = typeof workspacesTable.$inferSelect;
export type NewWorkspace = typeof workspacesTable.$inferInsert;
