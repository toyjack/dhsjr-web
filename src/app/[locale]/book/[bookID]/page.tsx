import { getBookData } from "@/lib/books";
import { ALL_MANIFEST } from "../../../../../contents/manifest";
import dynamic from "next/dynamic";
import SearchWordInBookBtn from "@/components/search-word-in-book-btn";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";

const DynamicIIIFViewer = dynamic(() => import("@/components/iiif-viewer"));

type BookPageProps = {
  params: Promise<{ bookID: string }>;
};

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { bookID } = await params;
  const bookData = await getBookData(bookID);
  return { title: bookData ? `DHSJR - ${bookData.title}` : "DHSJR - Book Not Found" };
}

export default async function BookPage(props: BookPageProps) {
  const params = await props.params;
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
        <SearchWordInBookBtn bookId={params.bookID} />
      </div>
      <div className="prose prose-sm md:prose-base w-full max-w-4xl flex-grow pt-10">
        <h1>{bookData.title}</h1>
        <h2>
          {t("age")}: {bookData.period}
        </h2>
        <h3>
          {t("owner")}: {bookData.holding_institution}
        </h3>
        <h3>
          {t("inputor")}: {bookData.input_responsible}
        </h3>

        <div className="divider" />
        <h3>
          {t("pictures")}
        </h3>
          {/* <ReactMarkdown>{bookData.pictures.join(", ")}</ReactMarkdown> */}
          {bookData.image_info?.map((imgInfo) => (
            <div key={`imgInfo-${imgInfo}`}>
              <p>{imgInfo}</p>
            </div>
          ))}
        <div className="divider" />

        <h3>{t("guides")}</h3>
        {bookData.input_notes?.map((g, index) => (
          <p key={`guide-${index}-${g}`}>{g}</p>
        ))}
        <div className="divider" />

        <h3>{t("informations")}</h3>
        {bookData.phonetic_info?.map((info, index) => (
          <p key={`info-${index}-${info}`}>{info}</p>
        ))}
        <div className="divider" />
        <h3>{t("bibs")}</h3>
        {bookData.references_raw?.map((bib, index) => (
          <p key={`bib-${index}-${bib}`}>{bib}</p>
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
