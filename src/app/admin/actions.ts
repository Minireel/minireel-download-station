"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { releases } from "@/db/schema";
import {
  adminConfigStatus,
  clearAttempts,
  endAdminSession,
  isAdminAuthenticated,
  loginThrottle,
  registerFailedAttempt,
  startAdminSession,
  verifyPassword,
} from "@/lib/auth";
import { PLATFORM_LABEL, RELEASE_CHANNELS, isPlatformId } from "@/lib/platforms";
import { deleteObject } from "@/lib/storage";

export type FormState = { error?: string; success?: string } | null;

async function assertAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

async function clientKey(): Promise<string> {
  const store = await headers();
  return (
    store.get("cf-connecting-ip") ||
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    "unknown-client"
  );
}

function refreshSite(platform?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/versions");
  if (platform) revalidatePath(`/download/${platform}`);
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // 生产环境缺少 ADMIN_PASSWORD / ADMIN_SESSION_SECRET 时直接拒绝登录，
  // 而不是退回内置默认口令。
  if (!adminConfigStatus().ready) {
    return {
      error:
        "后台尚未完成配置：请先设置 ADMIN_PASSWORD 与 ADMIN_SESSION_SECRET，再继续登录。",
    };
  }

  const key = await clientKey();
  const throttle = await loginThrottle(key);
  if (throttle.blocked) return { error: `尝试次数过多，请 ${throttle.retryInSeconds} 秒后再试。` };
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "请输入管理密码。" };
  if (!(await verifyPassword(password))) {
    await registerFailedAttempt(key);
    return { error: "密码不正确，请重新输入。" };
  }
  await clearAttempts(key);
  await startAdminSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

function readNumber(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readText(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/** 新建发布时前端用 `assetsJson` 一次提交多个平台的安装包。 */
type AssetPayload = {
  platform?: string;
  storageKey?: string;
  fileName?: string;
  fileSize?: number | null;
  fileExt?: string | null;
  sha256?: string | null;
  arch?: string | null;
  minOs?: string | null;
};

function parseAssets(formData: FormData): AssetPayload[] {
  const raw = String(formData.get("assetsJson") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssetPayload[]) : [];
  } catch {
    return [];
  }
}

export async function saveReleaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  await ensureDatabase();
  const db = await getDb();

  const id = readNumber(formData, "id");
  const version = readText(formData, "version");
  if (!version) return { error: "请填写版本号，例如 2.4.0。" };
  if (version.length > 40) return { error: "版本号过长。" };

  const channelRaw = readText(formData, "channel");
  const channel = (RELEASE_CHANNELS as readonly string[]).includes(channelRaw) ? channelRaw : "stable";
  const publishedRaw = readText(formData, "publishedAt");
  const publishedAt = publishedRaw ? new Date(`${publishedRaw}T12:00:00.000Z`) : new Date();

  // 多平台共用的字段
  const shared = {
    version,
    buildNumber: readNumber(formData, "buildNumber"),
    channel,
    summary: readText(formData, "summary") || null,
    releaseNotes: readText(formData, "releaseNotes") || null,
    isVisible: formData.get("isVisible") === "on" || formData.get("isVisible") === "true",
    isPrerelease: formData.get("isPrerelease") === "on" || formData.get("isPrerelease") === "true",
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    updatedAt: new Date(),
  };
  const customTitle = readText(formData, "title");

  let redirectTo = "/admin/releases?saved=new";
  const touched = new Set<string>();

  try {
    if (id) {
      // —— 编辑已有记录：单平台 ——
      const platform = readText(formData, "platform");
      if (!isPlatformId(platform)) return { error: "请选择有效的平台。" };
      const fileName = readText(formData, "fileName") || null;
      await db
        .update(releases)
        .set({
          ...shared,
          title: customTitle || `MiniReel ${version}`,
          platform,
          fileName,
          fileSize: readNumber(formData, "fileSize"),
          fileExt:
            readText(formData, "fileExt") ||
            (fileName?.includes(".") ? fileName.split(".").pop()! : null),
          storageKey: readText(formData, "storageKey") || null,
          downloadUrl: readText(formData, "downloadUrl") || null,
          sha256: readText(formData, "sha256") || null,
          arch: readText(formData, "arch") || null,
          minOs: readText(formData, "minOs") || null,
        })
        .where(eq(releases.id, id));
      touched.add(platform);
      redirectTo = `/admin/releases?saved=${id}`;
    } else {
      // —— 新建：一个平台一条记录，一次提交批量写入 ——
      const assets = parseAssets(formData);
      if (!assets.length) return { error: "请至少为一个平台上传安装包。" };

      const rows = [];
      for (const asset of assets) {
        const platform = String(asset.platform ?? "");
        if (!isPlatformId(platform)) return { error: `未知平台：${platform || "(空)"}` };
        const fileName = asset.fileName?.trim() || null;
        rows.push({
          ...shared,
          platform,
          title: customTitle || `MiniReel ${version} · ${PLATFORM_LABEL[platform] ?? platform}`,
          fileName,
          fileSize:
            typeof asset.fileSize === "number" && Number.isFinite(asset.fileSize)
              ? asset.fileSize
              : null,
          fileExt:
            asset.fileExt?.trim() ||
            (fileName?.includes(".") ? fileName.split(".").pop()! : null),
          storageKey: asset.storageKey?.trim() || null,
          downloadUrl: null,
          sha256: asset.sha256?.trim() || null,
          arch: asset.arch?.trim() || null,
          minOs: asset.minOs?.trim() || null,
        });
        touched.add(platform);
      }
      if (!rows.some((row) => row.storageKey)) {
        return { error: "没有拿到有效的安装包对象，请重新上传后再提交。" };
      }

      await db.insert(releases).values(rows);
      redirectTo = "/admin/releases?saved=new";
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "保存失败，请稍后再试。" };
  }

  // redirect() 靠抛异常实现，必须放在 try/catch 之外，否则会被当成保存失败吞掉。
  for (const platform of touched) refreshSite(platform);
  redirect(redirectTo);
}

export async function deleteReleaseAction(formData: FormData): Promise<void> {
  await assertAdmin();
  await ensureDatabase();
  const db = await getDb();
  const id = readNumber(formData, "id");
  if (!id) redirect("/admin/releases?error=missing-id");
  const [existing] = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
  await db.delete(releases).where(eq(releases.id, id));
  if (existing?.storageKey) await deleteObject(existing.storageKey);
  refreshSite(existing?.platform);
  redirect("/admin/releases?deleted=1");
}

export async function toggleReleaseVisibilityAction(formData: FormData): Promise<void> {
  await assertAdmin();
  await ensureDatabase();
  const db = await getDb();
  const id = readNumber(formData, "id");
  if (!id) redirect("/admin/releases?error=missing-id");
  const [existing] = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
  if (existing) {
    await db.update(releases).set({ isVisible: !existing.isVisible, updatedAt: new Date() }).where(eq(releases.id, id));
    refreshSite(existing.platform);
  }
  redirect("/admin/releases?updated=1");
}
