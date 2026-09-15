import { NextResponse } from "next/server";

import { getReleaseById, recordDownload } from "@/lib/releases";
import { publicUrlFor, readLocalObject, signedGetUrl, storageDriver } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  exe: "application/vnd.microsoft.portable-executable",
  msi: "application/x-msi",
  dmg: "application/x-apple-diskimage",
  pkg: "application/x-newton-compatible-pkg",
  ipa: "application/octet-stream",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  deb: "application/vnd.debian.binary-package",
  appimage: "application/x-executable",
  txt: "text/plain; charset=utf-8",
};

function contentTypeFor(fileName: string | null, fallback = "application/octet-stream"): string {
  if (!fileName) return fallback;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? fallback;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const release = await getReleaseById(Number.parseInt(id, 10));

  if (!release || !release.isVisible) {
    return new NextResponse("安装包不存在或未公开。", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const hasAsset = Boolean(release.downloadUrl || release.storageKey);
  if (!hasAsset) {
    return NextResponse.redirect(new URL("/versions?notice=archived", request.url), 302);
  }

  // 1) External CDN / R2 public link configured by the admin.
  if (release.downloadUrl) {
    await recordDownload(release, request);
    return NextResponse.redirect(release.downloadUrl, 302);
  }

  const key = release.storageKey as string;

  // 2) R2 bucket with a public custom domain.
  const publicUrl = publicUrlFor(key);
  if (publicUrl) {
    await recordDownload(release, request);
    return NextResponse.redirect(publicUrl, 302);
  }

  // 3) Private R2 bucket -> hand out a short-lived signed URL.
  if (storageDriver() === "r2") {
    const signed = await signedGetUrl(key, 900);
    if (signed) {
      await recordDownload(release, request);
      return NextResponse.redirect(signed, 302);
    }
  }

  // 4) Local disk driver (development / self-hosting).
  const local = await readLocalObject(key);
  if (local) {
    await recordDownload(release, request);
    const fileName = release.fileName || key.split("/").pop() || "minireel-package";
    return new NextResponse(local.stream, {
      status: 200,
      headers: {
        "content-type": contentTypeFor(release.fileName, "application/octet-stream"),
        "content-length": String(local.size),
        "content-disposition": `attachment; filename="${fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  }

  return NextResponse.redirect(
    new URL(`/release/${release.id}?notice=asset-missing`, request.url),
    302,
  );
}
