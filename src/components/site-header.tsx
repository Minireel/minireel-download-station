import Link from "next/link";

import { Icon, Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "下载首页" },
  { href: "/versions", label: "往期版本" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/70 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="text-[1.05rem] font-bold tracking-tight">MiniReel 下载站</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-on-surface/8 hover:text-on-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/admin/login"
            className="md-icon-button hidden sm:inline-flex"
            title="管理后台（发布安装包）"
            aria-label="管理后台"
          >
            <Icon name="lock" size={19} />
          </Link>
          <ThemeToggle />
          <Link
            href="/versions"
            className="md-filled-button md-small-button hidden sm:inline-flex"
            style={{ height: "2.25rem" }}
          >
            <Icon name="download" size={17} />
            获取最新版
          </Link>
          <details className="group relative md:hidden">
            <summary className="md-icon-button list-none">
              <Icon name="menu" size={20} />
            </summary>
            <div className="absolute right-0 mt-2 w-52 rounded-3xl border border-outline-variant bg-surface-high p-2 shadow-lg">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-2xl px-4 py-2.5 text-sm font-medium hover:bg-on-surface/8"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/admin/login"
                className="block rounded-2xl px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-on-surface/8"
              >
                管理后台
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
