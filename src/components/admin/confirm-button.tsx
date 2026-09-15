"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";

export function ConfirmButton({
  message,
  label,
  icon = "trash",
  tone = "danger",
}: {
  message: string;
  label: string;
  icon?: "trash" | "warning";
  tone?: "danger" | "neutral";
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
      className={`md-small-button md-text-button inline-flex items-center gap-1.5 ${
        tone === "danger" ? "text-danger" : ""
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
