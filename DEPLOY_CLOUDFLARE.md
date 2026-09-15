# Cloudflare 部署指南（下载站 + R2 资源存储）

下载站是 Next.js App Router 应用，通过 **OpenNext 适配器**部署到 Cloudflare Workers，
数据库走 **Hyperdrive** 连接 PostgreSQL，安装包存 **R2**。

> 也可以完全不用 Cloudflare：设置 `DATABASE_URL` + `STORAGE_DRIVER=local`（或 R2）
> 后 `npm run build && npm start` 跑在任意 Node 18+ 环境，功能一致。见文末第四节。

## 一、资源存储：Cloudflare R2

推荐使用 **R2 直链模式**（省流量、免代理），也可以让站点代理下载私有桶对象。

### 1. 创建桶与 API 令牌

```bash
npx wrangler r2 bucket create minireel-releases
```

在 Cloudflare 控制台 → **R2 → 管理 API 令牌** 创建具有「对象读/写」权限的令牌，得到：

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### 2. 配置公开域名（可选但推荐）

- 在桶的 **Settings → Public access** 绑定自定义域名（例如 `dl.example.com`），或使用 `r2.dev` 域名。
- 把它写入 `R2_PUBLIC_BASE_URL`，下载按钮会直接 302 跳转到该域名。
- 未配置公开域名时，站点会为对象生成 **15 分钟有效的签名 URL** 再跳转（同一个桶保持私有）。

### 3. 目录约定

```
releases/
  android/2.4.0/minireel-2.4.0-android-arm64-v8a.apk
  tv/2.4.0/minireel-2.4.0-androidtv.apk
  windows/2.4.0/minireel-2.4.0-windows-x64-setup.exe
  macos/2.4.0/minireel-2.4.0-macos-universal.dmg
  ios/2.4.0/minireel-2.4.0-ios-universal.ipa
```

也可以在后台「发布版本」里直接拖拽上传，站点会自动写入
`releases/<平台>/<版本>/<文件名>` 并计算 SHA-256。

> 后台直传单个文件上限 **100MB**：Workers 的请求体上限是 100MB、实例内存上限 128MB，
> 而上传实现是「整包读进内存 → 算 SHA-256 → 上传」。将来要支持更大的包，
> 应改成「浏览器预签名直传 R2」，让字节流不经过 Worker。

## 二、部署到 Cloudflare Workers

### 1. 准备数据库（Hyperdrive）

```bash
# 任选其一：Neon / Supabase / 自建 PostgreSQL
npx wrangler hyperdrive create minireel-db --connection-string="postgresql://user:pass@host:5432/minireel"
```

把返回的 id 填进 `wrangler.jsonc` 的 `hyperdrive[0].id`（**现在是占位符，不改会部署失败**）。

> 为什么必须用 Hyperdrive：Workers 上没有原生 TCP 出站，`pg` 只能连接 Hyperdrive
> 提供的连接串。`DATABASE_URL` 只是非 Workers 环境的兜底。

### 2. 依赖与脚本

适配器已在 `package.json` 里装好（`@opennextjs/cloudflare` + `wrangler`），
`next` 已升到 `^16.3.5`（适配器要求 `>=15.5.24 <16 || >=16.3.3`）。常用脚本：

```bash
npm run cf:build     # opennextjs-cloudflare build，产出 .open-next/worker.js
npm run cf:preview   # 构建 + 本地 wrangler 预览
npm run cf:deploy    # 构建 + wrangler deploy
npm run cf:typegen   # 生成 CloudflareEnv 类型（可选）
```

### 3. 运行时变量

`wrangler.jsonc` 已包含 `nodejs_compat`、R2 桶绑定、Hyperdrive 绑定与 `STORAGE_DRIVER=r2`。
敏感变量用 secret 写入：

```bash
npx wrangler secret put ADMIN_PASSWORD          # 必填，后台口令
npx wrangler secret put ADMIN_SESSION_SECRET    # 必填，随机长字符串（openssl rand -base64 48）
npx wrangler secret put R2_ACCOUNT_ID           # 使用 R2 时必填
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

> 生产环境**必须**设置 `ADMIN_PASSWORD` 与 `ADMIN_SESSION_SECRET`：
> 缺少任意一项时后台会直接判定为「未配置」并拒绝登录，不会退回内置默认口令。

### 4. 构建与发布

```bash
npm run cf:deploy
```

部署完成后访问 `/api/health` 应返回：

```json
{ "ok": true, "database": "connected", "storage": "r2" }
```

## 三、Cloudflare 相关的实现细节

| 能力 | 实现位置 |
| --- | --- |
| Hyperdrive 连接解析 | `src/db/index.ts`（Workers 每请求新建连接，Node 复用连接池） |
| R2 上传（S3 兼容签名） | `src/lib/storage.ts`（`aws4fetch`，可在 Workers 与 Node 中运行） |
| 公开域名直链跳转 | `src/app/api/download/[id]/route.ts` |
| 私有桶签名 URL | `src/lib/storage.ts` 的 `signedGetUrl()` |
| 大文件上传（上限 100MB，自动 SHA-256） | `src/app/api/admin/upload/route.ts` |
| 本地磁盘驱动（自托管/开发） | `.data/uploads` + `/api/files/[...key]` |
| 登录失败限流（持久化） | `src/lib/auth.ts` + `login_attempts` 表 |
| 客户端更新检查接口 | `/api/check?platform=android&version=2.3.0` |
| 版本列表接口 | `/api/releases?platform=tv&limit=5` |
| iOS OTA 安装清单 | `/install/<id>/manifest.plist` |

## 四、非 Cloudflare 部署（同样可用）

```bash
npm ci
export DATABASE_URL=postgresql://...
export ADMIN_PASSWORD=...
export ADMIN_SESSION_SECRET=...
npm run build
npm start
```

首次启动只会创建空表，不会写入任何演示版本或模拟下载数据。请登录后台发布真实安装包。
