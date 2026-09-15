import Link from "next/link";

import { Icon } from "@/components/icons";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "md-chip-success"
      : tone === "warning"
        ? "md-chip-warning"
        : tone === "error"
          ? "md-chip-primary"
          : "md-chip-filled";

  return (
    <div
      className={`flex items-start gap-3 rounded-3xl px-4 py-3.5 text-sm md-chip ${toneClass}`}
      style={{ height: "auto", whiteSpace: "normal", borderRadius: "1.25rem" }}
    >
      <Icon name={tone === "success" ? "check-circle" : tone === "info" ? "info" : "warning"} size={18} />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link href={action.href} className="md-outlined-button md-small-button">
          {action.label}
          <Icon name="arrow-right" size={16} />
        </Link>
      ) : null}
    </div>
  );
}
