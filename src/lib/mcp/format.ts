import type { BookSource } from "@/lib/books";
import type { Dhsjr } from "@/lib/field-mapping";
import type { DetailCondition } from "@/lib/search-params";
import type { Tables } from "@/types/supabase.type";
import { ALL_MANIFEST } from "../../../contents/manifest";
import { currentRequestOrigin } from "./request-context";
import { SCHEMA_VERSION, type Warning } from "./schemas";

export const MAX_PER_PAGE = 50;
export const DEFAULT_PER_PAGE = 20;

export type ResponseMode = "full" | "compact";

export type ErrorCode =
  | "INVALID_ARGUMENT"
  | "EMPTY_QUERY"
  | "NOT_FOUND"
  | "SEARCH_FAILED"
  | "DATABASE_UNAVAILABLE"
  | "TIMEOUT";

/**
 * Origin for shareable links (D18): NEXT_PUBLIC_SITE_URL when set, otherwise the
 * public origin of the MCP request being handled. Outside a request (unit
 * tests) links stay site-relative.
 */
function siteOrigin() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(
    /\/$/,
    "",
  );
  return configured || currentRequestOrigin() || "";
}

export function siteLink(path: string) {
  return `${siteOrigin()}${path}`;
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

/** Copy of an object without null, undefined or empty-string values. */
export function withoutEmpty<T extends Record<string, unknown>>(object: T) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined && value !== "") {
      result[key] = value;
    }
  }
  return result;
}

/** Drop null/empty fields and attach links, so tool payloads stay small. */
export function compactRecord(record: Dhsjr) {
  const compacted = withoutEmpty({ ...record });
  compacted.url = characterUrl(record.character_id);
  if (record.book_id && record.word_index_in_book) {
    compacted.word_url = wordUrl(record.book_id, record.word_index_in_book);
  }
  if (record.book_id) {
    compacted.book_url = bookUrl(record.book_id);
  }
  return compacted;
}

