"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { saveReleaseAction, type FormState } from "@/app/admin/actions";
import { Icon } from "@/components/icons";
import type { Release } from "@/db/schema";
import { formatBytes } from "@/lib/format";
import { PLATFORMS, RELEASE_CHANNELS, channelLabel, platformDef } from "@/lib/platforms";

type UploadResult = {
  key: string;
  fileName: string;
  fileSize: number;
  fileExt: string;
  sha256: string;
  publicUrl: string | null;
};

const initialState: FormState = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-outline-variant transition-colors peer-checked:bg-primary before:absolute before:left-1 before:top-1 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform peer-checked:before:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-on-surface-variant">{hint}</span> : null}
      </span>
    </label>
  );
}

function MarkdownField({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [html, setHtml] = useState<string | null>(null);

  async function showPreview() {
    const { marked } = await import("marked");
    setHtml(String(await marked.parse(value, { async: false })));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="md-field-label mb-0!">{label}</span>
        <button
          type="button"
          onClick={() => (html === null ? void showPreview() : setHtml(null))}
          className="md-text-button md-small-button ml-auto"
        >
          <Icon name={html === null ? "eye" : "edit"} size={15} />
          {html === null ? "预览" : "继续编辑"}
        </button>
      </div>
      {hint ? <p className="mb-2 text-xs text-on-surface-variant">{hint}</p> : null}
      {html === null ? (
        <textarea
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={8}
          className="md-field font-mono text-[0.82rem] leading-relaxed"
          placeholder="支持 Markdown：# 标题、列表、表格、代码块…"
        />
      ) : (
        <div className="md-card p-4">
          <div
            className="md-prose max-h-72 overflow-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
      {html !== null ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}

export function ReleaseForm({
  release,
  defaultPlatform,
}: {
  release?: Release | null;
  defaultPlatform?: string;
}) {
  const [state, formAction, pending] = useActionState(saveReleaseAction, initialState);
  const [platform, setPlatform] = useState(release?.platform ?? defaultPlatform ?? "android");
  const [version, setVersion] = useState(release?.version ?? "");
  const [asset, setAsset] = useState<UploadResult | null>(
    release?.storageKey
      ? {
          key: release.storageKey,
          fileName: release.fileName ?? release.storageKey.split("/").pop() ?? "package",
          fileSize: release.fileSize ?? 0,
          fileExt: release.fileExt ?? "",
          sha256: release.sha256 ?? "",
          publicUrl: null,
        }
      : null,
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const def = useMemo(() => platformDef(platform), [platform]);

  function upload(file: File) {
    setUploadError(null);
    setProgress(0);

    const body = new FormData();
    body.append("file", file);
    body.append("platform", platform);
    body.append("version", version || "0.0.0");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText) as UploadResult & { ok?: boolean; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          setAsset({
            key: data.key,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileExt: data.fileExt,
            sha256: data.sha256,
            publicUrl: data.publicUrl,
          });
        } else {
          setUploadError(data.error ?? "上传失败。");
        }
      } catch {
        setUploadError("上传失败，请查看服务器日志。");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setUploadError("网络错误，上传失败。");
    };
    xhr.send(body);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {release ? <input type="hidden" name="id" value={release.id} /> : null}

      <section className="md-card p-6">
        <h2 className="text-base font-bold">基本信息</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLATFORMS.map((item) => {
            const active = platform === item.id;
            return (
              <label
                key={item.id}
                className={`md-chip cursor-pointer ${active ? "md-chip-primary" : ""}`}
              >
                <input
                  type="radio"
                  name="platform"
                  value={item.id}
                  checked={active}
                  onChange={() => setPlatform(item.id)}
                  className="sr-only"
                />
                {item.name}
              </label>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="md-field-label" htmlFor="version">
              版本号 *
            </label>
            <input
              id="version"
              name="version"
              required
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="2.4.0"
              className="md-field"
            />
          </div>
          <div>
            <label className="md-field-label" htmlFor="buildNumber">
              构建号
            </label>
            <input
              id="buildNumber"
              name="buildNumber"
              type="number"
              defaultValue={release?.buildNumber ?? ""}
              placeholder="240"
              className="md-field"
            />
          </div>
          <div>
            <label className="md-field-label" htmlFor="channel">
              发布渠道
            </label>
            <select id="channel" name="channel" defaultValue={release?.channel ?? "stable"} className="md-field">
              {RELEASE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channelLabel(channel)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="md-field-label" htmlFor="arch">
              架构
            </label>
            <input
              id="arch"
              name="arch"
              list="arch-options"
              defaultValue={release?.arch ?? def?.archOptions[0] ?? ""}
              placeholder="arm64-v8a"
              className="md-field"
            />
            <datalist id="arch-options">
              {(def?.archOptions ?? []).map((arch) => (
                <option key={arch} value={arch} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="md-field-label" htmlFor="minOs">
              最低系统版本
            </label>
            <input
              id="minOs"
              name="minOs"
              defaultValue={release?.minOs ?? def?.defaultMinOs ?? ""}
              placeholder="Android 7.0 及以上"
              className="md-field"
            />
          </div>
          <div>
            <label className="md-field-label" htmlFor="publishedAt">
              发布日期
            </label>
            <input
              id="publishedAt"
              name="publishedAt"
              type="date"
              defaultValue={
                release ? new Date(release.publishedAt).toISOString().slice(0, 10) : today()
              }
              className="md-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="md-field-label" htmlFor="title">
              版本标题
            </label>
            <input
              id="title"
              name="title"
              defaultValue={release?.title ?? ""}
              placeholder="MiniReel 2.4.0 · 安卓正式版"
              className="md-field"
            />
          </div>
          <div>
            <label className="md-field-label" htmlFor="summary">
              一句话说明
            </label>
            <input
              id="summary"
              name="summary"
              defaultValue={release?.summary ?? ""}
              placeholder="新增漫剧榜单与缓存优化"
              className="md-field"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Toggle
            name="isVisible"
            label="立即公开"
            hint="关闭后仅后台可见，用户端不显示"
            defaultChecked={release ? release.isVisible : true}
          />
          <Toggle
            name="isPrerelease"
            label="标记为预发布"
            hint="Beta / RC 版本会在下载页显示提醒标签"
            defaultChecked={release?.isPrerelease ?? false}
          />
        </div>
      </section>

      <section className="md-card p-6">
        <h2 className="text-base font-bold">安装包</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          上传安装包到对象存储（R2 或本地磁盘），或直接填写已托管的 CDN 直链。
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          className={`mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/6" : "border-outline-variant bg-surface-container"
          }`}
        >
          <Icon name="upload" size={26} className="text-on-surface-variant" />
          <div>
            <p className="text-sm font-semibold">拖拽安装包到这里，或选择文件</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              支持 apk / exe / dmg / ipa / msi / zip，单个文件最大 2GB
            </p>
          </div>
          <label className="md-tonal-button md-small-button cursor-pointer">
            <Icon name="upload" size={16} />
            选择文件
            <input
              type="file"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
            />
          </label>

          {progress !== null ? (
            <div className="w-full max-w-md">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-on-surface-variant">正在上传… {progress}%</p>
            </div>
          ) : null}

          {uploadError ? (
            <p className="text-xs font-semibold text-danger">{uploadError}</p>
          ) : null}
        </div>

        {asset ? (
          <div className="mt-4 flex flex-col gap-2 rounded-3xl bg-surface-container p-4">
            <div className="flex items-start gap-3">
              <Icon name="cube" size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{asset.fileName}</p>
                <p className="text-xs text-on-surface-variant">
                  {formatBytes(asset.fileSize)} ·{" "}
                  {(asset.fileExt || asset.fileName.split(".").pop() || "").toUpperCase()}
                </p>
                <p className="mt-1 break-all font-mono text-[0.7rem] text-on-surface-variant">
                  {asset.key}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAsset(null)}
                className="md-text-button md-small-button text-danger"
              >
                <Icon name="close" size={15} />
                移除
              </button>
            </div>
            <input type="hidden" name="storageKey" value={asset.key} />
            <input type="hidden" name="fileName" value={asset.fileName} />
            <input type="hidden" name="fileSize" value={asset.fileSize} />
            <input type="hidden" name="fileExt" value={asset.fileExt} />
          </div>
        ) : (
          <p className="mt-4 text-xs text-on-surface-variant">
            当前没有关联安装包对象，保存后该版本仅展示更新日志。
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="md-field-label" htmlFor="downloadUrl">
              CDN / R2 直链（可选，填写后优先跳转）
            </label>
            <input
              id="downloadUrl"
              name="downloadUrl"
              defaultValue={release?.downloadUrl ?? ""}
              placeholder="https://dl.example.com/releases/android/2.4.0/minireel.apk"
              className="md-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="md-field-label" htmlFor="sha256">
              SHA-256 校验摘要
            </label>
            <input
              id="sha256"
              name="sha256"
              defaultValue={asset?.sha256 || release?.sha256 || ""}
              placeholder="上传后自动计算，也可以手动填写"
              className="md-field font-mono text-xs"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-on-surface-variant">
          存储路径规则：{" "}
          <span className="font-mono">
            releases/{platform}/{version || "版本号"}/
            {asset?.fileName || "安装包文件名"}
          </span>
        </p>
      </section>

      <section className="md-card flex flex-col gap-5 p-6">
        <h2 className="text-base font-bold">发布内容</h2>
        <MarkdownField
          name="releaseNotes"
          label="更新日志"
          hint="建议按「新增 / 优化 / 修复」分组，会显示在下载站与版本详情页。"
          defaultValue={release?.releaseNotes}
        />

      </section>

      {state?.error ? (
        <p className="rounded-2xl bg-danger-container px-4 py-3 text-sm text-on-danger-container">
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-2 rounded-full border border-outline-variant bg-surface-high/95 px-4 py-3 backdrop-blur">
        <button type="submit" className="md-filled-button" disabled={pending}>
          <Icon name="check" size={17} />
          {pending ? "正在保存…" : release ? "保存修改" : "发布版本"}
        </button>
        <Link href="/admin/releases" className="md-text-button">
          取消
        </Link>
        <span className="ml-auto text-xs text-on-surface-variant">
          {release ? `正在编辑 #${release.id}` : "新版本记录"}
        </span>
      </div>
    </form>
  );
}
