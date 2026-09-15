import { sql } from "drizzle-orm";

import { getDb } from "@/db";

const DDL: string[] = [
  `create table if not exists releases (
     id serial primary key,
     platform text not null,
     version text not null,
     build_number integer,
     channel text not null default 'stable',
     title text not null default '',
     summary text,
     release_notes text,
     file_name text,
     file_size bigint,
     file_ext text,
     storage_key text,
     download_url text,
     sha256 text,
     arch text,
     min_os text,
     is_visible boolean not null default true,
     is_prerelease boolean not null default false,
     downloads integer not null default 0,
     published_at timestamptz not null default now(),
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists releases_platform_published_idx on releases (platform, published_at)`,
  `create index if not exists releases_visible_idx on releases (is_visible)`,
  `create table if not exists download_events (
     id serial primary key,
     release_id integer not null,
     platform text not null,
     version text not null,
     user_agent text,
     referer text,
     country text,
     created_at timestamptz not null default now()
   )`,
  `create index if not exists download_events_created_idx on download_events (created_at)`,
  // 登录失败限流。放在数据库里是因为 Cloudflare Workers 的 isolate 之间不共享内存，
  // 纯进程内计数在生产环境几乎没有作用。
  `create table if not exists login_attempts (
     key text primary key,
     count integer not null default 0,
     reset_at timestamptz not null
   )`,
  `create index if not exists login_attempts_reset_idx on login_attempts (reset_at)`,
];

let readyPromise: Promise<void> | null = null;

async function migrate(): Promise<void> {
  const db = await getDb();
  for (const statement of DDL) await db.execute(sql.raw(statement));
}

/** Creates the empty production schema when missing. No demo releases are ever inserted. */
export function ensureDatabase(): Promise<void> {
  if (!readyPromise) {
    readyPromise = migrate().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
