import fs from "node:fs";
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
  // const filename = `${process.cwd()}/contents/books/${bookId}.md`;
  // if (!fs.existsSync(filename)) {
  //   return null;
  // }
  // const bookContents = fs.readFileSync(filename, "utf-8");

  // return bookContents;
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
  }));
}

export async function getAllBooksFileNameList() {
  // const bookFiles = fs.readdirSync(`${process.cwd()}/contents/books`);
  // return bookFiles.map((f) => f.replace(/\.md$/, ""));

  const books = Books as BookData[];
  return books.map((b) => b.id);
}
