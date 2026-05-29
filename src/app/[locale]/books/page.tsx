import Link from "next/link";
import { ALL_MANIFEST } from "../../../../contents/manifest";
import { getI18n } from "@/locales/server";
import { getBookList } from "@/lib/books";
import { localePath } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DHSJR - Books",
};

export default async function BooksPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  const t = await getI18n();
  const allBooks = await getBookList();
  const hasManifest = (bookId:string)=>{
    if (ALL_MANIFEST.find((m) => m.book_id === bookId)?.manifest){
      return true;
    }
    return false;
  }
  return (
    <div className="prose prose-sm md:prose-base w-full max-w-4xl flex-grow pt-10">
      <h1>{t("all_books_list")}</h1>
      <div className="overflow-x-scroll">
        <table className="table rounded-none p-2">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t("book_name")}</th>
              <th>{t("iiif_availability")}</th>
            </tr>
          </thead>
          <tbody>
            {allBooks.map((book) => (
              <tr key={book.book_id} className="hover:bg-base-300">
                <td><Link href={localePath(`/book/${book.book_id}`, params.locale)}>{book.book_id}</Link></td>
                <td><Link href={localePath(`/book/${book.book_id}`, params.locale)}>{book.title}</Link></td>
                <td>{hasManifest(book.book_id) ? t("iiif_yes") : t("iiif_no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
