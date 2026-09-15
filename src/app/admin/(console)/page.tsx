import Link from "next/link";

import { toggleReleaseVisibilityAction } from "@/app/admin/actions";
import { Icon, PLATFORM_ICONS, type IconName } from "@/components/icons";
import { Notice } from "@/components/ui";
import { formatBytes, formatDate, formatNumber, relativeTime } from "@/lib/format";
import { PLATFORMS, platformDef } from "@/lib/platforms";
import { getDownloadTrend, getRecentDownloadEvents, getStats, listReleases } from "@/lib/releases";
import { storageInfo } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ saved?: string; deleted?: string; updated?: string; error?: string }> };

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [stats, releaseResult, events, trend] = await Promise.all([
    getStats(),
    listReleases({ includeHidden: true, limit: 8 }),
    getRecentDownloadEvents(8),
    getDownloadTrend(14),
  ]);
  const storage = storageInfo();
  const maxTrend = Math.max(...trend.map((row) => row.total), 1);

  return (
    <div className="flex flex-col gap-6">
      {params.saved ? <Notice tone="success">版本已保存并同步到下载站。</Notice> : null}
      {params.deleted ? <Notice tone="success">版本与安装包对象已删除。</Notice> : null}
      {params.updated ? <Notice tone="success">可见性已更新。</Notice> : null}
      {params.error ? <Notice tone="warning">操作未完成：{params.error}</Notice> : null}

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">仪表盘</h1>
          <p className="text-sm text-on-surface-variant">
            {stats.releaseCount ? `当前有 ${stats.releaseCount} 个公开版本` : "还没有发布任何版本"}
          </p>
        </div>
        <Link href="/admin/releases/new" className="md-filled-button md-small-button ml-auto">
          <Icon name="plus" size={16} />发布新版本
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: "download" as IconName, label: "真实下载次数", value: formatNumber(stats.totalDownloads) },
          { icon: "cube" as IconName, label: "公开版本", value: `${stats.releaseCount}` },
          { icon: "clock" as IconName, label: "最近更新", value: stats.lastPublishedAt ? formatDate(stats.lastPublishedAt) : "暂无" },
        ].map((item) => (
          <div key={item.label} className="md-card-elevated flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Icon name={item.icon} size={20} /></span>
            <div><p className="text-xs text-on-surface-variant">{item.label}</p><p className="text-xl font-bold">{item.value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="md-card p-6">
          <div className="flex items-center gap-2"><Icon name="chart" size={18} /><h2 className="text-base font-bold">近 14 天下载趋势</h2></div>
          {trend.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-surface-container px-5 py-8 text-center">
              <p className="text-sm font-semibold">暂无下载记录</p>
              <p className="mt-1 text-xs text-on-surface-variant">用户成功请求安装包后，这里会开始生成真实趋势。</p>
            </div>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-2">
              {trend.map((row) => (
                <div key={row.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-primary" style={{ height: `${Math.max((row.total / maxTrend) * 100, 6)}%` }} title={`${row.day} · ${row.total} 次`} />
                  <span className="text-[0.65rem] text-on-surface-variant">{row.day}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="md-card p-6">
          <div className="flex items-center gap-2"><Icon name="cloud" size={18} /><h2 className="text-base font-bold">资源存储</h2></div>
          <p className="mt-3 text-sm">{storage.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{storage.detail}</p>
          <div className="md-divider my-4" />
          <p className="text-xs leading-relaxed text-on-surface-variant">
            配置 R2 凭证后上传会自动写入 Cloudflare R2；配置公开域名后，下载请求会统计后直接跳转 CDN。
          </p>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-bold">最近发布</h2>
          <Link href="/admin/releases" className="md-text-button md-small-button ml-auto">管理全部版本<Icon name="arrow-right" size={15} /></Link>
        </div>
        {releaseResult.items.length === 0 ? (
          <div className="md-card flex flex-col items-center gap-3 p-10 text-center">
            <Icon name="archive" size={24} className="text-on-surface-variant" />
            <div><p className="text-sm font-semibold">暂无版本</p><p className="mt-1 text-xs text-on-surface-variant">点击“发布新版本”上传第一个安装包。</p></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {releaseResult.items.map((release) => (
              <div key={release.id} className="md-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                  <Icon name={(platformDef(release.platform) ? PLATFORM_ICONS[platformDef(release.platform)!.icon] : "cube") as IconName} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{platformDef(release.platform)?.name} v{release.version}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{formatDate(release.publishedAt)} · {formatBytes(release.fileSize)} · {formatNumber(release.downloads)} 次下载</p>
                </div>
                <form action={toggleReleaseVisibilityAction}>
                  <input type="hidden" name="id" value={release.id} />
                  <button type="submit" className="md-text-button md-small-button"><Icon name={release.isVisible ? "eye-off" : "eye"} size={15} />{release.isVisible ? "隐藏" : "公开"}</button>
                </form>
                <Link href={`/admin/releases/${release.id}`} className="md-tonal-button md-small-button"><Icon name="edit" size={15} />编辑</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="md-card p-6">
          <h2 className="flex items-center gap-2 text-base font-bold"><Icon name="download" size={18} />最近下载记录</h2>
          {events.length === 0 ? <p className="mt-3 text-sm text-on-surface-variant">暂无真实下载记录。</p> : (
            <ul className="mt-3 divide-y divide-outline-variant">
              {events.map((event) => <li key={event.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="md-chip">{platformDef(event.platform)?.name ?? event.platform}</span><span>v{event.version}</span><span className="ml-auto text-xs text-on-surface-variant">{relativeTime(event.createdAt)}</span></li>)}
            </ul>
          )}
        </section>

        <section className="md-card p-6">
          <h2 className="text-base font-bold">各平台发布状态</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((platform) => {
              const entry = stats.perPlatform.find((item) => item.platform === platform.id);
              return <Link key={platform.id} href={`/admin/releases/new?platform=${platform.id}`} className="flex items-center gap-2 rounded-2xl bg-surface-container px-3.5 py-3 text-sm"><Icon name={PLATFORM_ICONS[platform.icon] as IconName} size={17} /><span className="font-semibold">{platform.name}</span><span className="ml-auto text-xs text-on-surface-variant">{entry?.latestVersion ? `v${entry.latestVersion}` : "未发布"}</span></Link>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
