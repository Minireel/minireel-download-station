import type { ReactNode } from "react";

export type IconName =
  | "download"
  | "arrow-right"
  | "arrow-left"
  | "clock"
  | "shield"
  | "search"
  | "menu"
  | "sun"
  | "moon"
  | "lock"
  | "plus"
  | "edit"
  | "trash"
  | "eye"
  | "eye-off"
  | "upload"
  | "logout"
  | "dashboard"
  | "book"
  | "chart"
  | "link"
  | "copy"
  | "check"
  | "close"
  | "cloud"
  | "globe"
  | "play"
  | "refresh"
  | "archive"
  | "check-circle"
  | "info"
  | "warning"
  | "sparkle"
  | "phone"
  | "tv"
  | "windows"
  | "laptop"
  | "apple"
  | "list"
  | "cube";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const paths: Record<IconName, ReactNode> = {
  download: (
    <g {...strokeProps}>
      <path d="M12 3v12" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 19h16" />
    </g>
  ),
  "arrow-right": (
    <g {...strokeProps}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </g>
  ),
  "arrow-left": (
    <g {...strokeProps}>
      <path d="M20 12H5" />
      <path d="m11 18-6-6 6-6" />
    </g>
  ),
  clock: (
    <g {...strokeProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </g>
  ),
  shield: (
    <g {...strokeProps}>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </g>
  ),
  search: (
    <g {...strokeProps}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </g>
  ),
  menu: (
    <g {...strokeProps}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </g>
  ),
  sun: (
    <g {...strokeProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </g>
  ),
  moon: (
    <g {...strokeProps}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </g>
  ),
  lock: (
    <g {...strokeProps}>
      <rect x="4.5" y="10" width="15" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2" />
    </g>
  ),
  plus: (
    <g {...strokeProps}>
      <path d="M12 5v14M5 12h14" />
    </g>
  ),
  edit: (
    <g {...strokeProps}>
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="m14.5 5.5 4 4" />
    </g>
  ),
  trash: (
    <g {...strokeProps}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M6.5 7l1 12.5h9L18 7" />
      <path d="M10.5 11v5M13.5 11v5" />
    </g>
  ),
  eye: (
    <g {...strokeProps}>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </g>
  ),
  "eye-off": (
    <g {...strokeProps}>
      <path d="M4 4l16 16" />
      <path d="M9.5 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3 3.9" />
      <path d="M6.2 8A15.4 15.4 0 0 0 2.5 12S6 17.5 12 17.5c1 0 1.9-.2 2.7-.4" />
    </g>
  ),
  upload: (
    <g {...strokeProps}>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 20h16" />
    </g>
  ),
  logout: (
    <g {...strokeProps}>
      <path d="M10 5H6v14h4" />
      <path d="M15 8.5 18.5 12 15 15.5" />
      <path d="M9 12h9.5" />
    </g>
  ),
  dashboard: (
    <g {...strokeProps}>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </g>
  ),
  book: (
    <g {...strokeProps}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" />
      <path d="M5 20.5V5.5" />
    </g>
  ),
  chart: (
    <g {...strokeProps}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16V11M12.5 16V7M17 16v-3" />
    </g>
  ),
  link: (
    <g {...strokeProps}>
      <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </g>
  ),
  copy: (
    <g {...strokeProps}>
      <rect x="9" y="9" width="11" height="11" rx="3" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H7a3 3 0 0 0-3 3v5.5A2.5 2.5 0 0 0 6.5 15" />
    </g>
  ),
  check: (
    <g {...strokeProps}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </g>
  ),
  close: (
    <g {...strokeProps}>
      <path d="M6 6l12 12M18 6 6 18" />
    </g>
  ),
  cloud: (
    <g {...strokeProps}>
      <path d="M7.5 18.5A4.5 4.5 0 0 1 7 9.6a5.5 5.5 0 0 1 10.2 1.7 3.6 3.6 0 0 1-.7 7.2z" />
    </g>
  ),
  globe: (
    <g {...strokeProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.6 5.5 3.6 8.5S14.5 18 12 20.5C9.5 18 8.4 15 8.4 12S9.5 6 12 3.5z" />
    </g>
  ),
  play: (
    <path d="M9 6.5v11l9-5.5z" fill="currentColor" stroke="none" />
  ),
  refresh: (
    <g {...strokeProps}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </g>
  ),
  archive: (
    <g {...strokeProps}>
      <rect x="3.5" y="4.5" width="17" height="5" rx="2" />
      <path d="M5 9.5V19h14V9.5" />
      <path d="M10 13h4" />
    </g>
  ),
  "check-circle": (
    <g {...strokeProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </g>
  ),
  info: (
    <g {...strokeProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 8h.01" />
    </g>
  ),
  warning: (
    <g {...strokeProps}>
      <path d="M12 4.5 3 19.5h18z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </g>
  ),
  sparkle: (
    <g {...strokeProps}>
      <path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z" />
      <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </g>
  ),
  phone: (
    <g {...strokeProps}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="3" />
      <path d="M10.5 5.5h3" />
      <path d="M11 18.5h2" />
    </g>
  ),
  tv: (
    <g {...strokeProps}>
      <rect x="3" y="5" width="18" height="12" rx="3" />
      <path d="M9 20h6M12 17v3" />
    </g>
  ),
  windows: (
    <g fill="currentColor" stroke="none">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </g>
  ),
  laptop: (
    <g {...strokeProps}>
      <rect x="4.5" y="5" width="15" height="10" rx="2" />
      <path d="M2.5 18.5h19" />
    </g>
  ),
  apple: (
    <g {...strokeProps}>
      <rect x="6" y="2.5" width="12" height="19" rx="3.5" />
      <path d="M10.5 5.2h3" />
      <path d="M11 18.6h2" />
    </g>
  ),
  list: (
    <g {...strokeProps}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </g>
  ),
  cube: (
    <g {...strokeProps}>
      <path d="M12 3.5l7.5 4v9L12 20.5 4.5 16.5v-9z" />
      <path d="M4.5 7.5 12 11.5l7.5-4" />
      <path d="M12 11.5v9" />
    </g>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--md-primary-container)" />
      <rect x="6" y="6" width="36" height="36" rx="11" fill="var(--md-primary)" opacity="0.16" />
      <path d="M20 16.5v15l12-7.5z" fill="var(--md-primary)" />
      <circle cx="13.5" cy="20" r="2" fill="var(--md-primary)" opacity="0.65" />
      <circle cx="13.5" cy="28" r="2" fill="var(--md-primary)" opacity="0.65" />
    </svg>
  );
}

export const PLATFORM_ICONS = {
  phone: "phone",
  tv: "tv",
  windows: "windows",
  apple: "apple",
  laptop: "laptop",
} as const;
