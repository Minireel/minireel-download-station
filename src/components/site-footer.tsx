import Link from "next/link";

import { Icon, Logo } from "@/components/icons";
import { PLATFORMS } from "@/lib/platforms";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-outline-variant bg-surface-low">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-base font-bold">MiniReel 下载站</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
            好故事，随时开场。这里提供 MiniReel 各端安装包与历史版本归档，安装包统一存放在对象存储
            （Cloudflare R2）并通过 CDN 分发。
          </p>
          <p className="mt-3 text-xs text-on-surface-variant/80">
            许可：PolyForm Noncommercial License 1.0.0 · 仅限非商业用途使用、学习与分发。
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">下载</h3>
          <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
            {PLATFORMS.map((platform) => (
              <li key={platform.id}>
                <Link href={`/download/${platform.slug}`} className="hover:text-primary">
                  {platform.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">站点</h3>
          <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
            <li>
              <Link href="/versions" className="hover:text-primary">
                往期版本
              </Link>
            </li>

            <li>
              <Link href="/api/releases" className="hover:text-primary">
                版本信息接口
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="inline-flex items-center gap-1.5 hover:text-primary">
                <Icon name="lock" size={14} />
                管理后台
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-outline-variant">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} MiniReel 下载站 · 仅用于安装包分发</span>
          <span className="flex items-center gap-1.5">
            <Icon name="cloud" size={14} />
            资源托管于 Cloudflare R2 · 站点支持 Cloudflare 部署
          </span>
        </div>
      </div>
    </footer>
  );
}
