# MiniReel 下载站

MiniReel 安装包发布与下载站，采用 Google Material Design 3 风格，并使用品牌玫红色作为重点色。
支持 Android、TV（安卓盒子）、Windows、macOS、iOS 五类发布入口；未发布的平台保持空状态，
不会生成虚构版本或下载数据。

## 功能

### 公开站点

- 首页：各平台最新版本、真实下载统计、最近更新与明确空状态
- 平台页 `/download/[platform]`：最新版信息、安装指引与该平台历史版本
- 往期版本 `/versions`：平台筛选、版本搜索、分页；允许版本库完全为空
- 发布详情 `/release/[id]`：更新日志、文件信息、SHA-256 与下载入口
- iOS OTA 清单：`/install/<id>/manifest.plist`

### 管理后台

从首页锁形按钮或页脚进入 `/admin/login`：

- 密码登录、签名会话 Cookie、失败限流
- 发布、编辑、隐藏与删除安装包版本
- 拖拽上传至 Cloudflare R2 或填写 CDN 直链
- 上传时自动计算 SHA-256
- 仪表盘展示真实下载事件、14 天趋势和最近下载记录

## 真实统计逻辑

- 每次请求 `/api/download/:id` 时，数据库事务会同时：
  1. 将对应版本的 `downloads` 加一；
  2. 向 `download_events` 写入真实下载事件。
- 首页和后台的累计下载量直接聚合 `download_events`，不读取静态数字。
- 新数据库仅创建空表，不写入任何演示版本、历史版本或模拟下载事件。

## 环境变量

复制 `.env.example` 为 `.env`：

- `DATABASE_URL`：PostgreSQL 连接串（**Cloudflare 部署不需要**，那里走 wrangler.jsonc 的 Hyperdrive 绑定）
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`：后台口令与会话密钥，**生产环境两者都是必填**
- `STORAGE_DRIVER`：`r2` 或 `local`（不设置时：填了 `R2_ACCOUNT_ID` 就走 r2，否则回退本地磁盘）
- `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`
- `R2_PUBLIC_BASE_URL`：可选的 R2 公开/CDN 域名

## 本地运行

```bash
npm install
npx drizzle-kit push   # 或直接启动，首次访问会自动建空表
npm run dev
```

开发环境下若未设置 `ADMIN_PASSWORD`，后台会回退到 `minireel-admin` 方便本地调试；
**生产环境不会做任何回退**——缺少口令或会话密钥时后台直接判定为未配置并拒绝登录。

## 部署

两条路都支持，按需要选：

### 自托管 VPS（本机 PostgreSQL + 本机磁盘，无需 Cloudflare）

完整步骤见 **`DEPLOY_VPS.md`**。要点：装 Node 22 + PostgreSQL，`npm ci && npm run build`，
systemd 托管 `npm start`，Caddy 反代上 HTTPS。环境变量只需
`DATABASE_URL` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` / `STORAGE_DRIVER=local`。

### Cloudflare Workers

完整步骤见 **`DEPLOY_CLOUDFLARE.md`**。常用脚本：

```bash
npm run cf:build     # 构建 Worker 产物（.open-next/worker.js）
npm run cf:preview   # 本地预览
npm run cf:deploy    # 部署到 Cloudflare Workers
```

数据库走 Hyperdrive 连接 PostgreSQL，安装包存 R2，支持 R2 S3 兼容接口、
公开域名跳转与私有桶签名 URL。

两种方式可以通过环境变量随时切换，不需要改代码。
