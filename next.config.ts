import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare 构建走 `npm run cf:build`（OpenNext 适配器），
  // 适配器会自动读取仓库根目录的 open-next.config.mjs 与 wrangler.jsonc。
};

export default nextConfig;

// 本地想在 `next dev` 里直接使用 R2 / Hyperdrive 绑定时，取消下面两行注释。
// 注意：需要 wrangler.jsonc 里的 hyperdrive.id 已经填成真实 id，否则 wrangler 会报错。
// 默认不开，是因为本地开发用 .env 里的 DATABASE_URL + 本地磁盘驱动就够了。
//
// import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
// initOpenNextCloudflareForDev();
