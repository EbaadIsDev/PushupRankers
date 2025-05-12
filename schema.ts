import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for storing user data
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Pushup records schema to track user pushups
export const pushupRecords = pgTable("pushup_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  count: integer("count").notNull(),
  difficultyLevel: text("difficulty_level").notNull().default("standard"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User stats schema to maintain user's pushup statistics
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  totalPushups: integer("total_pushups").notNull().default(0),
  maxSet: integer("max_set").notNull().default(0),
  currentRankTier: text("current_rank_tier").notNull().default("bronze"),
  currentRankLevel: integer("current_rank_level").notNull().default(1),
  currentProgress: integer("current_progress").notNull().default(0),
});

// User settings schema to store user preferences
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  animationsEnabled: boolean("animations_enabled").notNull().default(true),
  darkModeEnabled: boolean("dark_mode_enabled").notNull().default(true),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertPushupRecordSchema = createInsertSchema(pushupRecords).omit({ id: true });
export const insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true });
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPushupRecord = z.infer<typeof insertPushupRecordSchema>;
export type PushupRecord = typeof pushupRecords.$inferSelect;

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// Anonymous user data validation schema
export const anonymousUserDataSchema = z.object({
  totalPushups: z.number().default(0),
  maxSet: z.number().default(0),
  currentRankTier: z.string().default("bronze"),
  currentRankLevel: z.number().default(1),
  currentProgress: z.number().default(0),
  history: z.array(z.object({
    count: z.number(),
    difficultyLevel: z.string(),
    timestamp: z.number(),
  })).default([]),
  settings: z.object({
    soundEnabled: z.boolean().default(true),
    notificationsEnabled: z.boolean().default(true),
    animationsEnabled: z.boolean().default(true),
    darkModeEnabled: z.boolean().default(true),
  }).default({
    soundEnabled: true,
    notificationsEnabled: true,
    animationsEnabled: true,
    darkModeEnabled: true,
  }),
});

export type AnonymousUserData = z.infer<typeof anonymousUserDataSchema>;

// Pushup record submission schema for API
export const pushupSubmissionSchema = z.object({
  count: z.number().min(1, "Please enter at least 1 pushup"),
  difficultyLevel: z.string().default("standard"),
});

export type PushupSubmission = z.infer<typeof pushupSubmissionSchema>;
