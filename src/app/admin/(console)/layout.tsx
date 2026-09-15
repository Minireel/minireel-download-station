import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Icon, Logo } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo size={32} />
          <div>
            <p className="text-sm font-bold leading-tight">MiniReel 发布控制台</p>
            <p className="text-xs text-on-surface-variant">管理安装包与版本发布</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="md-text-button md-small-button hidden sm:inline-flex">
              <Icon name="globe" size={16} />
              下载站
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="md-outlined-button md-small-button">
                <Icon name="logout" size={16} />
                退出登录
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="md-card p-3 lg:sticky lg:top-24">
            <AdminNav />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
