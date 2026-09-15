import { getDb } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { downloadEvents, releases, type Release } from "@/db/schema";
import { compareVersions } from "@/lib/format";
import { PLATFORM_IDS, type PlatformId } from "@/lib/platforms";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

function pickLatest(items: Release[]): Release | null {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => {
    const versionDiff = compareVersions(a.version, b.version);
    return versionDiff || new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });
  const stable = sorted.filter((item) => !item.isPrerelease);
  return (stable.length ? stable : sorted).at(-1) ?? null;
}

export async function getLatestByPlatform(): Promise<Record<PlatformId, Release | null>> {
  await ensureDatabase();
  const db = await getDb();
  const rows = await db
    .select()
    .from(releases)
    .where(eq(releases.isVisible, true))
    .orderBy(desc(releases.publishedAt));

  return Object.fromEntries(
    PLATFORM_IDS.map((id) => [id, pickLatest(rows.filter((row) => row.platform === id))]),
  ) as Record<PlatformId, Release | null>;
}

export async function getLatestForPlatform(platform: string): Promise<Release | null> {
  await ensureDatabase();
  const db = await getDb();
  const rows = await db
    .select()
    .from(releases)
    .where(and(eq(releases.isVisible, true), eq(releases.platform, platform)))
    .orderBy(desc(releases.publishedAt));
  return pickLatest(rows);
}

export type ListOptions = {
  platform?: string;
  search?: string;
  includeHidden?: boolean;
  onlyPrerelease?: boolean;
  limit?: number;
  offset?: number;
};

export async function listReleases(options: ListOptions = {}): Promise<{ items: Release[]; total: number }> {
  await ensureDatabase();
  const db = await getDb();
  const conditions = [];
  if (!options.includeHidden) conditions.push(eq(releases.isVisible, true));
  if (options.platform && options.platform !== "all") conditions.push(eq(releases.platform, options.platform));
  if (options.onlyPrerelease) conditions.push(eq(releases.isPrerelease, true));
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(releases.version, term), ilike(releases.title, term), ilike(releases.summary, term)));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const [items, countRows] = await Promise.all([
    db.select().from(releases).where(where).orderBy(desc(releases.publishedAt), desc(releases.id)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(releases).where(where),
  ]);
  return { items, total: countRows[0]?.count ?? 0 };
}

export async function getReleaseById(id: number, includeHidden = false): Promise<Release | null> {
  await ensureDatabase();
  if (!Number.isFinite(id)) return null;
  const db = await getDb();
  const conditions = [eq(releases.id, id)];
  if (!includeHidden) conditions.push(eq(releases.isVisible, true));
  const [row] = await db.select().from(releases).where(and(...conditions)).limit(1);
  return row ?? null;
}

export async function getPlatformHistory(platform: string, limit = 40): Promise<Release[]> {
  await ensureDatabase();
  const db = await getDb();
  return db
    .select()
    .from(releases)
    .where(and(eq(releases.isVisible, true), eq(releases.platform, platform)))
    .orderBy(desc(releases.publishedAt), desc(releases.id))
    .limit(limit);
}

export type SiteStats = {
  totalDownloads: number;
  releaseCount: number;
  lastPublishedAt: Date | null;
  perPlatform: { platform: string; releases: number; downloads: number; latestVersion: string | null }[];
};

/** All values are aggregated from real release rows and real download event rows. */
export async function getStats(): Promise<SiteStats> {
  await ensureDatabase();
  const db = await getDb();
  const [releaseAggRows, downloadAggRows, rows, downloadRows] = await Promise.all([
    db
      .select({ releaseCount: sql<number>`count(*)::int`, lastPublishedAt: sql<Date | null>`max(${releases.publishedAt})` })
      .from(releases)
      .where(eq(releases.isVisible, true)),
    db.select({ total: sql<number>`count(*)::int` }).from(downloadEvents),
    db.select().from(releases).where(eq(releases.isVisible, true)).orderBy(desc(releases.publishedAt)),
    db
      .select({ platform: downloadEvents.platform, total: sql<number>`count(*)::int` })
      .from(downloadEvents)
      .groupBy(downloadEvents.platform),
  ]);

  const perPlatform = PLATFORM_IDS.map((platform) => {
    const list = rows.filter((row) => row.platform === platform);
    return {
      platform,
      releases: list.length,
      downloads: downloadRows.find((row) => row.platform === platform)?.total ?? 0,
      latestVersion: pickLatest(list)?.version ?? null,
    };
  }).filter((entry) => entry.releases > 0);

  const releaseAgg = releaseAggRows[0];
  return {
    totalDownloads: downloadAggRows[0]?.total ?? 0,
    releaseCount: releaseAgg?.releaseCount ?? 0,
    lastPublishedAt: releaseAgg?.lastPublishedAt ? new Date(releaseAgg.lastPublishedAt) : null,
    perPlatform,
  };
}

export async function recordDownload(release: Release, request: Request): Promise<void> {
  try {
    await ensureDatabase();
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.update(releases).set({ downloads: sql`${releases.downloads} + 1` }).where(eq(releases.id, release.id));
      await tx.insert(downloadEvents).values({
        releaseId: release.id,
        platform: release.platform,
        version: release.version,
        userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
        referer: request.headers.get("referer")?.slice(0, 300) ?? null,
        country: request.headers.get("cf-ipcountry")?.slice(0, 8) ?? null,
      });
    });
  } catch {
    // Analytics must never block a download.
  }
}

export async function getRecentDownloadEvents(limit = 12) {
  await ensureDatabase();
  const db = await getDb();
  return db.select().from(downloadEvents).orderBy(desc(downloadEvents.createdAt)).limit(limit);
}

export async function getDownloadTrend(days = 14) {
  await ensureDatabase();
  const db = await getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      day: sql<string>`to_char(${downloadEvents.createdAt}, 'MM-DD')`,
      total: sql<number>`count(*)::int`,
    })
    .from(downloadEvents)
    .where(gte(downloadEvents.createdAt, since))
    .groupBy(sql`to_char(${downloadEvents.createdAt}, 'MM-DD')`)
    .orderBy(sql`to_char(${downloadEvents.createdAt}, 'MM-DD')`);
}
