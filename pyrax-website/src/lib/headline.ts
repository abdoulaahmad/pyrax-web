// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Display titles (h1/h2) are set without sentence punctuation. Translations keep their own copy, so
// strip it at render time instead of per-locale: periods and commas go (decimal/thousands separators
// between digits stay), CJK commas become spaces so clauses do not run together.
export function headline(s: string): string {
  return s
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, "")
    .replace(/[，、]/g, " ")
    .replace(/[。．،۔।]/g, "")
    .replace(/ {2,}/g, " ");
}
