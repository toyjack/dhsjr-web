import { getBookList } from "@/lib/db";
import Link from "next/link";
import React from "react";
import { ALL_MANIFEST } from "../../../../contents/manifest";

export default async function BooksPage() {
  const allBooks = await getBookList();
  const hasManifest = (bookId:string)=>{
    if (ALL_MANIFEST.find((m) => m.book_id === bookId)?.manifest){
      return true;
    }
    return false;
  }
  return (
    <div className="prose prose-sm md:prose-base w-full max-w-4xl flex-grow pt-10">
      {/* TODO: i18n */}
      <h1>文献資料一覧</h1>
      <p>書誌情報のページ</p>
      <div className="overflow-x-scroll">
        <table className="table rounded-none p-2">
          <thead>
            <tr>
              <th>id</th>
              <th>文献名</th>
              <th>IIIF画像閲覧</th>
            </tr>
          </thead>
          <tbody>
            {allBooks.map((book) => (
              <tr key={book.book_id} className="hover:bg-base-300">
                <td><Link href={`/book/${book.book_id}`}>{book.book_id}</Link></td>
                <td><Link href={`/book/${book.book_id}`}>{book.book_name}</Link></td>
                <td>{hasManifest(book.book_id) ? "Yes":"No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
