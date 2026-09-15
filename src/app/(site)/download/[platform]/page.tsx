import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon, PLATFORM_ICONS, type IconName } from "@/components/icons";
import { ReleaseList } from "@/components/release-list";
import { Notice, SectionTitle } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { PLATFORMS, isPlatformId, platformDef } from "@/lib/platforms";
import { getLatestForPlatform, getPlatformHistory } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ platform: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platform } = await params;
  const def = platformDef(platform);
  if (!def) return { title: "平台不存在" };
  return {
    title: `${def.name} 下载`,
    description: `${def.name}（${def.tagline}）安装包下载：${def.description}`,
  };
}

export default async function PlatformPage({ params }: PageProps) {
  const { platform } = await params;
  if (!isPlatformId(platform)) notFound();

  const def = platformDef(platform);
  if (!def) notFound();

  const [latest, history] = await Promise.all([
    getLatestForPlatform(platform),
    getPlatformHistory(platform, 50),
  ]);
  const iconName = PLATFORM_ICONS[def.icon] as IconName;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/" className="hover:text-primary">
          下载首页
        </Link>
        <Icon name="arrow-right" size={14} />
        <span className="font-semibold text-on-surface">{def.name}</span>
      </nav>

      <header className="grid gap-8 md:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-container text-on-primary-container">
              <Icon name={iconName} size={28} />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{def.name} 下载</h1>
              <p className="text-sm text-on-surface-variant">{def.tagline}</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-on-surface-variant">
            {def.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="md-chip md-chip-filled">{def.defaultMinOs}</span>
            <span className="md-chip">{def.fileExt.toUpperCase()} 安装包</span>
            {def.archOptions.map((arch) => (
              <span key={arch} className="md-chip">
                {arch}
              </span>
            ))}
          </div>
        </div>

        <div className="md-card-elevated flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <span className="md-chip md-chip-primary">最新版本</span>
            {latest?.isPrerelease ? <span className="md-chip md-chip-warning">Beta</span> : null}
            {latest ? (
              <span className="ml-auto text-xs text-on-surface-variant">
                {formatNumber(latest.downloads)} 次下载
              </span>
            ) : null}
          </div>

          {latest ? (
            <>
              <div>
                <p className="text-3xl font-black">v{latest.version}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {latest.title || `${def.name} 安装包`}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-surface-container px-3.5 py-2.5">
                  <dt className="text-on-surface-variant">文件大小</dt>
                  <dd className="mt-0.5 font-semibold">{formatBytes(latest.fileSize)}</dd>
                </div>
                <div className="rounded-2xl bg-surface-container px-3.5 py-2.5">
                  <dt className="text-on-surface-variant">发布日期</dt>
                  <dd className="mt-0.5 font-semibold">{formatDate(latest.publishedAt)}</dd>
                </div>
                <div className="rounded-2xl bg-surface-container px-3.5 py-2.5">
                  <dt className="text-on-surface-variant">架构</dt>
                  <dd className="mt-0.5 font-semibold">{latest.arch || "—"}</dd>
                </div>
                <div className="rounded-2xl bg-surface-container px-3.5 py-2.5">
                  <dt className="text-on-surface-variant">系统要求</dt>
                  <dd className="mt-0.5 font-semibold">{latest.minOs || def.defaultMinOs}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/download/${latest.id}`} className="md-filled-button">
                  <Icon name="download" size={18} />
                  下载 {def.fileExt.toUpperCase()}
                </a>
                {platform === "ios" ? (
                  <a
                    href={`/install/${latest.id}/manifest.plist`}
                    className="md-outlined-button"
                    title="通过 OTA 方式在 iPhone / iPad 上安装"
                  >
                    <Icon name="link" size={16} />
                    OTA 安装
                  </a>
                ) : null}
                <Link href={`/release/${latest.id}`} className="md-text-button">
                  发布详情
                </Link>
              </div>

              {latest.sha256 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                  <span className="truncate font-mono">SHA-256 {latest.sha256.slice(0, 24)}…</span>
                  <CopyButton value={latest.sha256} label="校验摘要" icon="shield" />
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-on-surface-variant">
                该平台暂时还没有发布记录，管理员可以在后台「发布版本」中上传安装包后立即上线。
              </p>
              <Link href="/admin/login" className="md-tonal-button md-small-button">
                <Icon name="upload" size={16} />
                前往后台发布
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="pt-14">
        <SectionTitle eyebrow="安装指引" title={`在 ${def.name} 上安装`} />
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <ol className="flex flex-col gap-3">
            {def.installSteps.map((step, index) => (
              <li key={step} className="md-card flex gap-4 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3">
            {def.tips.map((tip) => (
              <Notice key={tip} tone="info">
                {tip}
              </Notice>
            ))}

          </div>
        </div>
      </section>

      <section className="pt-14">
        <SectionTitle
          eyebrow="版本历史"
          title={`${def.name} 往期版本`}
          description="保留每次发布的版本号、架构、大小与更新日志，方便回退到稳定版本。"
          action={{ href: `/versions?platform=${platform}`, label: "在版本库中筛选" }}
        />
        <ReleaseList items={history} emptyText="该平台暂无版本记录" />
      </section>

      <section className="pt-14">
        <SectionTitle eyebrow="切换平台" title="其他端下载" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.filter((item) => item.id !== platform).map((item) => (
            <Link
              key={item.id}
              href={`/download/${item.slug}`}
              className="md-card md-card-hover flex items-center gap-3 p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                <Icon name={PLATFORM_ICONS[item.icon] as IconName} size={19} />
              </span>
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-xs text-on-surface-variant">{item.tagline}</p>
              </div>
              <Icon name="arrow-right" size={16} className="ml-auto text-on-surface-variant" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
