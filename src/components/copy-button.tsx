"use client";

import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";

export function CopyButton({
  value,
  label = "复制",
  icon = "copy",
}: {
  value: string;
  label?: string;
  icon?: IconName;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className="md-tonal-button md-small-button">
      <Icon name={copied ? "check" : icon} size={16} />
      {copied ? "已复制" : label}
    </button>
  );
}
