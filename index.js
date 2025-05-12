var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  anonymousUserDataSchema: () => anonymousUserDataSchema,
  insertPushupRecordSchema: () => insertPushupRecordSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserSettingsSchema: () => insertUserSettingsSchema,
  insertUserStatsSchema: () => insertUserStatsSchema,
  pushupRecords: () => pushupRecords,
  pushupSubmissionSchema: () => pushupSubmissionSchema,
  userSettings: () => userSettings,
  userStats: () => userStats,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var pushupRecords = pgTable("pushup_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  count: integer("count").notNull(),
  difficultyLevel: text("difficulty_level").notNull().default("standard"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  totalPushups: integer("total_pushups").notNull().default(0),
  maxSet: integer("max_set").notNull().default(0),
  currentRankTier: text("current_rank_tier").notNull().default("bronze"),
  currentRankLevel: integer("current_rank_level").notNull().default(1),
  currentProgress: integer("current_progress").notNull().default(0)
});
var userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  animationsEnabled: boolean("animations_enabled").notNull().default(true),
  darkModeEnabled: boolean("dark_mode_enabled").notNull().default(true)
});
var insertUserSchema = createInsertSchema(users);
var insertPushupRecordSchema = createInsertSchema(pushupRecords).omit({ id: true });
var insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true });
var insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
var anonymousUserDataSchema = z.object({
  totalPushups: z.number().default(0),
  maxSet: z.number().default(0),
  currentRankTier: z.string().default("bronze"),
  currentRankLevel: z.number().default(1),
  currentProgress: z.number().default(0),
  history: z.array(z.object({
    count: z.number(),
    difficultyLevel: z.string(),
    timestamp: z.number()
  })).default([]),
  settings: z.object({
    soundEnabled: z.boolean().default(true),
    notificationsEnabled: z.boolean().default(true),
    animationsEnabled: z.boolean().default(true),
    darkModeEnabled: z.boolean().default(true)
  }).default({
    soundEnabled: true,
    notificationsEnabled: true,
    animationsEnabled: true,
    darkModeEnabled: true
  })
});
var pushupSubmissionSchema = z.object({
  count: z.number().min(1, "Please enter at least 1 pushup"),
  difficultyLevel: z.string().default("standard")
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Pushup record methods
  async createPushupRecord(record) {
    const [pushupRecord] = await db.insert(pushupRecords).values(record).returning();
    if (record.userId) {
      const userStats2 = await this.getUserStats(record.userId);
      if (userStats2) {
        const updatedStats = {
          totalPushups: userStats2.totalPushups + record.count,
          maxSet: Math.max(userStats2.maxSet, record.count)
        };
        await this.updateUserStats(record.userId, updatedStats);
      }
    }
    return pushupRecord;
  }
  async getUserPushupRecords(userId) {
    return db.select().from(pushupRecords).where(eq(pushupRecords.userId, userId)).orderBy(desc(pushupRecords.createdAt));
  }
  async getRecentPushupRecords(userId, limit) {
    return db.select().from(pushupRecords).where(eq(pushupRecords.userId, userId)).orderBy(desc(pushupRecords.createdAt)).limit(limit);
  }
  // User stats methods
  async getUserStats(userId) {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }
  async updateUserStats(userId, statsUpdate) {
    let stats = await this.getUserStats(userId);
    if (!stats) {
      const newStats = {
        userId,
        totalPushups: 0,
        maxSet: 0,
        currentRankTier: "bronze",
        currentRankLevel: 1,
        currentProgress: 0,
        ...statsUpdate
      };
      const [createdStats] = await db.insert(userStats).values(newStats).returning();
      stats = createdStats;
    } else {
      const [updatedStats] = await db.update(userStats).set(statsUpdate).where(eq(userStats.id, stats.id)).returning();
      stats = updatedStats;
    }
    return stats;
  }
  // User settings methods
  async getUserSettings(userId) {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }
  async updateUserSettings(userId, settingsUpdate) {
    let settings = await this.getUserSettings(userId);
    if (!settings) {
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
      const [updatedSettings] = await db.update(userSettings).set(settingsUpdate).where(eq(userSettings.id, settings.id)).returning();
      settings = updatedSettings;
    }
    return settings;
  }
  // Anonymous user template
  getAnonymousUserDataTemplate() {
    return {
      totalPushups: 0,
      maxSet: 0,
      currentRankTier: "bronze",
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
};
var storage = new DatabaseStorage();

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import * as bcrypt from "bcryptjs";
import * as z2 from "zod";
var isAuthenticated = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Unauthorized" });
};
var loginSchema = z2.object({
  username: z2.string().min(3),
  password: z2.string().min(6)
});
async function registerRoutes(app2) {
  app2.get("/api/anonymous-template", (_req, res) => {
    const template = storage.getAnonymousUserDataTemplate();
    return res.status(200).json(template);
  });
  app2.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists"
        });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        username: userData.username,
        password: hashedPassword
      });
      req.session.userId = user.id;
      req.session.authenticated = true;
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      console.error("Error registering user:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(loginData.username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password"
        });
      }
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password"
        });
      }
      req.session.userId = user.id;
      req.session.authenticated = true;
      const stats = await storage.getUserStats(user.id);
      const settings = await storage.getUserSettings(user.id);
      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          stats,
          settings
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      console.error("Error logging in:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out"
        });
      }
      return res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });
  app2.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      const stats = await storage.getUserStats(userId);
      const settings = await storage.getUserSettings(userId);
      const recentRecords = await storage.getRecentPushupRecords(userId, 10);
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          stats,
          settings,
          recentRecords
        }
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/pushups", async (req, res) => {
    try {
      const submissionData = pushupSubmissionSchema.parse(req.body);
      const userId = req.session.userId;
      const record = await storage.createPushupRecord({
        userId: userId || void 0,
        count: submissionData.count,
        difficultyLevel: submissionData.difficultyLevel
      });
      return res.status(201).json({
        success: true,
        message: "Pushup record created successfully",
        record
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      console.error("Error creating pushup record:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.get("/api/calculate-rank", (req, res) => {
    const count = parseInt(req.query.count);
    if (isNaN(count) || count < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid pushup count. Please provide a positive number."
      });
    }
    let tier = "bronze";
    let level = 1;
    let progress = 0;
    let nextThreshold = 0;
    if (count < 10) {
      tier = "bronze";
      level = 1;
      progress = count * 10;
      nextThreshold = 10;
    } else if (count < 25) {
      tier = "bronze";
      level = 2;
      progress = (count - 10) * (100 / 15);
      nextThreshold = 25;
    } else if (count < 50) {
      tier = "bronze";
      level = 3;
      progress = (count - 25) * (100 / 25);
      nextThreshold = 50;
    } else if (count < 75) {
      tier = "silver";
      level = 1;
      progress = (count - 50) * (100 / 25);
      nextThreshold = 75;
    } else if (count < 100) {
      tier = "silver";
      level = 2;
      progress = (count - 75) * (100 / 25);
      nextThreshold = 100;
    } else if (count < 150) {
      tier = "gold";
      level = 1;
      progress = (count - 100) * (100 / 50);
      nextThreshold = 150;
    } else if (count < 200) {
      tier = "gold";
      level = 2;
      progress = (count - 150) * (100 / 50);
      nextThreshold = 200;
    } else if (count < 250) {
      tier = "platinum";
      level = 1;
      progress = (count - 200) * (100 / 50);
      nextThreshold = 250;
    } else if (count < 300) {
      tier = "platinum";
      level = 2;
      progress = (count - 250) * (100 / 50);
      nextThreshold = 300;
    } else {
      tier = "diamond";
      level = Math.min(5, 1 + Math.floor((count - 300) / 100));
      progress = (count - 300) % 100 * (100 / 100);
      nextThreshold = 300 + level * 100;
      if (level === 5) {
        progress = 100;
        nextThreshold = 0;
      }
    }
    return res.status(200).json({
      tier,
      level,
      progress: Math.min(100, Math.floor(progress)),
      nextThreshold
    });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import session from "express-session";
import pgSession from "connect-pg-simple";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var PostgresqlStore = pgSession(session);
var sessionStore = new PostgresqlStore({
  pool,
  tableName: "session",
  createTableIfMissing: true
});
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "pushupranker-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1e3 * 60 * 60 * 24 * 7
    // 1 week
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
