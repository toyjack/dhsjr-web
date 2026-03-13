"use client";

import { perPageAtom } from "@/lib/atoms";
import { useI18n } from "@/locales/client";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";

export default function SearchWordInBookBtn({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [perPage] = useAtom(perPageAtom);
  const t = useI18n();

  const search = () => {
    const path = `/results?${new URLSearchParams({
      book_id: bookId,
    }).toString()}&page=1&perPage=${perPage}`;
    router.push(path);
  };

  return (
    <button
      type="button"
      className="btn btn-square btn-primary w-full"
      onClick={() => search()}
    >
      {t("show_all_records_of_this_book")}
    </button>
  );
}
