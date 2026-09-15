import Link from "next/link";

import { deleteReleaseAction, toggleReleaseVisibilityAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Icon } from "@/components/icons";
import { Notice } from "@/components/ui";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { PLATFORMS, platformDef } from "@/lib/platforms";
import { listReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ platform?: string; saved?: string; deleted?: string; updated?: string; q?: string }>;
};

export default async function AdminReleasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const platform = params.platform && platformDef(params.platform) ? params.platform : "all";
  const search = params.q?.trim() ?? "";

  const { items, total } = await listReleases({
    platform,
    search,
    includeHidden: true,
    limit: 100,
  });

  function href(next: { platform?: string }) {
    const value = next.platform ?? platform;
    return value === "all" ? "/admin/releases" : `/admin/releases?platform=${value}`;
  }

  return (
    <div className="flex flex-col gap-5">
      {params.saved ? <Notice tone="success">版本已保存（{params.saved === "new" ? "新发布" : `#${params.saved}`}）。</Notice> : null}
      {params.deleted ? <Notice tone="success">版本已删除。</Notice> : null}
      {params.updated ? <Notice tone="success">可见性已更新。</Notice> : null}

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">版本发布</h1>
          <p className="text-sm text-on-surface-variant">共 {formatNumber(total)} 条记录（含隐藏版本）</p>
        </div>
        <Link href={`/admin/releases/new${platform !== "all" ? `?platform=${platform}` : ""}`} className="md-filled-button md-small-button ml-auto">
          <Icon name="plus" size={16} />
          发布新版本
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ id: "all", name: "全部" }, ...PLATFORMS].map((item) => (
          <Link
            key={item.id}
            href={href({ platform: item.id })}
            className={`md-chip ${platform === item.id ? "md-chip-primary" : ""}`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <form action="/admin/releases" method="get" className="md-card flex items-center gap-2 p-3">
        <Icon name="search" size={18} className="mx-1.5 text-on-surface-variant" />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="搜索版本号或标题"
          className="h-10 w-full border-0 bg-transparent text-sm outline-none"
        />
        {platform !== "all" ? <input type="hidden" name="platform" value={platform} /> : null}
        <button type="submit" className="md-tonal-button md-small-button">
          搜索
        </button>
      </form>

      {items.length === 0 ? (
        <div className="md-card p-8 text-center text-sm text-on-surface-variant">
          没有符合条件的版本记录。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((release) => (
            <article key={release.id} className="md-card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">v{release.version}</span>
                <span className="md-chip md-chip-filled">
                  {platformDef(release.platform)?.name ?? release.platform}
                </span>
                {release.isPrerelease ? <span className="md-chip md-chip-warning">Beta</span> : null}
                {release.isVisible ? (
                  <span className="md-chip md-chip-success">已公开</span>
                ) : (
                  <span className="md-chip">已隐藏</span>
                )}
                {release.arch ? <span className="md-chip">{release.arch}</span> : null}
                <span className="ml-auto text-xs text-on-surface-variant">#{release.id}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                <span>{release.title || "未填写标题"}</span>
                <span>{formatDate(release.publishedAt)}</span>
                <span>{formatBytes(release.fileSize)}</span>
                <span>{formatNumber(release.downloads)} 次下载</span>
                <span>
                  {release.downloadUrl
                    ? "CDN 直链"
                    : release.storageKey
                      ? "对象存储"
                      : "未上传安装包"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/releases/${release.id}`} className="md-tonal-button md-small-button">
                  <Icon name="edit" size={15} />
                  编辑
                </Link>
                <Link href={`/release/${release.id}`} className="md-text-button md-small-button">
                  <Icon name="eye" size={15} />
                  预览
                </Link>
                <form action={toggleReleaseVisibilityAction} className="inline">
                  <input type="hidden" name="id" value={release.id} />
                  <button type="submit" className="md-text-button md-small-button">
                    <Icon name={release.isVisible ? "eye-off" : "eye"} size={15} />
                    {release.isVisible ? "隐藏" : "公开"}
                  </button>
                </form>
                <form action={deleteReleaseAction} className="ml-auto inline">
                  <input type="hidden" name="id" value={release.id} />
                  <ConfirmButton message="确认删除该版本记录及安装包对象？此操作不可恢复。" label="删除" />
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
