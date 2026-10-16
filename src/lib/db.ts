import type { Inputs, SearchResults } from "@/types";
import { getBookList as getStaticBookList } from "./books";
import { dbError } from "./db-error";
import { FIELD_TO_COLUMN, rowToDhsjr } from "./field-mapping";
import {
  cleanText,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  type DetailCondition,
  detailConditions,
  globalSearchOrFilter,
  isRangeNotSatisfiable,
  normalizePagination,
  SEARCH_ALL_MAX_PER_PAGE,
} from "./search-params";
import { supabase } from "./supabase";

function shouldFallbackGlobalSearch(errorMessage: string) {
  return (
    errorMessage.includes("operator does not exist: text &@~ text") ||
    errorMessage.includes("function search_dhsjr_all_fields_by_word") ||
    errorMessage.includes("function count_dhsjr_all_fields_by_word")
  );
}

function selectDhsjr(head = false) {
  return supabase.from("dhsjr").select("*", { count: "exact", head });
}

type DhsjrQuery = ReturnType<typeof selectDhsjr>;

/**
 * One page of filtered rows in a deterministic order: 資料番号, 資料内漢字番号,
 * then ID as the final unique key. Without an ORDER BY, Postgres returns rows
 * in scan order, which differs between requests, so range pagination repeated
 * some rows and skipped others.
 */
async function fetchPage(
  filter: (query: DhsjrQuery) => DhsjrQuery,
  page: number,
  perPage: number,
) {
  const { data, count, error, status } = await filter(selectDhsjr())
    .order(FIELD_TO_COLUMN.book_id, { ascending: true })
    .order(FIELD_TO_COLUMN.index_in_book, { ascending: true })
    .order(FIELD_TO_COLUMN.character_id, { ascending: true })
    .range((page - 1) * perPage, page * perPage - 1);

  if (isRangeNotSatisfiable(error)) {
    // Past the last page: return an empty page with the real total, as searchAll does.
    const {
      count: total,
      error: countError,
      status: countStatus,
    } = await filter(selectDhsjr(true));
    if (countError) {
      throw dbError("Search failed", countError, countStatus);
    }
    return { rows: [], count: total ?? 0 };
  }
  if (error) {
    throw dbError("Search failed", error, status);
  }
  return { rows: data ?? [], count: count ?? 0 };
}

function applyConditions(query: DhsjrQuery, conditions: DetailCondition[]) {
  let filtered = query;
  for (const { column, op, value } of conditions) {
    filtered =
      op === "eq"
        ? filtered.eq(column, value)
        : filtered.ilike(column, `%${value}%`);
  }
  return filtered;
}

async function searchAllFallback(term: string, page: number, perPage: number) {
  const orFilter = globalSearchOrFilter(term);
  const { rows, count } = await fetchPage(
    (query) => query.or(orFilter),
    page,
    perPage,
  );

  return {
    meta: {
      query: { term },
      count,
      page,
      perPage,
      backend: "ilike_fallback",
    },
    data: rows.map(rowToDhsjr),
  } as SearchResults;
}

export async function getBookList() {
  return getStaticBookList();
}

export async function searchAll(
  term: string,
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
) {
  const query = cleanText(term);
  if (!query) {
    throw new Error("Search failed: search term is empty");
  }
  const pagination = normalizePagination(
    page,
    perPage,
    SEARCH_ALL_MAX_PER_PAGE,
  );

  const { data, error, status } = await supabase.rpc(
    "search_dhsjr_all_fields_by_word",
    {
      search_query: query,
      page_number: pagination.page,
      page_size: pagination.perPage,
    },
  );

  const {
    data: count,
    error: countError,
    status: countStatus,
  } = await supabase.rpc("count_dhsjr_all_fields_by_word", {
    search_query: query,
  });

  const failure = error ?? countError;
  if (failure) {
    // Graceful fallback when PGroonga operator/functions are unavailable.
    // The fallback has no variant/kana normalization and no match-rank order,
    // so the result is marked with backend: "ilike_fallback".
    if (shouldFallbackGlobalSearch(failure.message)) {
      return searchAllFallback(query, pagination.page, pagination.perPage);
    }

    throw dbError("Search failed", failure, error ? status : countStatus);
  }

  // Convert rows to Dhsjr format
  const convertedData = data ? data.map(rowToDhsjr) : [];

  return {
    meta: {
      query: { term: query },
      count: count || 0,
      page: pagination.page,
      perPage: pagination.perPage,
      backend: "pgroonga",
    },
    data: convertedData,
  } as SearchResults;
}

export async function search(
  params: Partial<Inputs>,
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
) {
  // Blank values are dropped; with nothing left, refuse rather than return the whole table.
  const conditions = detailConditions(params);
  if (conditions.length === 0) {
    throw new Error("Search failed: no search condition");
  }
  const pagination = normalizePagination(page, perPage);

  const { rows, count } = await fetchPage(
    (query) => applyConditions(query, conditions),
    pagination.page,
    pagination.perPage,
  );

  return {
    meta: {
      query: params,
      count,
      page: pagination.page,
      perPage: pagination.perPage,
    },
    data: rows.map(rowToDhsjr),
  } as SearchResults;
}

export async function getWord(bookId: string, wordIndexInBook: number) {
  const word = await supabase
    .from("dhsjr")
    .select("*")
    .eq(FIELD_TO_COLUMN.book_id, bookId)
    .eq(FIELD_TO_COLUMN.word_index_in_book, wordIndexInBook)
    .limit(1)
    .single();

  return word;
}

export async function getWordRecords(bookId: string, wordIndexInBook: string) {
  const { data, error, status } = await supabase
    .from("dhsjr")
    .select("*")
    .eq(FIELD_TO_COLUMN.book_id, bookId)
    .eq(FIELD_TO_COLUMN.word_index_in_book, wordIndexInBook)
    .order(FIELD_TO_COLUMN.index_in_book, { ascending: true });

  if (error) {
    throw dbError("Failed to fetch word", error, status);
  }

  return data ? data.map(rowToDhsjr) : [];
}

/** One character record by its ID, or null when it does not exist. */
export async function getCharacterRecord(characterId: string) {
  const { data, error, status } = await supabase
    .from("dhsjr")
    .select("*")
    .eq(FIELD_TO_COLUMN.character_id, characterId)
    .maybeSingle();

  if (error) {
    throw dbError("Failed to fetch character", error, status);
  }

  return data ? rowToDhsjr(data) : null;
}

/** Number of records with this book ID (books can have records but no bibliography entry). */
export async function countBookRecords(bookId: string) {
  const { count, error, status } = await supabase
    .from("dhsjr")
    .select(FIELD_TO_COLUMN.character_id, { count: "exact", head: true })
    .eq(FIELD_TO_COLUMN.book_id, bookId);

  if (error) {
    throw dbError("Failed to count book records", error, status);
  }

  return count ?? 0;
}
