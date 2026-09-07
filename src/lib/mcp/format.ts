import type { Dhsjr } from "@/lib/field-mapping";
import { ALL_MANIFEST } from "../../../contents/manifest";

/** Absolute site origin used to build shareable links. Falls back to site-relative paths. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export const MAX_PER_PAGE = 50;
export const DEFAULT_PER_PAGE = 20;

export function siteLink(path: string) {
  return `${SITE_URL}${path}`;
}

export function characterUrl(characterId: string) {
  return siteLink(`/character/${encodeURIComponent(characterId)}`);
}

export function wordUrl(bookId: string, wordIndexInBook: string) {
  return siteLink(
    `/word/${encodeURIComponent(`${bookId}_${wordIndexInBook}`)}`,
  );
}

export function bookUrl(bookId: string) {
  return siteLink(`/book/${encodeURIComponent(bookId)}`);
}

export function manifestOf(bookId: string | null | undefined) {
  if (!bookId) return undefined;
  return ALL_MANIFEST.find((m) => m.book_id === bookId)?.manifest;
}

/** Drop null/empty fields and attach links, so tool payloads stay small. */
export function compactRecord(record: Dhsjr) {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined && value !== "") {
      compacted[key] = value;
    }
  }
  compacted.url = characterUrl(record.character_id);
  if (record.book_id && record.word_index_in_book) {
    compacted.word_url = wordUrl(record.book_id, record.word_index_in_book);
  }
  if (record.book_id) {
    compacted.book_url = bookUrl(record.book_id);
  }
  return compacted;
}

/** One-line human readable summary of a record, for the text content block. */
export function recordLine(record: Dhsjr, index?: number) {
  const parts: string[] = [];
  if (record.character) parts.push(record.character);
  if (
    record.character_original &&
    record.character_original !== record.character
  ) {
    parts.push(`出現形:${record.character_original}`);
  }
  if (record.kana) parts.push(`仮名注:${record.kana}`);
  if (record.shoten) parts.push(`声点:${record.shoten}`);
  if (record.fanqie) parts.push(`反切:${record.fanqie}`);
  if (record.ruion) parts.push(`類音:${record.ruion}`);
  if (record.word) {
    parts.push(
      `漢語:${record.word}${record.pos_in_word ? `(${record.pos_in_word})` : ""}`,
    );
  }
  if (record.word_kana) parts.push(`仮名型:${record.word_kana}`);
  if (record.book_name || record.book_id) {
    parts.push(`資料:${record.book_name ?? "?"}(${record.book_id ?? "?"})`);
  }
  parts.push(characterUrl(record.character_id));
  return `${index === undefined ? "" : `${index}. `}${parts.join(" | ")}`;
}

type TextResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/** Summary line(s) first, machine readable JSON second. */
export function textResult(summary: string, payload?: unknown): TextResult {
  const content: { type: "text"; text: string }[] = [
    { type: "text", text: summary },
  ];
  if (payload !== undefined) {
    content.push({ type: "text", text: JSON.stringify(payload, null, 0) });
  }
  return { content };
}

export function errorResult(message: string): TextResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function recordsResult(
  records: Dhsjr[],
  meta: { count: number; page: number; perPage: number; query: string },
) {
  const totalPages =
    meta.perPage > 0 ? Math.ceil(meta.count / meta.perPage) : 1;
  const header = `${meta.query} — ${meta.count}件ヒット / ページ ${meta.page}/${Math.max(totalPages, 1)}（${records.length}件表示）`;
  const lines = records.map((record, i) =>
    recordLine(record, (meta.page - 1) * meta.perPage + i + 1),
  );
  return textResult([header, ...lines].join("\n"), {
    count: meta.count,
    page: meta.page,
    per_page: meta.perPage,
    total_pages: totalPages,
    records: records.map(compactRecord),
  });
}
