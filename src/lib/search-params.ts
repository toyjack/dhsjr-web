import type { Inputs } from "@/types";
import { type Dhsjr, FIELD_TO_COLUMN } from "./field-mapping";

// Pure helpers shared by the Web results page, the MCP tools and db.ts.
// Kept free of the Supabase client so they can be unit-tested without a database.

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 100;
/** Largest per-page option offered by the Web UI (PerPageSetting). */
export const MAX_PER_PAGE = 1000;
/**
 * search_dhsjr_all_fields_by_word rejects page_size > 500. Raise this to
 * MAX_PER_PAGE once supabase/migrations/20261016000000_search_all_stable_order.sql
 * has been applied.
 */
export const SEARCH_ALL_MAX_PER_PAGE = 500;

/** Coerce page / perPage from untrusted input (URL params) to positive integers within bounds. */
export function normalizePagination(
  page: unknown,
  perPage: unknown,
  maxPerPage = MAX_PER_PAGE,
) {
  return {
    page: positiveInt(page) ?? DEFAULT_PAGE,
    perPage: Math.min(positiveInt(perPage) ?? DEFAULT_PER_PAGE, maxPerPage),
  };
}

function positiveInt(value: unknown) {
  const n = Number(firstValue(value));
  return Number.isSafeInteger(n) && n >= 1 ? n : undefined;
}

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

/** Trimmed string value of a search parameter, or undefined when absent or blank. */
export function cleanText(value: unknown) {
  const v = firstValue(value);
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
}

type DetailField = keyof Inputs & keyof Dhsjr;

/**
 * Fields accepted by detailed search and how each is matched. The order is the
 * MCP search_detail schema order, which the query label follows.
 * Partial matches keep ILIKE wildcard semantics (% _ and PostgREST's *), see D2
 * in docs/DHSJR_MCP_PHASE0_REPORT.md.
 */
export const DETAIL_FILTERS: readonly (readonly [
  DetailField,
  "eq" | "ilike",
])[] = [
  ["character", "eq"],
  ["word", "ilike"],
  ["kana", "ilike"],
  ["word_kana", "ilike"],
  ["shoten", "ilike"],
  ["shoten_word", "ilike"],
  ["fanqie", "ilike"],
  ["ruion", "ilike"],
  ["book_name", "ilike"],
  ["book_id", "eq"],
  ["etc", "ilike"],
  ["notes", "ilike"],
];

export type DetailCondition = {
  field: DetailField;
  column: (typeof FIELD_TO_COLUMN)[DetailField];
  op: "eq" | "ilike";
  value: string;
};

/** The detailed-search conditions that are actually applied, with blank values dropped. */
export function detailConditions(
  params: Partial<Record<string, unknown>>,
): DetailCondition[] {
  const conditions: DetailCondition[] = [];
  for (const [field, op] of DETAIL_FILTERS) {
    const value = cleanText(params[field]);
    if (value) {
      conditions.push({ field, column: FIELD_TO_COLUMN[field], op, value });
    }
  }
  return conditions;
}

/**
 * Quote a value for a PostgREST logic tree (.or()), so that `,` `.` `:` `(` `)`
 * in user input stay part of the value instead of changing the filter.
 */
export function quoteFilterValue(value: string) {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

/**
 * Must mirror the columns searched by search_dhsjr_all_fields_by_word
 * (see supabase/functions/search_all_fields_by_word.sql), so that the ilike
 * fallback covers the same fields as the PGroonga path. Book name, shoten and
 * shoten_word are deliberately excluded: a character common in book titles, or
 * a tone mark value like 平, otherwise floods the results.
 */
export const GLOBAL_SEARCH_COLUMNS = [
  FIELD_TO_COLUMN.character,
  FIELD_TO_COLUMN.character_original,
  FIELD_TO_COLUMN.word,
  FIELD_TO_COLUMN.word_original,
  FIELD_TO_COLUMN.word_alphabet,
  FIELD_TO_COLUMN.kana,
  FIELD_TO_COLUMN.word_kana,
  FIELD_TO_COLUMN.fanqie,
  FIELD_TO_COLUMN.ruion,
  FIELD_TO_COLUMN.etc,
  FIELD_TO_COLUMN.notes,
];

/** `.or()` filter for the ilike fallback of the global search. */
export function globalSearchOrFilter(term: string) {
  const value = quoteFilterValue(`%${term}%`);
  return GLOBAL_SEARCH_COLUMNS.map((column) => `${column}.ilike.${value}`).join(
    ",",
  );
}

/** PostgREST answers an offset past the last row with 416 / PGRST103 instead of an empty page. */
export function isRangeNotSatisfiable(error: { code?: string } | null) {
  return error?.code === "PGRST103";
}
