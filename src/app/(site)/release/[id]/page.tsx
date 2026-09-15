import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/copy-button";
import { Icon, PLATFORM_ICONS, type IconName } from "@/components/icons";
import { MarkdownView } from "@/components/markdown-view";
import { Notice, SectionTitle } from "@/components/ui";
import { formatBytes, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { channelLabel, platformDef } from "@/lib/platforms";
import { getPlatformHistory, getReleaseById } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const release = await getReleaseById(Number.parseInt(id, 10));
  if (!release) return { title: "版本不存在" };
  const def = platformDef(release.platform);
  return {
    title: `${def?.name ?? release.platform} v${release.version} 发布详情`,
    description: release.summary ?? `MiniReel ${def?.name ?? release.platform} v${release.version} 安装包与更新日志。`,
  };
}

export default async function ReleaseDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const release = await getReleaseById(Number.parseInt(id, 10));
  if (!release) notFound();

  const def = platformDef(release.platform);
  const history = await getPlatformHistory(release.platform, 8);
  const others = history.filter((item) => item.id !== release.id).slice(0, 5);
  const hasAsset = Boolean(release.storageKey || release.downloadUrl);

  const meta: { label: string; value: string }[] = [
    { label: "平台", value: def?.name ?? release.platform.toUpperCase() },
    { label: "版本号", value: `v${release.version}` },
    { label: "构建号", value: release.buildNumber ? `${release.buildNumber}` : "—" },
    { label: "渠道", value: channelLabel(release.channel) },
    { label: "架构", value: release.arch || "—" },
    { label: "系统要求", value: release.minOs || def?.defaultMinOs || "—" },
    { label: "文件大小", value: formatBytes(release.fileSize) },
    { label: "发布日期", value: formatDate(release.publishedAt) },
    { label: "累计下载", value: `${formatNumber(release.downloads)} 次` },
    { label: "更新时间", value: formatDateTime(release.updatedAt) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/" className="hover:text-primary">
          下载首页
        </Link>
        <Icon name="arrow-right" size={14} />
        <Link href={`/download/${release.platform}`} className="hover:text-primary">
          {def?.name ?? release.platform}
        </Link>
        <Icon name="arrow-right" size={14} />
        <span className="font-semibold text-on-surface">v{release.version}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <header className="md-card p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
                <Icon
                  name={(def ? PLATFORM_ICONS[def.icon] : "cube") as IconName}
                  size={22}
                />
              </span>
              <div className="mr-2">
                <p className="text-xs text-on-surface-variant">{def?.name ?? release.platform}</p>
                <h1 className="text-2xl font-black tracking-tight">v{release.version}</h1>
              </div>
              {release.isPrerelease ? (
                <span className="md-chip md-chip-warning">{channelLabel(release.channel)}</span>
              ) : (
                <span className="md-chip md-chip-success">正式版</span>
              )}
              {!release.isVisible ? <span className="md-chip">未公开</span> : null}
            </div>

            {release.title ? <h2 className="mt-5 text-lg font-bold">{release.title}</h2> : null}
            {release.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{release.summary}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {hasAsset && release.isVisible ? (
                <a href={`/api/download/${release.id}`} className="md-filled-button">
                  <Icon name="download" size={18} />
                  下载 {release.fileName?.split(".").pop()?.toUpperCase() || "安装包"}
                </a>
              ) : (
                <span className="md-outlined-button pointer-events-none opacity-70">
                  <Icon name="archive" size={18} />
                  该版本安装包未开放下载
                </span>
              )}
              {release.platform === "ios" && hasAsset && release.isVisible ? (
                <a href={`/install/${release.id}/manifest.plist`} className="md-outlined-button">
                  <Icon name="link" size={16} />
                  OTA 安装
                </a>
              ) : null}
              <Link href={`/download/${release.platform}`} className="md-text-button">
                该平台其他版本
              </Link>
            </div>

            {!hasAsset || query.notice === "asset-missing" ? (
              <div className="mt-5">
                <Notice tone="warning">
                  该版本的安装包尚未归档到对象存储（R2），仅保留版本信息与更新日志用于追溯。
                  管理员可在后台上传安装包或填写 CDN 直链后立即开放下载。
                </Notice>
              </div>
            ) : null}
          </header>

          <section className="md-card p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Icon name="list" size={18} />
              更新日志
            </h2>
            <div className="mt-3">
              <MarkdownView content={release.releaseNotes} />
            </div>
          </section>


        </div>

        <aside className="flex flex-col gap-5">
          <div className="md-card p-6">
            <h2 className="text-sm font-bold">安装包信息</h2>
            <dl className="mt-3 flex flex-col divide-y divide-outline-variant text-sm">
              {meta.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-on-surface-variant">{item.label}</dt>
                  <dd className="text-right font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
            {release.fileName ? (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-surface-container p-3.5">
                <span className="text-xs text-on-surface-variant">文件名</span>
                <span className="break-all font-mono text-xs">{release.fileName}</span>
                <CopyButton value={release.fileName} label="复制文件名" />
              </div>
            ) : null}
            {release.sha256 ? (
              <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-surface-container p-3.5">
                <span className="text-xs text-on-surface-variant">SHA-256 校验摘要</span>
                <span className="break-all font-mono text-[0.7rem]">{release.sha256}</span>
                <CopyButton value={release.sha256} label="复制摘要" icon="shield" />
              </div>
            ) : null}
          </div>

          <div className="md-card p-6">
            <h2 className="text-sm font-bold">该平台其他版本</h2>
            {others.length === 0 ? (
              <p className="mt-3 text-sm text-on-surface-variant">暂无其他版本记录。</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {others.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/release/${item.id}`}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-on-surface/6"
                    >
                      <Icon name="cube" size={16} className="text-on-surface-variant" />
                      <span className="font-semibold">v{item.version}</span>
                      <span className="ml-auto text-xs text-on-surface-variant">
                        {formatDate(item.publishedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/download/${release.platform}`}
              className="md-tonal-button md-small-button mt-4"
            >
              全部版本
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <SectionTitle
          eyebrow="继续浏览"
          title="查看其他平台的最新安装包"
          action={{ href: "/versions", label: "版本库" }}
        />
      </div>
    </div>
  );
}
