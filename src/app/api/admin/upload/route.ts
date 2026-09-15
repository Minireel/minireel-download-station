import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { isPlatformId } from "@/lib/platforms";
import { buildStorageKey, putObject, storageInfo } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([
  "apk",
  "aab",
  "exe",
  "msi",
  "zip",
  "dmg",
  "pkg",
  "ipa",
  "deb",
  "appimage",
  "tar",
  "gz",
  "txt",
]);

/**
 * Cloudflare Workers 的请求体上限是 100MB、实例内存上限是 128MB，而这里的实现是
 * 「整包读进内存 → 算 SHA-256 → 上传」，所以真实可用上限要留在 100MB 以内。
 * 现有安装包最大约 40MB，够用；将来若要支持更大的包，应改成
 * 「浏览器预签名直传 R2」，让字节流不经过 Worker。
 */
const MAX_BYTES = 100 * 1024 * 1024;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "未登录或会话已过期。" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析上传内容。" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择要上传的安装包。" }, { status: 400 });
  }

  const platform = String(formData.get("platform") ?? "android");
  const version = String(formData.get("version") ?? "0.0.0").trim() || "0.0.0";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  // platform 会直接进 R2 的对象键（releases/<platform>/...），必须和别处一样做白名单校验，
  // 否则本地磁盘驱动下 `../../` 这类取值可以写到上传目录之外。
  if (!isPlatformId(platform)) {
    return NextResponse.json({ error: "未知平台，拒绝上传。" }, { status: 400 });
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: `不支持的文件类型 .${extension || "?"}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `单个安装包不能超过 ${Math.floor(MAX_BYTES / 1024 / 1024)}MB。` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = toHex(new Uint8Array(digest));
  const key = buildStorageKey({ platform, version, fileName: file.name });

  try {
    const result = await putObject({ key, body: bytes });
    const storage = storageInfo();
    return NextResponse.json({
      ok: true,
      storage: storage.driver,
      key: result.key,
      fileName: file.name,
      fileSize: file.size,
      fileExt: extension,
      sha256,
      publicUrl: result.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败。" },
      { status: 500 },
    );
  }
}
