import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Installer packages published from the password-protected admin console. */
export const releases = pgTable(
  "releases",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull(),
    version: text("version").notNull(),
    buildNumber: integer("build_number"),
    channel: text("channel").notNull().default("stable"),
    title: text("title").notNull().default(""),
    summary: text("summary"),
    releaseNotes: text("release_notes"),
    fileName: text("file_name"),
    fileSize: bigint("file_size", { mode: "number" }),
    fileExt: text("file_ext"),
    storageKey: text("storage_key"),
    downloadUrl: text("download_url"),
    sha256: text("sha256"),
    arch: text("arch"),
    minOs: text("min_os"),
    isVisible: boolean("is_visible").notNull().default(true),
    isPrerelease: boolean("is_prerelease").notNull().default(false),
    downloads: integer("downloads").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("releases_platform_published_idx").on(table.platform, table.publishedAt),
    index("releases_visible_idx").on(table.isVisible),
  ],
);

/** One row is written only after a real user requests an installer download. */
export const downloadEvents = pgTable(
  "download_events",
  {
    id: serial("id").primaryKey(),
    releaseId: integer("release_id").notNull(),
    platform: text("platform").notNull(),
    version: text("version").notNull(),
    userAgent: text("user_agent"),
    referer: text("referer"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("download_events_created_idx").on(table.createdAt)],
);

/**
 * 后台登录失败限流。
 *
 * 键是客户端标识（IP + 转发头）的 SHA-256，不落库明文 IP；`reset_at` 之后计数作废。
 * 之所以放数据库而不是进程内内存：Cloudflare Workers 的 isolate 之间不共享内存，
 * 内存计数在生产环境基本拦不住人。
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("login_attempts_reset_idx").on(table.resetAt)],
);

export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;
