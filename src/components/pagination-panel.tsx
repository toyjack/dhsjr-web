"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function PaginationPanel({ maxPage }: { maxPage: number }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const route = useRouter();

  const currentPage = Number(searchParams.get("page") ?? 1);

  const newSearchParams = new URLSearchParams(searchParams.toString());

  const changePage = (page: number) => {
    newSearchParams.set("page", String(page));
    const newUrl = `${path}?${newSearchParams.toString()}`;
    // console.log(newUrl);
    route.push(newUrl);
  };

  const onClickNext = () => {
    if (currentPage < maxPage) {
      changePage(currentPage + 1);
    }
  };

  const onClickPrev = () => {
    if (currentPage > 1) {
      changePage(currentPage - 1);
    }
  };

  // const onClickFirst = () => {
  //   changePage(1);
  // };

  // const onClickLast = () => {
  //   changePage(maxPage);
  // };

  return (
    <div className="join">
      <button
        type="button"
        className="join-item btn btn-info btn-outline"
        onClick={onClickPrev}
      >
        «
      </button>
      
      <select
        className="join-item select select-bordered select-info"
        value={currentPage}
        onChange={(e) => changePage(Number(e.target.value))}
        aria-label="Page navigation"
      >
        {Array.from({ length: maxPage }, (_, i) => i + 1).map((page) => (
          <option key={page} value={page}>
            {page} / {maxPage}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="join-item btn btn-info btn-outline"
        onClick={onClickNext}
      >
        »
      </button>
    </div>
  );
}
