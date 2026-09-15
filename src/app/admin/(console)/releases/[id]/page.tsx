import Link from "next/link";
import { notFound } from "next/navigation";

import { ReleaseForm } from "@/components/admin/release-form";
import { Icon } from "@/components/icons";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getReleaseById } from "@/lib/releases";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditReleasePage({ params }: PageProps) {
  const { id } = await params;
  const release = await getReleaseById(Number.parseInt(id, 10), true);
  if (!release) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">编辑版本 v{release.version}</h1>
          <p className="text-sm text-on-surface-variant">
            累计下载 {formatNumber(release.downloads)} 次 · 最后更新 {formatDateTime(release.updatedAt)}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/release/${release.id}`} className="md-outlined-button md-small-button">
            <Icon name="eye" size={15} />
            站点预览
          </Link>
          <Link href="/admin/releases" className="md-text-button md-small-button">
            <Icon name="arrow-left" size={16} />
            返回列表
          </Link>
        </div>
      </div>

      <ReleaseForm release={release} />
    </div>
  );
}
