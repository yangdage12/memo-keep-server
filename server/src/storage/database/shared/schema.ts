import { pgTable, serial, timestamp, varchar, text, boolean, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: serial().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 20 }).notNull().default("work"),
    priority: varchar("priority", { length: 10 }).notNull().default("medium"),
    person: varchar("person", { length: 255 }),
    remind_time: timestamp("remind_time", { withTimezone: true }),
    is_completed: boolean("is_completed").default(false).notNull(),
    is_reminded: boolean("is_reminded").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("events_category_idx").on(table.category),
    index("events_priority_idx").on(table.priority),
    index("events_remind_time_idx").on(table.remind_time),
    index("events_is_completed_idx").on(table.is_completed),
    index("events_created_at_idx").on(table.created_at),
  ]
);

export const reports = pgTable(
  "reports",
  {
    id: serial().primaryKey(),
    type: varchar("type", { length: 20 }).notNull(), // 'monthly', 'quarterly', 'yearly'
    period: varchar("period", { length: 20 }).notNull(), // e.g., '2025-01', '2025-Q1', '2025'
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    event_count: integer("event_count").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reports_type_idx").on(table.type),
    index("reports_period_idx").on(table.period),
  ]
);

const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({ coerce: { date: true } });
export const insertEventSchema = createCoercedInsertSchema(events).pick({
  title: true,
  description: true,
  category: true,
  priority: true,
  person: true,
  remind_time: true,
});
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const insertReportSchema = createCoercedInsertSchema(reports).pick({
  type: true,
  period: true,
  title: true,
  content: true,
  summary: true,
  event_count: true,
});
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
