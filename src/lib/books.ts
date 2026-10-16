import { dbError } from "./db-error";
import { supabase } from "./supabase";

export interface BookData {
    id: string
    title: string
    age: string
    owner: string
    pictures: string[]
    guide: string[]
    information: string[]
    inputor: string[]
    bibs: string[]
  }

/** Book bibliography, or null when the book is not registered. Throws DbError on database errors. */
export async function fetchBookData(bookId: string) {
  const { data, error, status } = await supabase
    .from("dhsjr-books")
    .select("*")
    .eq("book_id", bookId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw dbError(`Failed to fetch book data for bookId ${bookId}`, error, status);
  }
  return data;
}

/** All registered books, ordered by book_id. Throws DbError on database errors. */
export async function fetchBookList() {
  const { data, error, status } = await supabase
    .from("dhsjr-books")
    .select("book_id, title")
    .order("book_id", { ascending: true });
  if (error) {
    throw dbError("Failed to fetch book list", error, status);
  }
  return data;
}

// The Web pages use these. They treat a database error like a missing book /
// an empty list, so the search panel in the layout never takes the site down.
// TODO(D15): show an error on the Web instead, see docs/DHSJR_MCP_PHASE2_DESIGN.md §7.
export async function getBookData(bookId: string) {
  try {
    return await fetchBookData(bookId);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getBookList() {
  try {
    return await fetchBookList();
  } catch (error) {
    console.error(error);
    return [];
  }
}
