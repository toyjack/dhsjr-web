"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function PaginationPanel({ maxPage }: { maxPage: number }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const route = useRouter();

  const currentPage = Number(searchParams.get("page") ?? 1);

  const newSearchParams = new URLSearchParams(searchParams);

  const changePage = (page: number) => {
    newSearchParams.set("page", String(page));
    const newUrl = `${path}?${newSearchParams.toString()}`;
    // console.log(newUrl);
    route.push(newUrl)
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

  const onClickFirst = () => {
    changePage(1);
  };

  const onClickLast = () => {
    changePage(maxPage);
  };

  return (
    <div className="join">
      <button
        className="join-item btn btn-info btn-outline"
        onClick={onClickPrev}
      >
        «
      </button>
      {/* <button className={cn('join-item btn btn-info btn-outline',{'btn-active':currentPage===1})} onClick={onClickFirst}>1</button> */}
      <select
        className="join-item select select-bordered select-info"
        value={currentPage}
        onChange={(e) => changePage(Number(e.target.value))}
      >
        {Array.from({ length: maxPage }, (_, i) => i + 1).map((page) => (
          <option key={page} value={page} disabled={currentPage === page}>
            {page} / {maxPage}
          </option>
        ))}
        {/* <option value="1" selected={currentPage===1}>1 / {maxPage}</option> */}
      </select>
      {/* <button className={cn('join-item btn btn-info btn-outline',{'btn-active':currentPage===maxPage})} onClick={onClickLast}>{maxPage}</button> */}
      <button
        className="join-item btn btn-info btn-outline"
        onClick={onClickNext}
      >
        »
      </button>
    </div>
  );
}
