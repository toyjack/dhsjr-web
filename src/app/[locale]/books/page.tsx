import { getAllBooksFileNameList } from "@/lib/books";
import React from "react";

export default async function BooksPage() {
  const allBooks = await getAllBooksFileNameList();
  return (
    <div>
      <h1>Books</h1>
      <p>This is the books page</p>
      <div>
        {allBooks.map((book) => (
          <div key={book}>
            <a href={`/book/${book}`}>{book}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
