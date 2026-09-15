# VPS 部署指南（自托管：本机 PostgreSQL + 本机磁盘存储）

不依赖 Cloudflare：**不用 Hyperdrive、不用 R2、不用 OpenNext 适配器**。

```
浏览器 ──HTTPS──> Caddy ──> next start :3000 ──┬──> PostgreSQL 127.0.0.1:5432
                                               └──> .data/uploads（安装包文件）
```

适用：Ubuntu 22.04+ / Debian 12+。建议 ≥2 核 2GB 内存，4C/3.7G 非常充裕（实测占用约 775MB）。

本文按 **Ubuntu 22.04** 写，域名用免费二级域名 **`minireel.duckdns.org`**。

---

## 0. 域名指向（先做这步）

DuckDNS 的域名要显式指到 VPS 的公网 IP。两种方式任选：

**方式一：网页**
登录 <https://www.duckdns.org>，在 `minireel` 那一行把 `current ip` 填成 VPS 的公网 IP，点 update。

**方式二：命令行**（把 `<TOKEN>` 换成 DuckDNS 首页显示的那串 token）

```bash
curl -s "https://www.duckdns.org/update?domains=minireel&token=<TOKEN>&ip=$(curl -s https://api.ipify.org)"
```

返回 `OK` 即成功。验证解析（可能要等 1–2 分钟）：

```bash
dig +short minireel.duckdns.org
# 应输出你的 VPS 公网 IP
```

> **重要**：Caddy 申请 Let's Encrypt 证书走的是 80 端口校验，所以
> **域名必须先解析到本机、且 80/443 没有被占用或拦截**，否则证书签不下来。

> ⚠️ **如果 VPS 在中国大陆**：未备案的域名走 80/443 会被运营商拦截，HTTPS 拿不到证书。
> 这种情况要么先备案，要么换一台境外 VPS，要么把 DuckDNS 换成一个已备案域名。

---

## 0.5 NAT 机（共享 IP）注意

NAT 机没有独立公网 IP，只有提供商端口映射出去的那几个端口。**先确认拿到哪些公网端口**，
再决定走哪条路：

| 情况 | 做法 |
| --- | --- |
| 有公网 **80 + 443** | 按本文原样走，DuckDNS 的 A 记录指向提供商给的那个**共享公网 IP** |
| 只有 **443** | 把 Caddyfile 里的站点改成 `minireel.duckdns.org:443` 的映射端口，证书用 TLS-ALPN-01（Caddy 默认就会试） |
| **80/443 都没有** | 只能走 **DNS-01** 签发证书（不需要任何入站端口），站点跑在端口映射给你的高位端口上，访问形式是 `https://minireel.duckdns.org:<公网端口>` |
| 连高位端口也不给 | 换一台机器，或改用打洞方案（Cloudflare Tunnel / frp），后者需要一个能托管到 Cloudflare 的域名 |

DNS-01 需要带 duckdns 插件的 Caddy（官方 apt 源装的是原版，不带插件），要用 `xcaddy` 自己编：

```bash
sudo apt-get install -y xcaddy          # 或见 xcaddy 官方安装说明
xcaddy build --with github.com/caddy-dns/duckdns
sudo mv caddy /usr/bin/caddy && sudo systemctl restart caddy
```

Caddyfile 对应写法（`:8443` 换成映射给你的公网端口）：

```
minireel.duckdns.org:8443 {
    tls {
        dns duckdns {env.DUCKDNS_TOKEN}
    }
    reverse_proxy 127.0.0.1:3000
}
```

> 另外两点：NAT 机的带宽通常是共享的，40MB 安装包的下载速度要有心理预期；
> 共享公网 IP 万一被提供商换掉，DuckDNS 需要重新指向（可以挂个定时任务自动更新）。

---

## 1. 安装 Node 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 应输出 v22.x
```

## 2. 安装并初始化 PostgreSQL

```bash
sudo apt-get install -y postgresql
sudo systemctl enable --now postgresql

sudo -u postgres psql <<'SQL'
CREATE USER minireel WITH PASSWORD '换成你自己的强密码';
CREATE DATABASE minireel OWNER minireel;
SQL
```

表结构**不需要手动迁移**：应用首次访问时会自动创建空表（`ensureDatabase()`），
且不会写入任何演示数据。

## 3. 放置代码

```bash
sudo mkdir -p /srv/minireel && sudo chown "$USER" /srv/minireel
cd /srv/minireel
# 方式一：git clone <你的仓库> .
# 方式二：本地 rsync 上传（记得排除 node_modules / .next / node_modules_*）
npm ci
```

## 4. 配置环境变量

```bash
cat > /srv/minireel/.env <<'ENV'
DATABASE_URL=postgresql://minireel:你的密码@127.0.0.1:5432/minireel
ADMIN_PASSWORD=换成一个强密码
ADMIN_SESSION_SECRET=换成一串随机长字符串
STORAGE_DRIVER=local
ENV
chmod 600 /srv/minireel/.env
```

生成会话密钥：

```bash
openssl rand -base64 48
```

> 生产环境**必须**设置 `ADMIN_PASSWORD` 与 `ADMIN_SESSION_SECRET`：缺任意一项，
> 后台会判定为「未配置」并拒绝登录，不会退回内置默认口令。

## 5. 构建

```bash
cd /srv/minireel
npm run build
```

内存吃紧时（<2GB）加个上限：

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

## 6. 注册 systemd 服务

`/etc/systemd/system/minireel.service`：

```ini
[Unit]
Description=MiniReel download site
After=network.target postgresql.service

