import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { PLATFORM_ICONS } from "@/components/icons";
import type { Release } from "@/db/schema";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { channelLabel, type PlatformDef } from "@/lib/platforms";

export function PlatformCard({
  platform,
  release,
}: {
  platform: PlatformDef;
  release: Release | null;
}) {
  const missing = !release;

  return (
    <article className="md-card md-card-hover flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
          }}
        >
          <Icon name={PLATFORM_ICONS[platform.icon] as IconName} size={24} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug">{platform.name}</h3>
          <p className="text-xs text-on-surface-variant">{platform.tagline}</p>
        </div>
        {release?.isPrerelease ? (
          <span className="md-chip md-chip-warning ml-auto">Beta</span>
        ) : release ? (
          <span className="md-chip md-chip-success ml-auto">正式版</span>
        ) : (
          <span className="md-chip ml-auto">待发布</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-on-surface-variant">{platform.description}</p>

      <div className="md-surface-tint flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1.5 font-semibold text-on-surface">
          <Icon name="cube" size={15} />
          {release ? `v${release.version}` : "暂未发布"}
        </span>
        {release ? (
          <>
            <span className="flex items-center gap-1.5">
              <Icon name="archive" size={15} />
              {formatBytes(release.fileSize)}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={15} />
              {formatDate(release.publishedAt)}
            </span>
          </>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {missing ? (
          <span className="md-outlined-button md-small-button pointer-events-none opacity-60">
            <Icon name="archive" size={16} />
            暂无下载
          </span>
        ) : (
          <a href={`/api/download/${release.id}`} className="md-filled-button md-small-button">
            <Icon name="download" size={17} />
            立即下载 · {platform.fileExt.toUpperCase()}
          </a>
        )}
        <Link
          href={`/download/${platform.slug}`}
          className="md-text-button md-small-button inline-flex items-center gap-1"
        >
          全部版本
          <Icon name="arrow-right" size={16} />
        </Link>
        {release ? (
          <span className="ml-auto text-xs text-on-surface-variant">
            {formatNumber(release.downloads)} 次下载
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ReleaseList({
  items,
  showPlatform = false,
  emptyText = "暂无版本记录",
}: {
  items: Release[];
  showPlatform?: boolean;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="md-card flex flex-col items-center gap-2 p-10 text-center">
        <Icon name="archive" size={26} className="text-on-surface-variant" />
        <p className="text-sm font-semibold">{emptyText}</p>
        <p className="text-xs text-on-surface-variant">发布新版本后会在这里自动出现。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((release) => (
        <div
          key={release.id}
          className="md-card md-card-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">v{release.version}</span>
              {showPlatform ? (
                <span className="md-chip md-chip-primary">{release.platform.toUpperCase()}</span>
              ) : null}
              {release.isPrerelease ? (
                <span className="md-chip md-chip-warning">{channelLabel(release.channel)}</span>
              ) : (
                <span className="md-chip md-chip-success">正式版</span>
              )}
              {release.arch ? <span className="md-chip">{release.arch}</span> : null}
              {!release.isVisible ? <span className="md-chip">已隐藏</span> : null}
            </div>
            <p className="mt-2 truncate text-sm text-on-surface-variant">
              {release.summary || release.title || "版本更新记录"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={14} />
                {formatDate(release.publishedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="archive" size={14} />
                {formatBytes(release.fileSize)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="download" size={14} />
                {formatNumber(release.downloads)}
              </span>
              {release.minOs ? <span className="hidden sm:inline">{release.minOs}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/release/${release.id}`} className="md-outlined-button md-small-button">
              <Icon name="book" size={16} />
              发布详情
            </Link>
            <a href={`/api/download/${release.id}`} className="md-filled-button md-small-button">
              <Icon name="download" size={16} />
              下载
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
