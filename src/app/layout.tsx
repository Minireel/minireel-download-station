import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MiniReel 下载站 · 安装包下载",
    template: "%s · MiniReel 下载站",
  },
  description:
    "MiniReel 安装包下载站：已发布平台的最新安装包与往期版本归档，资源托管于 Cloudflare R2。",
  keywords: ["MiniReel", "短剧播放器", "APK 下载", "Windows 安装包", "TV 版下载"],
  openGraph: {
    title: "MiniReel 下载站 · 安装包下载",
    description: "获取 MiniReel 已发布平台的最新安装包与往期版本。",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const themeScript = `(function(){try{var s=localStorage.getItem('minireel-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
