import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { MarkdownView } from "@/components/markdown-view";
import { PlatformCard } from "@/components/release-list";
import { SectionTitle } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { PLATFORMS, PLATFORM_MAP } from "@/lib/platforms";
import { getLatestByPlatform, getStats, listReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "search", title: "找剧不费劲", body: "真人剧、漫剧、AI 剧与动漫分类浏览，支持题材、状态与集数筛选。" },
  { icon: "play", title: "沉浸式观看", body: "竖屏翻集、横屏调进度、长按加速，亮度与音量随手可调。" },
  { icon: "refresh", title: "连播更顺滑", body: "提前缓存下一集开头画面，横屏与桌面端连播几乎无等待。" },
  { icon: "shield", title: "数据留在本地", body: "无需注册账号，收藏、观看记录与设置只保存在你的设备。" },
];

export default async function HomePage() {
  const [latestByPlatform, stats, recent] = await Promise.all([
    getLatestByPlatform(),
    getStats(),
    listReleases({ limit: 6 }),
  ]);
  const heroRelease = latestByPlatform.android ?? latestByPlatform.windows ?? recent.items[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
      <section className="grid items-center gap-10 py-12 md:grid-cols-[1.15fr_1fr] md:py-16">
        <div className="md-appear">
          <span className="md-chip md-chip-primary">
            <Icon name="sparkle" size={15} />
            MiniReel 安装包分发
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl">
            好故事，<span className="text-primary">随时开场</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-on-surface-variant">
            MiniReel 是一款短剧播放器。挑一部感兴趣的短剧，用顺手的操作观看；喜欢就收藏，下次打开接着看。
            各平台安装包发布后会在这里开放下载，历史版本也会同步归档。
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#download" className="md-filled-button">
              <Icon name="download" size={18} />选择设备下载
            </a>
            <Link href="/versions" className="md-outlined-button">
              <Icon name="archive" size={18} />查看往期版本
            </Link>
          </div>

          <dl className="mt-9 grid max-w-md grid-cols-2 gap-4">
            <div className="rounded-3xl bg-surface-container px-4 py-3.5">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-on-surface-variant">累计下载</dt>
              <dd className="mt-1 text-lg font-bold">{formatNumber(stats.totalDownloads)}</dd>
            </div>
            <div className="rounded-3xl bg-surface-container px-4 py-3.5">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-on-surface-variant">版本记录</dt>
              <dd className="mt-1 text-lg font-bold">{stats.releaseCount}</dd>
            </div>
          </dl>
        </div>

        <div className="md-appear relative">
          <div className="overflow-hidden rounded-[2.5rem] border border-outline-variant bg-surface-container-low shadow-[var(--md-elevated-3)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero-reel.png" alt="MiniReel 播放界面示意" width={1024} height={1024} className="h-auto w-full" />
          </div>
          {heroRelease ? (
            <div className="md-card-elevated absolute -bottom-6 left-4 right-4 flex items-center gap-3 px-5 py-4 sm:left-8 sm:right-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                <Icon name="check-circle" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">最新发布</p>
                <p className="truncate text-sm font-bold">{PLATFORM_MAP[heroRelease.platform]?.name} v{heroRelease.version} · {formatDate(heroRelease.publishedAt)}</p>
              </div>
              <a href={`/api/download/${heroRelease.id}`} className="md-filled-button md-small-button ml-auto shrink-0">下载</a>
            </div>
          ) : null}
        </div>
      </section>

      <section id="download" className="scroll-mt-24 pt-14">
        <SectionTitle
          eyebrow="下载中心"
          title="选择你的设备"
          description="仅已发布安装包的平台可以下载；尚未发布的平台会显示暂无版本。"
          action={{ href: "/versions", label: "全部历史版本" }}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} release={latestByPlatform[platform.id]} />
          ))}
        </div>
      </section>

      <section className="pt-16">
        <div className="grid items-center gap-8 rounded-[2.5rem] bg-surface-container p-6 sm:p-10 md:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionTitle eyebrow="播放体验" title="顺手、流畅、舒适" description="手机、大屏与桌面端遵循一致的播放逻辑，降低操作成本。" />
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-3xl bg-surface-lowest p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Icon name={feature.icon} size={18} /></span>
                  <h3 className="mt-2.5 text-sm font-bold">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/devices-row.png" alt="MiniReel 多设备示意" width={1024} height={512} className="h-auto w-full" />
          </div>
        </div>
      </section>

      <section className="pt-16">
        <SectionTitle eyebrow="更新日志" title="最近发布" description="发布记录会从后台实时同步到这里。" action={{ href: "/versions", label: "往期版本" }} />
        {recent.items.length === 0 ? (
          <div className="md-card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant"><Icon name="archive" size={23} /></span>
            <div>
              <p className="text-sm font-bold">暂无版本发布</p>
              <p className="mt-1 text-xs text-on-surface-variant">安装包发布后，版本号和更新日志会显示在这里。</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            {recent.items.slice(0, 1).map((release) => (
              <article key={release.id} className="md-card p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="md-chip md-chip-primary">{PLATFORM_MAP[release.platform]?.name ?? release.platform}</span>
                  <span className="md-chip">v{release.version}</span>
                  <span className="md-chip">{formatDate(release.publishedAt)}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{release.title || `v${release.version}`}</h3>
                <div className="mt-3 max-h-72 overflow-hidden"><MarkdownView content={release.releaseNotes} /></div>
                <div className="mt-4 flex gap-2">
                  <a href={`/api/download/${release.id}`} className="md-filled-button md-small-button"><Icon name="download" size={16} />下载</a>
                  <Link href={`/release/${release.id}`} className="md-text-button md-small-button">完整说明</Link>
                </div>
              </article>
            ))}
            <div className="flex flex-col gap-3">
              {recent.items.slice(1).map((release) => (
                <Link key={release.id} href={`/release/${release.id}`} className="md-card md-card-hover flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Icon name="cube" size={18} /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{PLATFORM_MAP[release.platform]?.name} v{release.version}</p><p className="text-xs text-on-surface-variant">{formatDate(release.publishedAt)}</p></div>
                  <Icon name="arrow-right" size={16} className="ml-auto text-on-surface-variant" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="pt-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: "download" as IconName, label: "真实下载次数", value: formatNumber(stats.totalDownloads) },
            { icon: "cube" as IconName, label: "公开版本", value: `${stats.releaseCount}` },
            { icon: "clock" as IconName, label: "最近更新", value: stats.lastPublishedAt ? formatDate(stats.lastPublishedAt) : "暂无" },
          ].map((item) => (
            <div key={item.label} className="md-card-elevated flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Icon name={item.icon} size={20} /></span>
              <div><p className="text-xs text-on-surface-variant">{item.label}</p><p className="text-xl font-bold">{item.value}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
