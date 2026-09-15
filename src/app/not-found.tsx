import Link from "next/link";

import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-container text-on-primary-container">
        <Icon name="warning" size={30} />
      </span>
      <h1 className="text-3xl font-black tracking-tight">页面不存在</h1>
      <p className="max-w-md text-sm leading-relaxed text-on-surface-variant">
        你访问的版本或文档可能已经被删除、隐藏，或者地址输入有误。
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className="md-filled-button">
          <Icon name="download" size={17} />
          返回下载首页
        </Link>
        <Link href="/versions" className="md-outlined-button">
          <Icon name="archive" size={17} />
          往期版本
        </Link>
      </div>
    </div>
  );
}
