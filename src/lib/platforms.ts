export const PLATFORM_IDS = ["android", "tv", "windows", "macos", "ios"] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export type PlatformDef = {
  id: PlatformId;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: "phone" | "tv" | "windows" | "apple" | "laptop";
  fileExt: string;
  archOptions: string[];
  defaultMinOs: string;
  installSteps: string[];
  tips: string[];
};

export const PLATFORMS: PlatformDef[] = [
  {
    id: "android",
    name: "安卓手机",
    slug: "android",
    tagline: "手机 / 平板",
    description: "竖屏沉浸刷剧，手势调亮度、音量与进度，翻页即换集。",
    icon: "phone",
    fileExt: "apk",
    archOptions: ["arm64-v8a", "armeabi-v7a", "universal"],
    defaultMinOs: "Android 7.0 及以上",
    installSteps: [
      "下载 APK 安装包，注意选择与机型匹配的 CPU 架构（近年机型通常是 arm64-v8a）。",
      "在系统设置中允许「安装未知来源应用」，再打开安装包完成安装。",
      "首次启动会请求网络与存储权限，用于加载片库与本地缓存。",
    ],
    tips: [
      "收藏、观看进度和设置只保存在本机，无需注册账号。",
      "下载前请确认安装包架构与设备匹配。",
    ],
  },
  {
    id: "tv",
    name: "TV / 安卓盒子",
    slug: "tv",
    tagline: "Android TV · 机顶盒",
    description: "大屏遥控器操作，焦点高亮清晰，客厅里也能顺畅连播。",
    icon: "tv",
    fileExt: "apk",
    archOptions: ["arm64-v8a", "armeabi-v7a", "universal"],
    defaultMinOs: "Android TV 9.0 及以上",
    installSteps: [
      "在盒子上开启「允许安装未知来源应用」，或用 U 盘把 APK 拷到设备上。",
      "使用系统自带的文件管理器打开 APK 完成安装。",
      "若通过电脑 ADB 安装：connect 后执行 install 命令即可推送安装包。",
    ],
    tips: ["遥控器方向键切换剧集，确认键呼出播放菜单。", "建议使用有线网络以获得更稳定的缓冲速度。"],
  },
  {
    id: "windows",
    name: "Windows",
    slug: "windows",
    tagline: "Windows 10 / 11 · x64",
    description: "窄图标侧栏 + 键盘快捷键，迷你置顶窗口陪你办公追剧。",
    icon: "windows",
    fileExt: "exe",
    archOptions: ["x64", "arm64"],
    defaultMinOs: "Windows 10 21H2 及以上",
    installSteps: [
      "下载 setup 安装程序并双击运行。",
      "若出现 SmartScreen 提示，选择「更多信息」→「仍要运行」。",
      "安装完成后从开始菜单启动 MiniReel。",
    ],
    tips: [
      "空格播放/暂停，F 或回车进入全屏，↑↓ 调节音量，E 打开选集。",
      "播放菜单里可以开启「迷你置顶」，把窗口固定在屏幕角落。",
    ],
  },
  {
    id: "macos",
    name: "macOS",
    slug: "macos",
    tagline: "Apple Silicon / Intel",
    description: "为 Retina 屏幕优化的窗口布局，支持全屏与画中画式置顶。",
    icon: "laptop",
    fileExt: "dmg",
    archOptions: ["universal", "arm64", "x64"],
    defaultMinOs: "macOS 12 Monterey 及以上",
    installSteps: [
      "下载 DMG 镜像并打开，将 MiniReel 拖入「应用程序」文件夹。",
      "首次启动如被拦截，请在「系统设置 → 隐私与安全性」中点击「仍要打开」。",
      "建议开启自动更新以获取最新版本。",
    ],
    tips: ["外接显示器下支持独立窗口比例调整。", "快捷键与 Windows 版本保持一致，迁移无学习成本。"],
  },
  {
    id: "ios",
    name: "iPhone / iPad",
    slug: "ios",
    tagline: "iOS 15 及以上",
    description: "竖屏手势翻集，支持 iOS 画中画与锁屏后继续播放控制。",
    icon: "apple",
    fileExt: "ipa",
    archOptions: ["universal"],
    defaultMinOs: "iOS 15.0 及以上",
    installSteps: [
      "点击下载获取 IPA 安装包。",
      "使用 AltStore / TrollStore / 自签名工具在设备上安装（企业签名版本可直接 OTA 安装）。",
      "若使用 OTA 方式，请用 Safari 打开安装页并点击「安装」以信任描述文件。",
    ],
    tips: ["iOS 端仍在测试阶段，遇到问题欢迎在反馈中描述机型和系统版本。", "推荐使用 Safari 打开下载链接。"],
  },
];

export const PLATFORM_MAP: Record<string, PlatformDef> = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.id, platform]),
);

export const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.id, platform.name]),
);

export function isPlatformId(value: string | undefined | null): value is PlatformId {
  return !!value && (PLATFORM_IDS as readonly string[]).includes(value);
}

export function platformDef(platform: string): PlatformDef | undefined {
  return PLATFORM_MAP[platform];
}

export const RELEASE_CHANNELS = ["stable", "beta", "rc"] as const;
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

export function channelLabel(channel: string): string {
  switch (channel) {
    case "beta":
      return "Beta 预发布";
    case "rc":
      return "RC 候选版";
    default:
      return "正式版";
  }
}
