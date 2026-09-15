import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/icons";
import { ReleaseList } from "@/components/release-list";
import { Notice, SectionTitle } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { PLATFORMS, platformDef } from "@/lib/platforms";
import { listReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "往期版本",
  description: "MiniReel 全平台历史版本归档，按平台与关键词筛选查看更新日志并下载。",
};

const PAGE_SIZE = 8;

type PageProps = {
  searchParams: Promise<{ platform?: string; q?: string; page?: string; notice?: string }>;
};

export default async function VersionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const platform = params.platform && platformDef(params.platform) ? params.platform : "all";
  const search = params.q?.trim() ?? "";
  const page = Math.max(Number.parseInt(params.page ?? "1", 10) || 1, 1);
  const notice = params.notice ?? "";

  const { items, total } = await listReleases({
    platform,
    search,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function buildHref(next: { platform?: string; q?: string; page?: number }) {
    const query = new URLSearchParams();
    const nextPlatform = next.platform ?? platform;
    const nextSearch = next.q ?? search;
    const nextPage = next.page ?? page;
    if (nextPlatform && nextPlatform !== "all") query.set("platform", nextPlatform);
    if (nextSearch) query.set("q", nextSearch);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/versions?${qs}` : "/versions";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionTitle
        eyebrow="版本库"
        title="往期版本"
        description={`共收录 ${formatNumber(total)} 条发布记录。按平台筛选或搜索版本号，找到需要回退的安装包。`}
      />

      <form action="/versions" method="get" className="md-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface-container px-3.5">
          <Icon name="search" size={18} className="text-on-surface-variant" />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="搜索版本号 / 说明，例如 2.3.1"
            className="h-11 w-full border-0 bg-transparent text-sm outline-none"
          />
        </div>
        {platform !== "all" ? <input type="hidden" name="platform" value={platform} /> : null}
        <button type="submit" className="md-filled-button md-small-button" style={{ height: "2.75rem" }}>
          <Icon name="search" size={16} />
          搜索
        </button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        {[{ id: "all", name: "全部平台" }, ...PLATFORMS].map((item) => {
          const active = platform === item.id;
          return (
            <Link
              key={item.id}
              href={buildHref({ platform: item.id, page: 1 })}
              className={`md-chip ${active ? "md-chip-primary" : ""}`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      {notice === "archived" ? (
        <div className="mt-5">
          <Notice tone="warning">
            该版本的安装包尚未归档到对象存储，暂时无法下载。可以尝试该平台的其他历史版本。
          </Notice>
        </div>
      ) : null}

      {search ? (
        <div className="mt-5">
          <Notice tone="info">
            正在显示包含「{search}」的版本记录。清空
            <Link href={buildHref({ q: "", page: 1 })} className="mx-1 underline">
              搜索条件
            </Link>
            可查看全部。
          </Notice>
        </div>
      ) : null}

      <div className="mt-6">
        <ReleaseList items={items} showPlatform emptyText="没有符合条件的版本记录" />
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={buildHref({ page: page - 1 })} className="md-outlined-button md-small-button">
              <Icon name="arrow-left" size={16} />
              上一页
            </Link>
          ) : null}
          <span className="md-chip md-chip-filled">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages ? (
            <Link href={buildHref({ page: page + 1 })} className="md-outlined-button md-small-button">
              下一页
              <Icon name="arrow-right" size={16} />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
