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

/** 每个平台的安装包槽位：文件信息 + 该平台自己的架构与最低系统要求。 */
type AssetSlot = UploadResult & { arch: string; minOs: string };

const initialState: FormState = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultMeta(platform: string): { arch: string; minOs: string } {
  const def = platformDef(platform);
  return { arch: def?.archOptions[0] ?? "", minOs: def?.defaultMinOs ?? "" };
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
  const editing = Boolean(release);
  const [state, formAction, pending] = useActionState(saveReleaseAction, initialState);

  const initialPlatform = release?.platform ?? defaultPlatform ?? "android";

  /** 编辑模式：这条记录所属的平台。新建模式：当前正在填写的平台。 */
  const [platform, setPlatform] = useState(initialPlatform);
  const [version, setVersion] = useState(release?.version ?? "");

  /** 各平台的安装包槽位。新建模式下可以同时存在多个。 */
  const [slots, setSlots] = useState<Record<string, AssetSlot>>(() => {
    if (!release?.storageKey) return {};
    const meta = defaultMeta(release.platform);
    return {
      [release.platform]: {
        key: release.storageKey,
        fileName: release.fileName ?? release.storageKey.split("/").pop() ?? "package",
        fileSize: release.fileSize ?? 0,
        fileExt: release.fileExt ?? "",
        sha256: release.sha256 ?? "",
        publicUrl: null,
        arch: release.arch ?? meta.arch,
        minOs: release.minOs ?? meta.minOs,
      },
    };
  });

  /** 每个平台的架构 / 最低系统版本（未上传也允许先填）。 */
  const [meta, setMeta] = useState<Record<string, { arch: string; minOs: string }>>(() => ({
    [initialPlatform]: {
      arch: release?.arch ?? defaultMeta(initialPlatform).arch,
      minOs: release?.minOs ?? defaultMeta(initialPlatform).minOs,
    },
  }));

  const [progress, setProgress] = useState<{ platform: string; percent: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const activeDef = useMemo(() => platformDef(platform), [platform]);
  const activeMeta = meta[platform] ?? defaultMeta(platform);
  const activeSlot = slots[platform] ?? null;
  const readyPlatforms = PLATFORMS.filter((item) => slots[item.id]);
  const readyCount = readyPlatforms.length;

  const assetsJson = useMemo(
    () =>
      JSON.stringify(
        readyPlatforms.map((item) => {
          const slot = slots[item.id]!;
          return {
            platform: item.id,
            storageKey: slot.key,
            fileName: slot.fileName,
            fileSize: slot.fileSize,
            fileExt: slot.fileExt,
            sha256: slot.sha256,
            arch: slot.arch || meta[item.id]?.arch || "",
            minOs: slot.minOs || meta[item.id]?.minOs || "",
          };
        }),
      ),
    [readyPlatforms, slots, meta],
  );

  function setPlatformMeta(next: Partial<{ arch: string; minOs: string }>) {
    setMeta((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] ?? defaultMeta(platform)), ...next },
    }));
    const slot = slots[platform];
    if (slot) {
      setSlots((prev) => ({ ...prev, [platform]: { ...slot, ...next } }));
    }
  }

  /** 切换平台。编辑模式下把已关联的安装包一起带过去，避免误清空。 */
  function choosePlatform(next: string) {
    if (editing) {
      setSlots((prev) => {
        const carried = prev[platform];
        if (!carried || prev[next]) return prev;
        const copy = { ...prev };
        delete copy[platform];
        copy[next] = { ...carried, ...defaultMeta(next) };
        return copy;
      });
      setMeta((prev) => ({
        ...prev,
        [next]: prev[next] ?? defaultMeta(next),
      }));
    }
    setPlatform(next);
  }

  function upload(file: File, targetPlatform: string) {
    setUploadError(null);
    setProgress({ platform: targetPlatform, percent: 0 });

    const body = new FormData();
    body.append("file", file);
    body.append("platform", targetPlatform);
    body.append("version", version || "0.0.0");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress({
          platform: targetPlatform,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };
    xhr.onload = () => {
      setProgress(null);
      const fallbackMeta = meta[targetPlatform] ?? defaultMeta(targetPlatform);
      try {
        const data = JSON.parse(xhr.responseText) as UploadResult & { ok?: boolean; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          setSlots((prev) => ({
            ...prev,
            [targetPlatform]: {
              key: data.key,
              fileName: data.fileName,
              fileSize: data.fileSize,
              fileExt: data.fileExt,
              sha256: data.sha256,
              publicUrl: data.publicUrl,
              arch: prev[targetPlatform]?.arch || fallbackMeta.arch,
              minOs: prev[targetPlatform]?.minOs || fallbackMeta.minOs,
            },
          }));
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

  const progressFor = (target: string) =>
    progress && progress.platform === target ? progress.percent : null;

  function dropZone(target: string) {
    const percent = progressFor(target);
    return (
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
          if (file) upload(file, target);
        }}
        className={`flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/6" : "border-outline-variant bg-surface-container"
        }`}
      >
        <Icon name="upload" size={26} className="text-on-surface-variant" />
        <div>
          <p className="text-sm font-semibold">
            {platformDef(target)?.name} 安装包 · 拖拽到这里，或选择文件
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            支持 apk / exe / msi / dmg / pkg / ipa / zip 等，单个文件最大 100MB
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
              if (file) upload(file, target);
              event.target.value = "";
            }}
          />
        </label>

        {percent !== null ? (
          <div className="w-full max-w-md">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-on-surface-variant">正在上传… {percent}%</p>
          </div>
        ) : null}

        {uploadError ? <p className="text-xs font-semibold text-danger">{uploadError}</p> : null}
      </div>
    );
  }

  function assetCard(target: string) {
    const slot = slots[target];
    if (!slot) return null;
    return (
      <div className="flex flex-col gap-2 rounded-3xl bg-surface-container p-4">
        <div className="flex items-start gap-3">
          <Icon name="cube" size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{slot.fileName}</p>
            <p className="text-xs text-on-surface-variant">
              {platformDef(target)?.name} · {formatBytes(slot.fileSize)} ·{" "}
              {(slot.fileExt || slot.fileName.split(".").pop() || "").toUpperCase()}
            </p>
            <p className="mt-1 break-all font-mono text-[0.7rem] text-on-surface-variant">
              {slot.key}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSlots((prev) => {
                const copy = { ...prev };
                delete copy[target];
                return copy;
              })
            }
            className="md-text-button md-small-button text-danger"
          >
            <Icon name="close" size={15} />
            移除
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {release ? <input type="hidden" name="id" value={release.id} /> : null}

      <section className="md-card p-6">
        <h2 className="text-base font-bold">基本信息</h2>

        {editing ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {PLATFORMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choosePlatform(item.id)}
                  className={`md-chip cursor-pointer ${platform === item.id ? "md-chip-primary" : ""}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <input type="hidden" name="platform" value={platform} />
          </>
        ) : (
          <p className="mt-1 text-xs text-on-surface-variant">
            版本号、渠道、更新日志对所有平台共用；平台与安装包在下面「安装包」一栏里逐个选择上传。
          </p>
        )}

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

          {editing ? (
            <>
              <div>
                <label className="md-field-label" htmlFor="arch">
                  架构
                </label>
                <input
                  id="arch"
                  name="arch"
                  list="arch-options"
                  value={activeMeta.arch}
                  onChange={(event) => setPlatformMeta({ arch: event.target.value })}
                  placeholder="arm64-v8a"
                  className="md-field"
                />
                <datalist id="arch-options">
                  {(activeDef?.archOptions ?? []).map((arch) => (
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
                  value={activeMeta.minOs}
                  onChange={(event) => setPlatformMeta({ minOs: event.target.value })}
                  placeholder="Android 7.0 及以上"
                  className="md-field"
                />
              </div>
            </>
          ) : null}

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
              placeholder={editing ? "MiniReel 2.4.0 · 安卓正式版" : "留空则自动写成「MiniReel 2.4.0 · 平台名」"}
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
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">安装包</h2>
          {readyCount > 0 ? (
            <span className="md-chip md-chip-primary">已就绪 {readyCount} 个平台</span>
          ) : null}
        </div>

        {editing ? (
          <>
            <p className="mt-1 text-xs text-on-surface-variant">
              上传安装包到对象存储，或直接填写已托管的 CDN 直链。
            </p>
            <div className="mt-4">{dropZone(platform)}</div>
            {activeSlot ? (
              <div className="mt-4">{assetCard(platform)}</div>
            ) : (
              <p className="mt-4 text-xs text-on-surface-variant">
                当前没有关联安装包对象，保存后该版本仅展示更新日志。
              </p>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="md-field-label" htmlFor="downloadUrl">
                  CDN 直链（可选，填写后优先跳转）
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
                  defaultValue={activeSlot?.sha256 || release?.sha256 || ""}
                  placeholder="上传后自动计算，也可以手动填写"
                  className="md-field font-mono text-xs"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              存储路径规则：{" "}
              <span className="font-mono">
                releases/{platform}/{version || "版本号"}/
                {activeSlot?.fileName || "安装包文件名"}
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-on-surface-variant">
              先选平台、再上传该平台的安装包。<strong className="font-semibold">每个平台各传一次，最后统一提交</strong>，会为每个已就绪的平台各生成一条发布记录。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {PLATFORMS.map((item) => {
                const isActive = platform === item.id;
                const ready = Boolean(slots[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choosePlatform(item.id)}
                    className={`md-chip cursor-pointer ${isActive ? "md-chip-primary" : ""}`}
                  >
                    {ready ? <Icon name="check-circle" size={14} /> : null}
                    {item.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[2rem] border border-outline-variant p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">{activeDef?.name ?? platform}</span>
                <span className="text-xs text-on-surface-variant">
                  {activeDef?.tagline}
                </span>
              </div>

              {dropZone(platform)}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="md-field-label" htmlFor={`arch-${platform}`}>
                    架构
                  </label>
                  <input
                    id={`arch-${platform}`}
                    list={`arch-options-${platform}`}
                    value={activeMeta.arch}
                    onChange={(event) => setPlatformMeta({ arch: event.target.value })}
                    placeholder={activeDef?.archOptions[0] ?? ""}
                    className="md-field"
                  />
                  <datalist id={`arch-options-${platform}`}>
                    {(activeDef?.archOptions ?? []).map((arch) => (
                      <option key={arch} value={arch} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="md-field-label" htmlFor={`minOs-${platform}`}>
                    最低系统版本
                  </label>
                  <input
                    id={`minOs-${platform}`}
                    value={activeMeta.minOs}
                    onChange={(event) => setPlatformMeta({ minOs: event.target.value })}
                    placeholder={activeDef?.defaultMinOs ?? ""}
                    className="md-field"
                  />
                </div>
              </div>

              {activeSlot ? <div className="mt-4">{assetCard(platform)}</div> : null}
            </div>

            {readyCount > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-on-surface-variant">
                  本次将发布的平台
                </p>
                {readyPlatforms.map((item) => {
                  const slot = slots[item.id]!;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl bg-surface-container px-4 py-2.5"
                    >
                      <Icon name="check-circle" size={16} className="shrink-0" />
                      <span className="w-24 shrink-0 text-sm font-semibold">{item.name}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-on-surface-variant">
                        {slot.fileName} · {formatBytes(slot.fileSize)}
                      </span>
                      <span className="hidden shrink-0 text-xs text-on-surface-variant sm:block">
                        {slot.arch || "—"} · {slot.minOs || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-xs text-on-surface-variant">
                还没有任何平台上传安装包。至少为一个平台上传后才能提交。
              </p>
            )}

            <input type="hidden" name="assetsJson" value={assetsJson} readOnly />
          </>
        )}
      </section>

      <section className="md-card flex flex-col gap-5 p-6">
        <h2 className="text-base font-bold">发布内容</h2>
        <MarkdownField
          name="releaseNotes"
          label="更新日志"
          hint="建议按「新增 / 优化 / 修复」分组，会显示在下载站与版本详情页；多平台共用同一份日志。"
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
          {pending ? "正在保存…" : release ? "保存修改" : readyCount > 1 ? `发布 ${readyCount} 个平台` : "发布版本"}
        </button>
        <Link href="/admin/releases" className="md-text-button">
          取消
        </Link>
        <span className="ml-auto text-xs text-on-surface-variant">
          {release ? `正在编辑 #${release.id}` : readyCount > 0 ? `将创建 ${readyCount} 条记录` : "新版本记录"}
        </span>
      </div>
    </form>
  );
}
