import type {  Inputs, SearchResults } from "@/types";
import { FIELD_TO_COLUMN, rowToDhsjr } from "./field-mapping";
import { getBookList as getStaticBookList } from "./books";
import { supabase } from "./supabase";

const PAGE = 1;
const PER_PAGE = 100;

const GLOBAL_SEARCH_COLUMNS = [
  FIELD_TO_COLUMN.character,
  FIELD_TO_COLUMN.word,
  FIELD_TO_COLUMN.kana,
  FIELD_TO_COLUMN.word_kana,
  FIELD_TO_COLUMN.shoten,
  FIELD_TO_COLUMN.shoten_word,
  FIELD_TO_COLUMN.book_name,
  FIELD_TO_COLUMN.word_alphabet,
  FIELD_TO_COLUMN.word_type,
  FIELD_TO_COLUMN.fanqie,
  FIELD_TO_COLUMN.ruion,
  FIELD_TO_COLUMN.etc,
  FIELD_TO_COLUMN.notes,
];

function shouldFallbackGlobalSearch(errorMessage: string) {
  return (
    errorMessage.includes("operator does not exist: text &@~ text") ||
    errorMessage.includes("function search_dhsjr_all_fields_by_word") ||
    errorMessage.includes("function count_dhsjr_all_fields_by_word")
  );
}

async function searchAllFallback(term: string, page: number, perPage: number) {
  const wildcard = `%${term}%`;
  const orFilter = GLOBAL_SEARCH_COLUMNS.map((column) => `${column}.ilike.${wildcard}`).join(",");

  const { data, count, error } = await supabase
    .from("dhsjr")
    .select("*", { count: "exact" })
    .or(orFilter)
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return {
    meta: {
      query: { term },
      count: count || 0,
      page,
      perPage,
    },
    data: data ? data.map(rowToDhsjr) : [],
  } as SearchResults;
}

export async function getBookList() {
  return getStaticBookList();
}

export async function searchAll(term: string, page = PAGE, perPage = PER_PAGE) {
  const { data, error } = await (supabase)
    .rpc("search_dhsjr_all_fields_by_word", {
      search_query: term,
      page_number: page,
      page_size: perPage
    });

  const { data: count, error: countError } = await (supabase).rpc("count_dhsjr_all_fields_by_word", { search_query: term });

  if (error || countError) {
    const errorMessage = error?.message || countError?.message || "Unknown error";

    // Graceful fallback when PGroonga operator/functions are unavailable.
    if (shouldFallbackGlobalSearch(errorMessage)) {
      return searchAllFallback(term, page, perPage);
    }

    throw new Error(`Search failed: ${errorMessage}`);
  }

  // Convert rows to Dhsjr format
  const convertedData = data ? data.map(rowToDhsjr) : [];

  return {
    meta: {
      query: { term },
      count: count || 0,
      page,
      perPage,
    },
    data: convertedData,
  } as SearchResults;
}

export async function search(params: Inputs, page = PAGE, perPage = PER_PAGE) {
  let query = supabase.from("dhsjr").select("*", { count: "exact" });

  // Apply filters using Japanese column names
  if (params.character) {
    query = query.eq(FIELD_TO_COLUMN.character, params.character);
  }
  if (params.word) {
    query = query.ilike(FIELD_TO_COLUMN.word, `%${params.word}%`);
  }
  if (params.book_name) {
    query = query.ilike(FIELD_TO_COLUMN.book_name, `%${params.book_name}%`);
  }
  if (params.shoten) {
    query = query.ilike(FIELD_TO_COLUMN.shoten, `%${params.shoten}%`);
  }
  if (params.kana) {
    query = query.ilike(FIELD_TO_COLUMN.kana, `%${params.kana}%`);
  }
  if (params.shoten_word) {
    query = query.ilike(FIELD_TO_COLUMN.shoten_word, `%${params.shoten_word}%`);
  }
  if (params.word_kana) {
    query = query.ilike(FIELD_TO_COLUMN.word_kana, `%${params.word_kana}%`);
  }
  if (params.fanqie) {
    query = query.ilike(FIELD_TO_COLUMN.fanqie, `%${params.fanqie}%`);
  }
  if (params.ruion) {
    query = query.ilike(FIELD_TO_COLUMN.ruion, `%${params.ruion}%`);
  }
  if (params.etc) {
    query = query.ilike(FIELD_TO_COLUMN.etc, `%${params.etc}%`);
  }
  if (params.notes) {
    query = query.ilike(FIELD_TO_COLUMN.notes, `%${params.notes}%`);
  }
  if (params.book_id) {
    query = query.eq(FIELD_TO_COLUMN.book_id, params.book_id);
  }

  // Apply pagination
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  // Convert rows to Dhsjr format
  const convertedData = data ? data.map(rowToDhsjr) : [];

  return {
    meta: {
      query: params,
      count: count || 0,
      page,
      perPage,
    },
    data: convertedData,
  } as SearchResults;
}

export async function getWord(bookId:string,wordIndexInBook:number) {
  const word=await supabase.from("dhsjr").select("*").eq(FIELD_TO_COLUMN.book_id, bookId).eq(FIELD_TO_COLUMN.word_index_in_book, wordIndexInBook).limit(1).single();

  return word;
}

export async function getWordRecords(bookId: string, wordIndexInBook: string) {
  const { data, error } = await supabase
    .from("dhsjr")
    .select("*")
    .eq(FIELD_TO_COLUMN.book_id, bookId)
    .eq(FIELD_TO_COLUMN.word_index_in_book, wordIndexInBook)
    .order(FIELD_TO_COLUMN.index_in_book, { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch word: ${error.message}`);
  }

  return data ? data.map(rowToDhsjr) : [];
}
