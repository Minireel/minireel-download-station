import { NextResponse } from "next/server";

import { readLocalObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  exe: "application/vnd.microsoft.portable-executable",
  dmg: "application/x-apple-diskimage",
  ipa: "application/octet-stream",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

/** Serves objects written by the local storage driver (STORAGE_DRIVER=local). */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const joined = (key ?? []).join("/");

  if (!joined || joined.includes("..")) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const object = await readLocalObject(joined);
  if (!object) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = joined.split(".").pop()?.toLowerCase() ?? "";

  return new NextResponse(object.stream, {
    status: 200,
    headers: {
      "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "content-length": String(object.size),
      "cache-control": "public, max-age=3600",
    },
  });
}
