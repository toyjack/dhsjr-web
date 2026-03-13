import PaginationPanel from "@/components/pagination-panel";
import PerPageSetting from "@/components/per-page-setting";
import ResultsTable from "@/components/results-table";
import { search, searchAll } from "@/lib/db";
import { getI18n } from "@/locales/server";
import type { Inputs, SearchResults } from "@/types";

export default async function ResultPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  // Check if searchParams is empty or all values are empty strings
  const hasSearchTerms = searchParams && Object.entries(searchParams).some(
    ([key, value]) => key !== 'page' && key !== 'perPage' && value && String(value).trim() !== ''
  );
  if (!hasSearchTerms) {
    const t = await getI18n();
    return <div className="p-4 text-center">{t("searchConditionRequired")}</div>;
  }

  let data: SearchResults;
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

  const t = await getI18n();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center gap-4 p-2">
        <PaginationPanel maxPage={maxPage} />
        <span>{t("resultsCount", { count: data.meta.count })}</span>
        <PerPageSetting />
      </div>
      <ResultsTable data={data.data} />
      <div className="flex justify-between items-center gap-4 p-2">
        <PaginationPanel maxPage={maxPage} />
        <span>{t("resultsCount", { count: data.meta.count })}</span>
        <PerPageSetting />
      </div>
    </div>
  );
}
