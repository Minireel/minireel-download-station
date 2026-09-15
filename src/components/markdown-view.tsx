import { renderMarkdown } from "@/lib/markdown";

export function MarkdownView({
  content,
  className = "",
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const html = renderMarkdown(content);
  if (!html) {
    return <p className="text-sm text-on-surface-variant">暂无内容。</p>;
  }
  return (
    <div
      className={`md-prose ${className}`}
      // Content is authored exclusively in the password-protected admin console.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
