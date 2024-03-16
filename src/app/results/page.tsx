import ResultsTable from "@/components/results-table";
import { search, searchAll } from "@/lib/db";
import { Inputs } from "@/types";
import React from "react";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // TODO check if string in searchParams is empty
  if (!searchParams) {
    return <div>検索条件が指定されていません。</div>;
  }

  let data;
  if (searchParams.query) {
    data = await searchAll(searchParams.query as string, Number(searchParams.page), Number(searchParams.perPage));
  } else {
    data = await search(searchParams as Inputs, Number(searchParams.page), Number(searchParams.perPage));
  }

  return (
    <div>
      <ResultsTable />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
