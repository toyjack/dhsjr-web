import { getBookData } from "@/lib/books";
import ReactMarkdown from "react-markdown";
import { ALL_MANIFEST } from "../../../../../contents/manifest";
import dynamic from "next/dynamic";

const DynamicIIIFViewer = dynamic(() => import("@/components/iiif-viewer"), {
  ssr: false,
});

export default async function BookPage({
  params,
}: {
  params: { bookID: string };
}) {
  const bookData = await getBookData(params.bookID);
  const manifest = ALL_MANIFEST.find(
    (m) => m.book_id === params.bookID
  )?.manifest;

  if (!bookData) {
    // TODO: add i18n
    return <div>Book not found</div>;
  }

  return (
    <div className="p-1 md:p-4">
      <div className="prose prose-sm md:prose-base w-full max-w-4xl flex-grow pt-10">
        <ReactMarkdown>{bookData}</ReactMarkdown>
      </div>

      <div className="divider" />

      <div>
        {manifest ? (
          <DynamicIIIFViewer manifestUrl={manifest} />
        ) : (
          // TODO: add i18n
          "No manifest"
        )}
      </div>
    </div>
  );
}
