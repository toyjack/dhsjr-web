import PaginationPanel from "@/components/pagination-panel";
import PerPageSetting from "@/components/per-page-setting";
import ResultsTable from "@/components/results-table";
import { search, searchAll } from "@/lib/db";
import { Inputs } from "@/types";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // TODO check if string in searchParams is empty
  if (!searchParams) {
    // add i18n
    return <div>検索条件が指定されていません。</div>;
  }

  let data;
  if (searchParams.query) {
    data = await searchAll(
      searchParams.query as string,
      Number(searchParams.page),
      Number(searchParams.perPage)
    );
  } else {
    data = await search(
      searchParams as Inputs,
      Number(searchParams.page),
      Number(searchParams.perPage)
    );
  }

  const maxPage = Math.ceil(data.meta.count / data.meta.perPage);

  return (
    <div className="">
      <div className="flex justify-between gap-4 p-2">
        <PaginationPanel maxPage={maxPage} />
        <PerPageSetting />
      </div>
      <ResultsTable data={data.data} />
      <div className="flex justify-between gap-4 p-2">
        <PaginationPanel maxPage={maxPage} />
        <PerPageSetting />
      </div>
    </div>
  );
}
