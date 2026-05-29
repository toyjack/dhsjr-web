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

export async function getBookData(bookId: string) {
  const book = await supabase.from("dhsjr-books").select("*").eq("book_id", bookId).limit(1).single();
  if (book.error) {
    console.error(`Failed to fetch book data for bookId ${bookId}:`, book.error);
    return null;
  }
  return book.data;
}

export async function getBookList() {
  const { data, error } = await supabase.from("dhsjr-books").select("book_id, title").order("book_id", { ascending: true });
  
  if (error) {
    console.error("Failed to fetch book list:", error);
    return [];
  }
  return data;
}

