import { getBookData } from "@/lib/books";
import ReactMarkdown from "react-markdown";
import { ALL_MANIFEST } from "../../../../../contents/manifest";
import dynamic from "next/dynamic";
import SearcWordInBookBtn from "@/components/search-word-in-book-btn";
import { getI18n } from "@/locales/server";

const DynamicIIIFViewer = dynamic(() => import("@/components/iiif-viewer"), {
  ssr: false,
});

export default async function BookPage({
  params,
}: {
  params: { bookID: string };
}) {
  const t = await getI18n();
  const bookData = await getBookData(params.bookID);
  const manifest = ALL_MANIFEST.find(
    (m) => m.book_id === params.bookID
  )?.manifest;

  if (!bookData) {
    return <div>{t("book_not_found")}</div>;
  }

  return (
    <div className="p-1 md:p-4">
      <div className="flex md:p-4">
        <SearcWordInBookBtn bookId={params.bookID} />
      </div>
      <div className="prose prose-sm md:prose-base w-full max-w-4xl flex-grow pt-10">
        <h1>{bookData.title}</h1>
        <h2>
          {t("age")}: {bookData.age}
        </h2>
        <h3>
          {t("owner")}: {bookData.owner}
        </h3>
        <h3>
          {t("inputor")}: {bookData.inputor}
        </h3>

        <div className="divider" />
        <h3>
          {t("pictures")}
        </h3>
          <ReactMarkdown>{bookData.pictures.join(", ")}</ReactMarkdown>
        <div className="divider" />

        <h3>{t("guides")}</h3>
        {bookData.guide.map((g, index) => (
          <p key={index}>{g}</p>
        ))}
        <div className="divider" />

        <h3>{t("informations")}</h3>
        {bookData.information.map((info, index) => (
          <p key={index}>{info}</p>
        ))}
        <div className="divider" />
        <h3>{t("bibs")}</h3>
        {bookData.bibs.map((bib, index) => (
          <p key={index}>{bib}</p>
        ))}
        
      </div>

      <div className="divider" />

      <div>
        {manifest ? (
          <DynamicIIIFViewer manifestUrl={manifest} />
        ) : (
          <div>{t("no_iiif_manifest")}</div>
        )}
      </div>
    </div>
  );
}
