import { AwsClient } from "aws4fetch";

export type StorageDriver = "r2" | "local";

const LOCAL_ROOT = ".data/uploads";

export function storageDriver(): StorageDriver {
  const configured = (process.env.STORAGE_DRIVER || "").toLowerCase();
  if (configured === "r2") return "r2";
  if (configured === "local") return "local";
  return process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID ? "r2" : "local";
}

export function storageInfo() {
  if (storageDriver() === "r2") {
    return {
      driver: "r2" as const,
      label: "Cloudflare R2",
      detail: process.env.R2_BUCKET
        ? `桶：${process.env.R2_BUCKET}${process.env.R2_PUBLIC_BASE_URL ? " · 公开域名已配置" : " · 私有桶（签名代理下载）"}`
        : "已启用 R2，但缺少 R2_BUCKET 配置",
    };
  }
  return {
    driver: "local" as const,
    label: "本地磁盘",
    detail: `安装包写入 ${LOCAL_ROOT}，适合本地开发与自托管；配置 R2 环境变量后自动切换到 R2。`,
  };
}

/**
 * 把存储键解析成磁盘路径，并确认结果仍然落在 `.data/uploads` 之内。
 * 只靠调用方过滤 `..` 不够——`storageKey` 可以在后台表单里手填，
 * 所以这里做一次归一化 + 归属校验，越界的键直接判为非法。
 */
async function resolveLocalPath(key: string): Promise<string | null> {
  const path = await import("node:path");
  const root = path.resolve(process.cwd(), LOCAL_ROOT);
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

function r2Client(): { client: AwsClient; endpoint: (key: string) => URL; bucket: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 未配置完整：需要 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET",
    );
  }

  const base = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: "auto",
    service: "s3",
  });

  return {
    client,
    bucket,
    endpoint: (key: string) => new URL(`${base.replace(/\/$/, "")}/${bucket}/${key}`),
  };
}

export function publicUrlFor(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export type PutResult = { key: string; publicUrl: string | null; size: number };

export async function putObject(options: {
  key: string;
  body: Uint8Array;
  contentType?: string;
}): Promise<PutResult> {
  const { key, body, contentType } = options;

  if (storageDriver() === "r2") {
    const { client, endpoint } = r2Client();
    const response = await client.fetch(endpoint(key), {
      method: "PUT",
      body: body as unknown as BodyInit,
      headers: {
        "content-type": contentType || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
    if (!response.ok) {
      throw new Error(`上传到 R2 失败（${response.status}）：${await response.text()}`);
    }
    return { key, publicUrl: publicUrlFor(key), size: body.byteLength };
  }

  const target = await resolveLocalPath(key);
  if (!target) throw new Error(`非法的存储键：${key}`);
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return { key, publicUrl: `/api/files/${key}`, size: body.byteLength };
}

export async function deleteObject(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (storageDriver() === "r2") {
      const { client, endpoint } = r2Client();
      await client.fetch(endpoint(key), { method: "DELETE" });
      return;
    }
    const target = await resolveLocalPath(key);
    if (!target) return;
    const { rm } = await import("node:fs/promises");
    await rm(target, { force: true });
  } catch {
    // Deleting a missing object must never break a release edit.
  }
}

export type LocalObject = { stream: ReadableStream<Uint8Array>; size: number };

/**
 * 以**流式**读取本地对象。
 *
 * 早期实现是 `readFile` 把整个安装包读进内存再返回——40MB 的包并发下载几个，
 * 小内存 VPS 就被打爆了。改成 `createReadStream` + `Readable.toWeb`，
 * 内存占用与文件大小脱钩；`size` 仍然返回，用于给出 content-length（浏览器才能显示进度）。
 */
export async function readLocalObject(key: string): Promise<LocalObject | null> {
  try {
    const target = await resolveLocalPath(key);
    if (!target) return null;
    const { stat } = await import("node:fs/promises");
    const { createReadStream } = await import("node:fs");
    const { Readable } = await import("node:stream");
    const info = await stat(target);
    if (!info.isFile()) return null;
    const stream = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;
    return { stream, size: info.size };
  } catch {
    return null;
  }
}

/** Signed, short-lived GET URL for private R2 buckets. */
export async function signedGetUrl(key: string, expiresSeconds = 900): Promise<string | null> {
  if (storageDriver() !== "r2") return null;
  const { client, endpoint } = r2Client();
  const url = endpoint(key);
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client.sign(url, { aws: { signQuery: true } });
  return signed.url.toString();
}

export function buildStorageKey(input: {
  platform: string;
  version: string;
  fileName: string;
}): string {
  const safeFile = input.fileName.replace(/[^\w.\-]+/g, "-");
  const safeVersion = input.version.replace(/[^\w.\-]+/g, "-");
  return `releases/${input.platform}/${safeVersion}/${safeFile}`;
}
