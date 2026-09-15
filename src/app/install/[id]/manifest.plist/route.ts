import { NextResponse } from "next/server";

import { getReleaseById } from "@/lib/releases";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** OTA installation manifest used by Safari (`itms-services://?action=download-manifest&url=...`). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const release = await getReleaseById(Number.parseInt(id, 10));

  if (!release || release.platform !== "ios" || !release.isVisible) {
    return NextResponse.json({ error: "iOS 安装包不存在或未公开" }, { status: 404 });
  }

  if (!release.downloadUrl && !release.storageKey) {
    return NextResponse.json({ error: "该版本安装包尚未归档" }, { status: 409 });
  }

  const origin = new URL(request.url).origin;
  const ipaUrl = `${origin}/api/download/${release.id}`;
  const bundleVersion = release.version.replace(/[^\d.]/g, "") || release.version;

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeXml(ipaUrl)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>app.minireel.player</string>
        <key>bundle-version</key>
        <string>${escapeXml(bundleVersion)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escapeXml(`MiniReel ${release.version}`)}</string>
        <key>subtitle</key>
        <string>${escapeXml(release.summary ?? "短剧播放器")}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  return new NextResponse(plist, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": "inline; filename=\"manifest.plist\"",
      "cache-control": "public, max-age=300",
    },
  });
}
