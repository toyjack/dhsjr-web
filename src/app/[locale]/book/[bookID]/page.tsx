import { getBookData } from "@/lib/books";
import ReactMarkdown from "react-markdown";

export default async function BookPage({
  params,
}: {
  params: { bookID: string };
}) {
  const bookData = await getBookData(params.bookID);

  if (!bookData) {
    return <div>Book not found</div>;
  }

  return (
    <div className="p-1 md:p-4">
      <div className="prose max-w-none">
        <ReactMarkdown>{bookData}</ReactMarkdown>
      </div>
    </div>
  );
}
