import { getDb } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { storageInfo } from "@/lib/storage";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    await ensureDatabase();
    const storage = storageInfo();
    return Response.json({
      ok: true,
      service: "minireel-download-site",
      database: "connected",
      storage: storage.driver,
      storageDetail: storage.detail,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
