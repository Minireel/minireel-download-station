import { NextResponse } from "next/server";

import { serializeRelease } from "@/app/api/releases/route";
import { compareVersions } from "@/lib/format";
import { isPlatformId } from "@/lib/platforms";
import { getLatestForPlatform } from "@/lib/releases";

export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Lightweight update endpoint for the apps themselves:
 * /api/check?platform=android&version=2.3.0&arch=arm64-v8a&channel=stable
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") ?? "android";
  const current = url.searchParams.get("version") ?? "";
  const arch = url.searchParams.get("arch");

  if (!isPlatformId(platform)) {
    return NextResponse.json(
      { error: "unknown platform", allowed: ["android", "tv", "windows", "macos", "ios"] },
      { status: 400, headers: CORS },
    );
  }

  const latest = await getLatestForPlatform(platform);
  if (!latest) {
    return NextResponse.json(
      { platform, hasUpdate: false, latest: null, message: "该平台暂无发布记录" },
      { headers: CORS },
    );
  }

  const archMatches = !arch || !latest.arch || latest.arch === arch || latest.arch === "universal";
  const hasUpdate = current ? compareVersions(latest.version, current) > 0 : true;

  return NextResponse.json(
    {
      platform,
      current: current || null,
      hasUpdate: hasUpdate && archMatches,
      archMatches,
      downloadUrl: `/api/download/${latest.id}`,
      latest: serializeRelease(latest),
    },
    { headers: { ...CORS, "cache-control": "public, max-age=60" } },
  );
}
