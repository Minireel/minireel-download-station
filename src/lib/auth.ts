import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { loginAttempts } from "@/db/schema";

/** 限流相关的读写都需要先确认表存在。 */
async function attemptsDb() {
  await ensureDatabase();
  return getDb();
}

const COOKIE_NAME = "minireel_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

/** 开发环境兜底口令。生产环境**不会**使用它，缺少密码时后台直接判定为未配置。 */
const DEV_PASSWORD = "minireel-admin";
const DEV_SECRET = "minireel-dev-signing-key";
/** 口令比较用的固定 pepper，只用于让比较过程恒定时间，不承担保密职责。 */
const PASSWORD_PEPPER = "minireel::password::compare";

function encoder() {
  return new TextEncoder();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return new Uint8Array(signature);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * 生产环境**不再**回退到内置口令或由口令派生签名密钥。
 * 之前那样做的问题是：忘记配 secret 时，后台口令是 README 里公开写着的 `minireel-admin`，
 * 而会话签名密钥又能从同一口令推导出来，等于任何人都能伪造管理员会话。
 */
function configuredPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  if (value) return value;
  return isProduction() ? null : DEV_PASSWORD;
}

function configuredSecret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  if (value) return value;
  return isProduction() ? null : DEV_SECRET;
}

export type AdminConfigStatus = {
  passwordConfigured: boolean;
  secretConfigured: boolean;
  ready: boolean;
};

export function adminConfigStatus(): AdminConfigStatus {
  const passwordConfigured = Boolean(process.env.ADMIN_PASSWORD?.trim());
  const secretConfigured = Boolean(process.env.ADMIN_SESSION_SECRET?.trim());
  return {
    passwordConfigured,
    secretConfigured,
    ready: Boolean(configuredPassword() && configuredSecret()),
  };
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const expected = configuredPassword();
  if (!expected || !candidate) return false;
  const [a, b] = await Promise.all([
    hmac(PASSWORD_PEPPER, expected),
    hmac(PASSWORD_PEPPER, candidate),
  ]);
  return equalBytes(a, b);
}

export async function createSessionToken(): Promise<string | null> {
  const secret = configuredSecret();
  if (!secret) return null;
  const payload = toBase64Url(
    encoder().encode(
      JSON.stringify({
        sub: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      }),
    ),
  );
  const signature = toBase64Url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = configuredSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = toBase64Url(await hmac(secret, payload));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return false;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      exp?: number;
      sub?: string;
    };
    if (decoded.sub !== "admin" || !decoded.exp) return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function startAdminSession(): Promise<void> {
  const token = await createSessionToken();
  if (!token) throw new Error("ADMIN_SESSION_SECRET 未配置，无法创建管理会话。");
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction(),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/* ------------------------------ rate limiting ----------------------------- */

/**
 * 登录失败限流，两层：
 *
 * 1. 进程内 Map：同一 isolate 内的快速拦截，避免每次失败都打数据库；
 * 2. `login_attempts` 表：真正的持久层。
 *
 * 第 2 层是必需的——Cloudflare Workers 的 isolate 之间不共享内存，也不保证存活，
 * 只靠进程内计数在生产环境几乎拦不住人。
 */
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 5 * 60 * 1000;
const MEMORY_LIMIT = 5000;

type Bucket = { count: number; resetAt: number };
const attempts = new Map<string, Bucket>();

/** 只把客户端标识的哈希落库，不保存明文 IP。 */
export async function throttleKey(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function loginThrottle(
  rawKey: string,
): Promise<{ blocked: boolean; retryInSeconds: number }> {
  const now = Date.now();
  const local = attempts.get(rawKey);
  if (local && local.resetAt >= now && local.count >= MAX_ATTEMPTS) {
    return { blocked: true, retryInSeconds: Math.ceil((local.resetAt - now) / 1000) };
  }

  try {
    const key = await throttleKey(rawKey);
    const db = await attemptsDb();
    const [row] = await db
      .select({ count: loginAttempts.count, resetAt: loginAttempts.resetAt })
      .from(loginAttempts)
      .where(eq(loginAttempts.key, key))
      .limit(1);
    if (row && row.count >= MAX_ATTEMPTS && row.resetAt.getTime() > now) {
      return { blocked: true, retryInSeconds: Math.ceil((row.resetAt.getTime() - now) / 1000) };
    }
  } catch {
    // 数据库不可用时放行登录，不要因为统计层故障把人彻底锁在门外。
  }

  return { blocked: false, retryInSeconds: 0 };
}

export async function registerFailedAttempt(rawKey: string): Promise<void> {
  const now = Date.now();
  const local = attempts.get(rawKey);
  if (!local || local.resetAt < now) {
    if (attempts.size > MEMORY_LIMIT) attempts.clear();
    attempts.set(rawKey, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    local.count += 1;
  }

  try {
    const key = await throttleKey(rawKey);
    const resetAt = new Date(now + WINDOW_MS);
    const db = await attemptsDb();
    await db.execute(sql`
      insert into login_attempts (key, count, reset_at)
      values (${key}, 1, ${resetAt})
      on conflict (key) do update set
        count = case
          when login_attempts.reset_at <= now() then 1
          else login_attempts.count + 1
        end,
        reset_at = case
          when login_attempts.reset_at <= now() then excluded.reset_at
          else login_attempts.reset_at
        end
    `);
  } catch {
    // 同上：限流写入失败不影响本次响应。
  }
}

export async function clearAttempts(rawKey: string): Promise<void> {
  attempts.delete(rawKey);
  try {
    const key = await throttleKey(rawKey);
    const db = await attemptsDb();
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
    // 顺手清理过期记录，避免表无界增长。
    await db.execute(sql`delete from login_attempts where reset_at < now() - interval '1 day'`);
  } catch {
    // 忽略。
  }
}
