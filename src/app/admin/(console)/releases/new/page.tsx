import Link from "next/link";

import { ReleaseForm } from "@/components/admin/release-form";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ platform?: string }> };

export default async function NewReleasePage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">发布新版本</h1>
          <p className="text-sm text-on-surface-variant">
            上传安装包或填写直链，并补充版本信息与更新日志。
          </p>
        </div>
        <Link href="/admin/releases" className="md-text-button md-small-button ml-auto">
          <Icon name="arrow-left" size={16} />
          返回列表
        </Link>
      </div>

      <ReleaseForm defaultPlatform={params.platform} />
    </div>
  );
}
