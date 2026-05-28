import Books from "../../contents/books.json";
import { BookList } from "@/types";

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
  const books = Books as BookData[];
  const book = books.find((b) => b.id === bookId);
  if (!book) {
    return null;
  }
  return book;

}

export async function getBookList(): Promise<BookList> {
  const books = Books as BookData[];
  return books.map((b) => ({
    book_id: b.id,
    book_name: b.title,
  })).sort((a, b) => a.book_id.localeCompare(b.book_id));
}

export async function getAllBooksFileNameList() {
  // const bookFiles = fs.readdirSync(`${process.cwd()}/contents/books`);
  // return bookFiles.map((f) => f.replace(/\.md$/, ""));

  const books = Books as BookData[];
  return books.map((b) => b.id);
}
