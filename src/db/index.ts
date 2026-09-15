import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * 数据库连接。
 *
 * Cloudflare Workers 上 `pg` 必须通过 Hyperdrive 的连接串访问 PostgreSQL，
 * 而且**不能跨请求复用连接**——Workerd 会把复用的 socket 判定为「属于另一个请求」并直接报错。
 * 所以这里分两条路径：
 *   - Workers：每次请求新建一个 Pool，用完随请求结束释放（Hyperdrive 在边缘做了真正的连接池）；
 *   - Node / 自托管：复用进程级 Pool。
 *
 * 同时，连接串的解析被推迟到「第一次查询时」，这样 `next build` 期间不会再因为
 * 缺少 DATABASE_URL 而直接抛错。
 */

let nodePool: Pool | null = null;

type HyperdriveBinding = { connectionString?: string };

async function hyperdriveConnectionString(): Promise<string | null> {
  try {
    // 动态 import：不在 Cloudflare 运行时（next dev / node start / 构建期）会走兜底分支。
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const binding = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
    return binding?.connectionString?.trim() ? binding.connectionString : null;
  } catch {
    return null;
  }
}

function envConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "数据库未配置：Cloudflare 上请先创建 Hyperdrive 并把 id 填进 wrangler.jsonc；" +
        "其他环境请设置 DATABASE_URL。",
    );
  }
  return url;
}

export type Database = NodePgDatabase<Record<string, never>>;

export async function getDb(): Promise<Database> {
  const hyperdrive = await hyperdriveConnectionString();
  if (hyperdrive) {
    return drizzle(new Pool({ connectionString: hyperdrive, max: 5 }));
  }

  if (!nodePool) {
    nodePool = new Pool({ connectionString: envConnectionString(), max: 10 });
  }
  return drizzle(nodePool);
}
