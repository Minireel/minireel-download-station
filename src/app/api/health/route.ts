import { getDb } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { sessionTransportInfo } from "@/lib/auth";
import { storageInfo } from "@/lib/storage";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    await ensureDatabase();
    const storage = storageInfo();
    const runtime = await sessionTransportInfo();
    return Response.json({
      ok: true,
      service: "minireel-download-site",
      database: "connected",
      storage: storage.driver,
      storageDetail: storage.detail,
      // 排查登录态问题用：nodeEnv / 反代有没有透传 https / 会话 Cookie 会不会带 Secure
      runtime,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
