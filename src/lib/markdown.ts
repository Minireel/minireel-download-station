import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/** Renders admin-authored markdown into HTML for the public site. */
export function renderMarkdown(input: string | null | undefined): string {
  if (!input || !input.trim()) return "";
  try {
    return marked.parse(input, { async: false });
  } catch {
    return `<p>${input.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
  }
}

export function markdownExcerpt(input: string | null | undefined, length = 90): string {
  if (!input) return "";
  const plain = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\-[\]()|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}
