// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// A small, dependency-free Markdown -> HTML renderer scoped to what the PYRAX
// whitepapers actually use: ATX headings, paragraphs, GFM tables, ordered /
// unordered lists, fenced code blocks, blockquotes, horizontal rules, and inline
// **bold** / `code` / [links](url). It renders our OWN trusted whitepaper
// markdown (not arbitrary user input) — but still HTML-escapes text so stray
// angle brackets never break the page.
//
// Inline emphasis is deliberately limited to **bold**: single `*` / `_` italics
// are NOT parsed, because the technical paper is full of `snake_case` identifiers
// and `eth_*` RPC globs that a naive italic pass would corrupt. Bold covers the
// emphasis the documents actually use.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Inline formatting on already-escaped text: code spans first (their contents
// are not processed further), then links, then bold.
function inline(text: string): string {
  let out = text.replace(/`([^`]+)`/g, (_m, c: string) => `<code>${c}</code>`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => {
    const ext = /^https?:/i.test(u);
    return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

const isBlank = (s: string): boolean => /^\s*$/.test(s);
const isHeading = (s: string): boolean => /^#{1,6}\s/.test(s);
const isUl = (s: string): boolean => /^\s*[-*+]\s+/.test(s);
const isOl = (s: string): boolean => /^\s*\d+\.\s+/.test(s);
const isQuote = (s: string): boolean => /^\s*>\s?/.test(s);
const isHr = (s: string): boolean => /^\s*([-*_])\1{2,}\s*$/.test(s);
const isFence = (s: string): boolean => /^```/.test(s);
const isTableSep = (s: string): boolean =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);

/** Render trusted Markdown to an HTML string. */
export function renderMarkdown(md: string): string {
  const src = md.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;

  const splitRow = (r: string): string[] =>
    r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => inline(esc(c.trim())));

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (isBlank(line)) { i++; continue; }

    // Fenced code block ``` ... ```
    if (isFence(line)) {
      const lang = line.replace(/^```/, "").trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? "")) { buf.push(lines[i] ?? ""); i++; }
      i++; // closing fence
      out.push(`<pre class="wp-code"><code${lang ? ` data-lang="${lang}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = (h[1] ?? "#").length;
      const text = (h[2] ?? "").replace(/\s+#*\s*$/, "");
      out.push(`<h${level} id="${slugify(text)}">${inline(esc(text))}</h${level}>`);
      i++; continue;
    }

    // Horizontal rule
    if (isHr(line)) { out.push("<hr />"); i++; continue; }

    // GFM table (header row followed by a |---|---| separator)
    if (line.includes("|") && isTableSep(lines[i + 1] ?? "")) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").includes("|") && !isBlank(lines[i] ?? "")) {
        rows.push(splitRow(lines[i] ?? "")); i++;
      }
      out.push(
        `<div class="wp-table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }

    // Blockquote
    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i] ?? "")) { buf.push((lines[i] ?? "").replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(esc(buf.join(" ")))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i] ?? "")) { items.push(inline(esc((lines[i] ?? "").replace(/^\s*[-*+]\s+/, "")))); i++; }
      out.push(`<ul>${items.map((it) => `<li>${it}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i] ?? "")) { items.push(inline(esc((lines[i] ?? "").replace(/^\s*\d+\.\s+/, "")))); i++; }
      out.push(`<ol>${items.map((it) => `<li>${it}</li>`).join("")}</ol>`);
      continue;
    }

    // Paragraph (gather consecutive non-block lines)
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (isBlank(l) || isHeading(l) || isFence(l) || isUl(l) || isOl(l) || isQuote(l) || isHr(l)) break;
      para.push(l); i++;
    }
    if (para.length) out.push(`<p>${inline(esc(para.join(" ")))}</p>`);
  }

  return out.join("\n");
}

/** Extract level 2-3 headings for an on-page table of contents. */
export function tocFromMarkdown(md: string): { level: number; text: string; id: string }[] {
  const src = md.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n/g, "\n");
  const toc: { level: number; text: string; id: string }[] = [];
  let inFence = false;
  for (const line of src.split("\n")) {
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const text = (h[2] ?? "").replace(/\s+#*\s*$/, "");
      toc.push({ level: (h[1] ?? "##").length, text, id: slugify(text) });
    }
  }
  return toc;
}
