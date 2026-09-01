import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const dummyTable = pgTable("dummy_records", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  status: varchar({ length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DummyRecord = typeof dummyTable.$inferSelect;
export type NewDummyRecord = typeof dummyTable.$inferInsert;
