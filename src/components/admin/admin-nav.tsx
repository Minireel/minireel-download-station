"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "仪表盘", icon: "dashboard" },
  { href: "/admin/releases", label: "版本发布", icon: "cube" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-on-surface/8"
            }`}
          >
            <Icon name={link.icon} size={18} />
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-on-surface/8 lg:mt-4"
      >
        <Icon name="globe" size={18} />
        查看下载站
      </Link>
    </nav>
  );
}
