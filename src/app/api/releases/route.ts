import { NextResponse } from "next/server";

import type { Release } from "@/db/schema";
import { formatBytes } from "@/lib/format";
import { isPlatformId } from "@/lib/platforms";
import { getStats, listReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

export function serializeRelease(release: Release) {
  return {
    id: release.id,
    platform: release.platform,
    version: release.version,
    buildNumber: release.buildNumber,
    channel: release.channel,
    prerelease: release.isPrerelease,
    title: release.title,
    summary: release.summary,
    arch: release.arch,
    minOs: release.minOs,
    fileName: release.fileName,
    fileSize: release.fileSize,
    fileSizeText: formatBytes(release.fileSize),
    sha256: release.sha256,
    downloads: release.downloads,
    publishedAt: release.publishedAt,
    downloadUrl: `/api/download/${release.id}`,
  };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const channel = url.searchParams.get("channel");
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20;
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

  if (platform && !isPlatformId(platform)) {
    return NextResponse.json(
      { error: "unknown platform", allowed: ["android", "tv", "windows", "macos", "ios"] },
      { status: 400, headers: CORS },
    );
  }

  const [{ items, total }, stats] = await Promise.all([
    listReleases({
      platform,
      search,
      limit,
      offset,
      onlyPrerelease: channel === "beta" ? false : false,
    }),
    getStats(),
  ]);

  const filtered =
    channel === "beta"
      ? items.filter((item) => item.isPrerelease)
      : channel === "stable"
        ? items.filter((item) => !item.isPrerelease)
        : items;

  return NextResponse.json(
    {
      total,
      count: filtered.length,
      platform: platform ?? "all",
      stats: {
        totalDownloads: stats.totalDownloads,
        releaseCount: stats.releaseCount,
      },
      items: filtered.map(serializeRelease),
    },
    { headers: { ...CORS, "cache-control": "public, max-age=30" } },
  );
}