[Service]
Type=simple
User=你的用户名
WorkingDirectory=/srv/minireel
EnvironmentFile=/srv/minireel/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minireel
sudo systemctl status minireel --no-pager
```

> `WorkingDirectory` 必须是 `/srv/minireel`：安装包落盘路径是相对 `process.cwd()` 的
> `.data/uploads`，cwd 不对就会写到别处。

## 7. Caddy 反向代理 + 自动 HTTPS

```bash
sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`：

```
minireel.duckdns.org {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager   # 首次签发证书的日志，出错看这里
```

> Caddy 默认不限制请求体大小，后台上传大包不会被拦。
> 如果你在前面又加了一层 Nginx，记得 `client_max_body_size` 别小于上传上限。

## 8. 验证

```bash
curl -s https://minireel.duckdns.org/api/health
```

应返回：

```json
{ "ok": true, "database": "connected", "storage": "local", "storageDetail": "..." }
```

然后浏览器打开 `https://minireel.duckdns.org/admin/login` 登录，发一个包试下载。

> DuckDNS 的域名在 Let's Encrypt 的公共后缀列表里，**每个二级域名单独计算速率限制**，
> 不会因为别人乱申请就影响你，放心。

---

## 附：一次性初始化脚本

`1 → 2 → 7` 三步（Node + PostgreSQL + Caddy）可以一次性跑完。
把下面整段粘进 VPS 终端，**先把前两行的密码改掉**：

```bash
set -euo pipefail
DB_PASSWORD='换成数据库强密码'
ADMIN_PASSWORD='换成后台强密码'

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL + Caddy
sudo apt-get install -y postgresql caddy
sudo systemctl enable --now postgresql

# 建库建用户（已存在则跳过）
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='minireel'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER minireel WITH PASSWORD '${DB_PASSWORD}'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='minireel'" | grep -q 1 \
  || sudo -u postgres createdb -O minireel minireel

# 代码目录
sudo mkdir -p /srv/minireel && sudo chown "$USER" /srv/minireel

# 环境变量
cat > /srv/minireel/.env <<ENV
DATABASE_URL=postgresql://minireel:${DB_PASSWORD}@127.0.0.1:5432/minireel
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_SESSION_SECRET=$(openssl rand -base64 48)
STORAGE_DRIVER=local
ENV
chmod 600 /srv/minireel/.env

node -v && psql --version && caddy version
echo "初始化完成 → 接下来上传代码并 npm ci"
```

> 密码里**不要带单引号**，否则会打断 SQL 语句。

## 附：把代码传上 VPS

**方式一：rsync / scp（一次性）**

在**本地 Git Bash** 里执行（`node_modules*`、`.next`、`.open-next` 一律排除，否则会传几百 MB 垃圾）：

```bash
cd /d/MiniReel
rsync -avz --delete \
  --exclude node_modules --exclude 'node_modules_*' \
  --exclude .next --exclude .open-next --exclude .data \
  ./minireel-download-station-development/ \
  root@<VPS_IP>:/srv/minireel/
```

没有 rsync 就用 scp（先本地打 tar 更稳）：

```bash
cd /d/MiniReel/minireel-download-station-development
tar --exclude=node_modules --exclude='node_modules_*' --exclude=.next \
    --exclude=.open-next --exclude=.data -czf /tmp/mr-site.tgz .
scp /tmp/mr-site.tgz root@<VPS_IP>:/tmp/
# 然后在 VPS 上：tar -xzf /tmp/mr-site.tgz -C /srv/minireel
```

**方式二（推荐长期用）：把下载站推到 GitHub，VPS 上 `git clone`**

这样以后更新只要 `git pull && npm ci && npm run build && sudo systemctl restart minireel`，
也可以顺手接上 GitHub Actions 做部署。需要的话我可以帮你把仓库初始化并推送。

---

## 运维备忘

### 备份（两样都要备）

```bash
# 数据库：版本记录与下载统计
pg_dump -U minireel minireel | gzip > minireel-$(date +%F).sql.gz

# 安装包：.data/uploads 目录
tar -czf uploads-$(date +%F).tar.gz -C /srv/minireel .data/uploads
```

丢了数据库会失去版本列表与下载统计；丢了 uploads 会让所有下载链接失效。

### 上传体积

后台直传上限写在 `src/app/api/admin/upload/route.ts` 的 `MAX_BYTES`（当前 100MB）。
该实现会把整个包读进内存再算 SHA-256，**调大上限会同步抬高 Node 进程的内存峰值**：
每并发一个上传就多占约一个包大小的内存。VPS 内存充裕时可以适当调大。

下载路径已经是**流式**的（`createReadStream`），内存占用与文件大小无关。

### 流量与磁盘

安装包走 VPS 出口带宽。单个包 30–40MB，1000 次下载约 35GB 流量，注意月配额。
磁盘按「包大小 × 保留版本数」估算。

### 以后想换成对象存储

代码里两条路都留着，改环境变量即可，不用改代码：

- **任何 S3 兼容服务**（MinIO / Backblaze B2 / 阿里云 OSS / 腾讯云 COS）：
  设 `STORAGE_DRIVER=r2` + `R2_ENDPOINT` + `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` /
  `R2_SECRET_ACCESS_KEY` / `R2_BUCKET`。`r2` 驱动本身就是通用 S3 兼容实现，
  `R2_ENDPOINT` 指向别的厂商也能用。
  配了 `R2_PUBLIC_BASE_URL` 就让下载接口 302 跳到对象存储，不走 VPS 带宽。
- **回到 Cloudflare Workers**：`npm run cf:deploy`，适配器与 Hyperdrive 支持都在代码里。
