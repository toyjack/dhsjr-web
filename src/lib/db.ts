import type { BookList, Inputs, SearchResults } from "@/types";
import { FIELD_TO_COLUMN, rowToDhsjr } from "./field-mapping";
import { supabase } from "./supabase";

const PAGE = 1;
const PER_PAGE = 100;

export async function getBookList() {
  const { data, error } = await supabase
  // @ts-ignore - Supabase infers types automatically, but sometimes makes mistakes
    .from("book_list_dhsjr")
    .select("*",)
    .order("資料番号", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch book list: ${error.message}`);
  }

  if (!data) {
    return [] as BookList;
  }
  

  // Remove duplicates manually since Supabase doesn't have groupBy
  // 20-039-18
  const uniqueBooks = Array.from(
    new Map(
      data.map((item) => [
        // @ts-ignore
        item.資料番号.split("-").splice(0,2).join("-"),
        // @ts-ignore
        { book_id: item.資料番号.split("-").splice(0,2).join("-"), book_name: item.資料名 },
      ])
    ).values()
  );

  console.log("Unique Books:", uniqueBooks);

  return uniqueBooks as BookList;
}

export async function searchAll(term: string, page = PAGE, perPage = PER_PAGE) {
  const query = supabase
  // @ts-ignore - RPC function will be available after running SQL setup
    .rpc("search_dhsjr_by_word", { 
      search_query: term, 
      page_number: page, 
      page_size: perPage
     });

  const { data, error } = await query;

  const queryCount = supabase.rpc("count_dhsjr_by_word", { search_query: term });
  const { data: count, error: countError } = await queryCount;

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
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
    query = query.ilike(FIELD_TO_COLUMN.book_id, `${params.book_id}%`);
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
