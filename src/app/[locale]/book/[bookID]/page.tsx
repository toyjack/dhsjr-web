import { getBookData } from "@/lib/books";
import ReactMarkdown from "react-markdown";
import { ALL_MANIFEST } from "../../../../../contents/manifest";
import IiifViewer from "@/components/iiif-viewer";

export default async function BookPage({
  params,
}: {
  params: { bookID: string };
}) {
  const bookData = await getBookData(params.bookID);
  const manifest = ALL_MANIFEST.find((m) => m.book_id === params.bookID)?.manifest;

  if (!bookData) {
    return <div>Book not found</div>;
  }

  return (
    <div className="p-1 md:p-4">
      <div className="prose max-w-none">
        <ReactMarkdown>{bookData}</ReactMarkdown>
      </div>

      <div>
        {manifest ? <IiifViewer manifestUrl={manifest} /> : "No manifest"}
      </div>
    </div>
  );
}
