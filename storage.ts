import { 
  users, type User, type InsertUser,
  pushupRecords, type PushupRecord, type InsertPushupRecord,
  userStats, type UserStats, type InsertUserStats,
  userSettings, type UserSettings, type InsertUserSettings,
  AnonymousUserData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Storage interface with CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Pushup record operations
  createPushupRecord(record: InsertPushupRecord): Promise<PushupRecord>;
  getUserPushupRecords(userId: number): Promise<PushupRecord[]>;
  getRecentPushupRecords(userId: number, limit: number): Promise<PushupRecord[]>;

  // User stats operations
  getUserStats(userId: number): Promise<UserStats | undefined>;
  updateUserStats(userId: number, stats: Partial<UserStats>): Promise<UserStats>;
  
  // User settings operations
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<UserSettings>;
  
  // Anonymous user operations for local storage
  getAnonymousUserDataTemplate(): AnonymousUserData;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Pushup record methods
  async createPushupRecord(record: InsertPushupRecord): Promise<PushupRecord> {
    const [pushupRecord] = await db.insert(pushupRecords).values(record).returning();

    // Update user stats if userId is provided
    if (record.userId) {
      const userStats = await this.getUserStats(record.userId);
      if (userStats) {
        // Update total pushups and max set if applicable
        const updatedStats: Partial<UserStats> = {
          totalPushups: userStats.totalPushups + record.count,
          maxSet: Math.max(userStats.maxSet, record.count)
        };
        await this.updateUserStats(record.userId, updatedStats);
      }
    }

    return pushupRecord;
  }

  async getUserPushupRecords(userId: number): Promise<PushupRecord[]> {
    return db.select()
      .from(pushupRecords)
      .where(eq(pushupRecords.userId, userId))
      .orderBy(desc(pushupRecords.createdAt));
  }

  async getRecentPushupRecords(userId: number, limit: number): Promise<PushupRecord[]> {
    return db.select()
      .from(pushupRecords)
      .where(eq(pushupRecords.userId, userId))
      .orderBy(desc(pushupRecords.createdAt))
      .limit(limit);
  }

  // User stats methods
  async getUserStats(userId: number): Promise<UserStats | undefined> {
    const [stats] = await db.select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
    return stats;
  }

  async updateUserStats(userId: number, statsUpdate: Partial<UserStats>): Promise<UserStats> {
    let stats = await this.getUserStats(userId);
    
    if (!stats) {
      // Create new stats if they don't exist
      const newStats = {
        userId,
        totalPushups: 0,
        maxSet: 0,
        currentRankTier: 'bronze',
        currentRankLevel: 1,
        currentProgress: 0,
        ...statsUpdate
      };
      const [createdStats] = await db.insert(userStats).values(newStats).returning();
      stats = createdStats;
    } else {
      // Update existing stats
      const [updatedStats] = await db.update(userStats)
        .set(statsUpdate)
        .where(eq(userStats.id, stats.id))
        .returning();
      stats = updatedStats;
    }
    
    return stats;
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async updateUserSettings(userId: number, settingsUpdate: Partial<UserSettings>): Promise<UserSettings> {
    let settings = await this.getUserSettings(userId);
    
    if (!settings) {
      // Create new settings if they don't exist
      const newSettings = {
        userId,
        soundEnabled: true,
        notificationsEnabled: true,
        animationsEnabled: true,
        darkModeEnabled: true,
        ...settingsUpdate
      };
      const [createdSettings] = await db.insert(userSettings).values(newSettings).returning();
      settings = createdSettings;
    } else {
      // Update existing settings
      const [updatedSettings] = await db.update(userSettings)
        .set(settingsUpdate)
        .where(eq(userSettings.id, settings.id))
        .returning();
      settings = updatedSettings;
    }
    
    return settings;
  }
  
  // Anonymous user template
  getAnonymousUserDataTemplate(): AnonymousUserData {
    return {
      totalPushups: 0,
      maxSet: 0,
      currentRankTier: 'bronze',
      currentRankLevel: 1,
      currentProgress: 0,
      history: [],
      settings: {
        soundEnabled: true,
        notificationsEnabled: true,
        animationsEnabled: true,
        darkModeEnabled: true
      }
    };
  }
}

export const storage = new DatabaseStorage();
