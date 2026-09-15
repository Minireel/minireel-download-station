"use client";

import { useCallback, useSyncExternalStore } from "react";

import { Icon } from "@/components/icons";

const STORAGE_KEY = "minireel-theme";
const THEME_EVENT = "minireel-theme-change";

type Theme = "light" | "dark";

/**
 * 主题是「外部状态」（localStorage + 系统配色偏好），用 useSyncExternalStore 读取。
 *
 * 之前是在 useEffect 里同步 setTheme，会触发级联渲染（react-hooks/set-state-in-effect）。
 * 首屏的 `.dark` class 由 layout.tsx 的内联脚本在首次绘制前就打好了，
 * 这个组件只负责图标显示与切换，不承担首屏上色。
 */
function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  // storage 事件只在其他标签页触发，本页的切换靠自定义事件通知。
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

function readTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 服务端渲染与首屏水合一律按浅色，水合完成后 useSyncExternalStore 会自动校正。 */
function serverTheme(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="md-icon-button"
      aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      title="切换主题"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
    </button>
  );
}
