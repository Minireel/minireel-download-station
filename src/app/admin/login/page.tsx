import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { Icon, Logo } from "@/components/icons";
import { adminConfigStatus, isAdminAuthenticated } from "@/lib/auth";
import { storageInfo } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理后台登录",
  robots: { index: false },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const storage = storageInfo();
  const config = adminConfigStatus();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo size={40} />
          <div>
            <p className="text-lg font-bold">MiniReel 下载站</p>
            <p className="text-xs text-on-surface-variant">发布控制台</p>
          </div>
        </div>

        <div className="md-card-elevated p-7">
          <h1 className="text-xl font-bold">管理员登录</h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            登录后可上传安装包、填写更新日志并发布版本。
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="md-divider my-6" />

          <div className="flex flex-col gap-2 text-xs text-on-surface-variant">
            <p className="flex items-center gap-2">
              <Icon name="cloud" size={15} />
              资源存储：{storage.label} · {storage.detail}
            </p>
            {!config.ready ? (
              <p className="flex items-start gap-2 rounded-2xl bg-warning-container px-3.5 py-2.5 text-on-warning-container">
                <Icon name="warning" size={15} />
                <span>
                  后台尚未配置，无法登录。请在部署环境补上
                  {!config.passwordConfigured ? (
                    <>
                      {" "}
                      <span className="font-mono">ADMIN_PASSWORD</span>
                    </>
                  ) : null}
                  {!config.secretConfigured ? (
                    <>
                      {" "}
                      <span className="font-mono">ADMIN_SESSION_SECRET</span>
                    </>
                  ) : null}
                  ，然后重新部署。
                </span>
              </p>
            ) : config.passwordConfigured && config.secretConfigured ? (
              <p className="flex items-center gap-2">
                <Icon name="lock" size={15} />
                后台口令与会话密钥已通过环境变量配置。
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-2xl bg-surface-container px-3.5 py-2.5">
                <Icon name="info" size={15} />
                <span>
                  开发模式：正在使用内置口令{" "}
                  <span className="font-mono font-bold">minireel-admin</span>。生产环境不会回退，
                  必须先设置 <span className="font-mono">ADMIN_PASSWORD</span> 与{" "}
                  <span className="font-mono">ADMIN_SESSION_SECRET</span>。
                </span>
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-primary">
            <Icon name="arrow-left" size={15} />
            返回下载首页
          </Link>
        </p>
      </div>
    </div>
  );
}