/** Record for structuredContent. Compact mode drops the links that can be rebuilt from the IDs. */
export function outputRecord(record: Dhsjr, mode: ResponseMode) {
  const output = compactRecord(record);
  if (mode === "compact") {
    delete output.word_url;
    delete output.book_url;
  }
  return output;
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

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

/** Text blocks for clients that only read content, plus the structured envelope. */
export function toolResult(
  texts: string[],
  structuredContent: Record<string, unknown>,
): ToolResult {
  return {
    content: texts.map((text) => ({ type: "text", text })),
    structuredContent,
  };
}

/** Error result: "[CODE] message hint". No structuredContent, so it never conflicts with outputSchema. */
export function errorResult(
  code: ErrorCode,
  message: string,
  hint?: string,
): ToolResult {
  return {
    content: [
      { type: "text", text: `[${code}] ${message}${hint ? ` ${hint}` : ""}` },
    ],
    isError: true,
  };
}

function envelope(
  kind: string,
  meta: Record<string, unknown>,
  data: Record<string, unknown>,
  warnings: Warning[] = [],
) {
  return {
    schema_version: SCHEMA_VERSION,
    kind,
    meta: { ...meta, warnings },
    data,
  };
}

function warningLines(warnings: Warning[]) {
  return warnings.map((warning) => `⚠ [${warning.code}] ${warning.message}`);
}

export function backendWarnings(backend?: string): Warning[] {
  if (backend !== "ilike_fallback") return [];
  return [
    {
      code: "FALLBACK_BACKEND",
      message:
        "全文検索エンジン（PGroonga）が使えないため、部分一致（ilike）で検索しました。異体字・仮名の正規化と一致順位の並びがないため、件数と順序は通常と異なります。",
    },
  ];
}

export function pageWarnings(
  count: number,
  page: number,
  totalPages: number,
  returned: number,
): Warning[] {
  if (count === 0 || returned > 0) return [];
  return [
    {
      code: "PAGE_OUT_OF_RANGE",
      message: `ページ ${page} にはレコードがありません。最終ページは ${totalPages} です。`,
    },
  ];
}

/** Partial-match values keep ILIKE wildcard semantics (D2); say so when the value contains one. */
export function wildcardWarnings(conditions: DetailCondition[]): Warning[] {
  return conditions
    .filter(({ op, value }) => op === "ilike" && /[%_*]/.test(value))
    .map(({ field, value }) => ({
      code: "WILDCARD_IN_VALUE",
      message: `${field} の「${value}」の % と * は任意の文字列、_ は任意の1文字として扱われます。データ中で注記のない位置を表す記号は全角の「＊」です。`,
    }));
}

/**
 * The bibliography's own notes on how 出現位置 is written for this book, quoted
 * verbatim (spec §6.2: position_in_book is never turned into a page or canvas).
 */
export function positionNote(inputNotes: string[] | null | undefined) {
  const notes = (inputNotes ?? []).filter((note) => note.includes("出現位置"));
  return notes.length > 0 ? notes : undefined;
}

/** Book-level source facts shared by `source` and `sources` (D20). */
function sourceFacts(bookId: string, book: BookSource | undefined) {
  return {
    bibliography: book ? "registered" : "missing",
    title: book?.title,
    period: book?.period,
    holding_institution: book?.holding_institution,
    // Always present, even without a bibliography entry (D19).
    book_url: bookUrl(bookId),
    iiif_manifest: manifestOf(bookId),
  };
}

/** Source of one record for get_character / get_word, with the position note. */
export function recordSource(
  record: Pick<Dhsjr, "book_id" | "book_name">,
  books: Map<string, BookSource>,
) {
  if (!record.book_id) return undefined;
  const book = books.get(record.book_id);
  return withoutEmpty({
    book_id: record.book_id,
    book_name: record.book_name,
    ...sourceFacts(record.book_id, book),
    position_note: positionNote(book?.input_notes),
  });
}

/** One short source entry per book on a search page, keyed by book_id. */
export function pageSources(records: Dhsjr[], books: Map<string, BookSource>) {
  const sources: Record<string, Record<string, unknown>> = {};
  for (const { book_id } of records) {
    if (book_id && !sources[book_id]) {
      sources[book_id] = withoutEmpty(sourceFacts(book_id, books.get(book_id)));
    }
  }
  return sources;
}

export function searchResult(
  records: Dhsjr[],
  options: {
    tool: "search_all" | "search_detail";
    query: { term: string } | { conditions: Record<string, string> };
    label: string;
    count: number;
    page: number;
    perPage: number;
    responseMode: ResponseMode;
    books: Map<string, BookSource>;
    backend?: "pgroonga" | "ilike_fallback";
    warnings?: Warning[];
  },
): ToolResult {
  const { count, page, perPage, responseMode } = options;
  const totalPages = perPage > 0 ? Math.ceil(count / perPage) : 1;
  const hasMore = page < totalPages;
  const warnings = [
    ...backendWarnings(options.backend),
    ...(options.warnings ?? []),
    ...pageWarnings(count, page, totalPages, records.length),
  ];
  const structured = envelope(
    "search_results",
    {
      tool: options.tool,
      query: options.query,
      response_mode: responseMode,
      count,
      page,
      per_page: perPage,
      total_pages: totalPages,
      returned: records.length,
      has_more: hasMore,
      ...(hasMore ? { next_page: page + 1 } : {}),
      ...(options.backend ? { backend: options.backend } : {}),
    },
    {
      records: records.map((record) => outputRecord(record, responseMode)),
      sources: pageSources(records, options.books),
    },
    warnings,
  );

  const header = `${options.label} — ${count}件ヒット / ページ ${page}/${Math.max(totalPages, 1)}（${records.length}件表示）${hasMore ? `（続きあり: page=${page + 1}）` : ""}`;
  const head = [header, ...warningLines(warnings)];
  if (responseMode === "compact") {
    return toolResult(
      [head.join("\n"), JSON.stringify(structured)],
      structured,
    );
  }

  const lines = records.map((record, i) =>
    recordLine(record, (page - 1) * perPage + i + 1),
  );
  // Legacy JSON block: unchanged for clients that parse it (D9).
  const legacy = {
    count,
    page,
    per_page: perPage,
    total_pages: totalPages,
    records: records.map(compactRecord),
  };
  return toolResult(
    [[...head, ...lines].join("\n"), JSON.stringify(legacy)],
    structured,
  );
}

export function wordResult(
  bookId: string,
  wordIndexInBook: string,
  records: Dhsjr[],
  responseMode: ResponseMode,
  books: Map<string, BookSource>,
): ToolResult {
  const head = records[0];
  const url = wordUrl(bookId, wordIndexInBook);
  const structured = envelope(
    "word",
    {
      tool: "get_word",
      query: { book_id: bookId, word_index_in_book: wordIndexInBook },
      response_mode: responseMode,
      count: records.length,
    },
    {
      // Word-level fields come from the first record, as on the Web word page.
      word: withoutEmpty({
        book_id: bookId,
        word_index_in_book: wordIndexInBook,
        word: head.word,
        word_original: head.word_original,
        word_alphabet: head.word_alphabet,
        word_type: head.word_type,
        word_kana: head.word_kana,
        shoten_word: head.shoten_word,
        book_name: head.book_name,
        word_url: url,
        book_url: bookUrl(bookId),
        iiif_manifest: manifestOf(bookId),
      }),
      records: records.map((record) => outputRecord(record, responseMode)),
      source: recordSource(head, books),
    },
  );

  const title = `${head.word ?? head.word_original ?? ""}（${records.length}字）${url}`;
  if (responseMode === "compact") {
    return toolResult([title, JSON.stringify(structured)], structured);
  }

  const legacy = {
    book_id: bookId,
    word_index_in_book: wordIndexInBook,
    word: head.word,
    word_url: url,
    records: records.map(compactRecord),
  };
  return toolResult(
    [
      [title, ...records.map((record, i) => recordLine(record, i + 1))].join(
        "\n",
      ),
      JSON.stringify(legacy),
    ],
    structured,
  );
}

export function characterResult(
  characterId: string,
  record: Dhsjr,
  books: Map<string, BookSource>,
): ToolResult {
  const structured = envelope(
    "character",
    { tool: "get_character", query: { character_id: characterId } },
    withoutEmpty({
      record: compactRecord(record),
      iiif_manifest: manifestOf(record.book_id),
      source: recordSource(record, books),
    }),
  );
  return toolResult(
    [recordLine(record), JSON.stringify(compactRecord(record))],
    structured,
  );
}

type BookRow = Tables<"dhsjr-books">;

export function bookResult(bookId: string, book: BookRow): ToolResult {
  const url = bookUrl(book.book_id);
  const manifest = manifestOf(book.book_id);
  const structured = envelope(
    "book",
    { tool: "get_book", query: { book_id: bookId } },
    {
      // Explicit fields: a column added to the table later must not break
      // clients that validate against the published schema.
      book: withoutEmpty({
        book_id: book.book_id,
        title: book.title,
        heading: book.heading,
        period: book.period,
        holding_institution: book.holding_institution,
        image_info: book.image_info,
        input_notes: book.input_notes,
        position_note: positionNote(book.input_notes),
        input_responsible: book.input_responsible,
        other: book.other,
        phonetic_info: book.phonetic_info,
        // references_parsed is left out (D21): 69 of 226 entries have shifted
        // fields (e.g. a date as publisher). references_raw is the source text.
        references_raw: book.references_raw,
        parse_status: book.parse_status,
        source_file: book.source_file,
        imported_at: book.imported_at,
        updated_at: book.updated_at,
        url,
        iiif_manifest: manifest,
      }),
    },
  );

  // raw_markdown は dhsjr://book/{book_id} リソースで返すのでここでは省く。
  const {
    raw_markdown: _rawMarkdown,
    parse_warnings: _parseWarnings,
    source_hash: _sourceHash,
    git_commit: _gitCommit,
    ...rest
  } = book;
  const summary = [
    `${book.title ?? book.book_id}（${book.book_id}）`,
    book.period ? `年代: ${book.period}` : null,
    book.holding_institution ? `所蔵: ${book.holding_institution}` : null,
    url,
  ]
    .filter(Boolean)
    .join("\n");

  return toolResult(
    [summary, JSON.stringify({ ...rest, url, iiif_manifest: manifest })],
    structured,
  );
}

export function bookListResult(
  books: { book_id: string; title: string | null }[],
): ToolResult {
  const structured = envelope(
    "book_list",
    { tool: "list_books", count: books.length },
    {
      books: books.map((book) =>
        withoutEmpty({
          book_id: book.book_id,
          title: book.title,
          url: bookUrl(book.book_id),
          iiif_manifest: manifestOf(book.book_id),
        }),
      ),
    },
  );
  const lines = books.map(
    (book) => `${book.book_id} ${book.title ?? ""} ${bookUrl(book.book_id)}`,
  );
  // D12: the JSON block is the structured envelope (the old array is no longer returned).
  return toolResult(
    [
      [`資料 ${books.length}件`, ...lines].join("\n"),
      JSON.stringify(structured),
    ],
    structured,
  );
}
