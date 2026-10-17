import PaginationPanel from "@/components/pagination-panel";
import PerPageSetting from "@/components/per-page-setting";
import ResultsTable from "@/components/results-table";
import { search, searchAll } from "@/lib/db";
import { cleanText, detailConditions } from "@/lib/search-params";
import { getI18n } from "@/locales/server";
import type { Inputs, SearchResults } from "@/types";
import type { Metadata } from "next";

type ResultPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: ResultPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params?.query ? String(params.query) : undefined;
  return {
    title: query ? `DHSJR - ${query}` : "DHSJR - Search Results",
  };
}

export default async function ResultPage(props: ResultPageProps) {
  const searchParams = await props.searchParams;
  const t = await getI18n();

  // Same parsing as the MCP tools: blank values and unknown params are not conditions.
  // Missing or invalid page/perPage fall back to defaults inside searchAll/search.
  const query = cleanText(searchParams.query);
  const hasSearchTerms =
    query !== undefined || detailConditions(searchParams).length > 0;
  if (!hasSearchTerms) {
    return <div className="p-4 text-center">{t("searchConditionRequired")}</div>;
  }

  let data: SearchResults;
  try {
    if (query) {
      data = await searchAll(
        query,
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
  } catch (e) {
    console.error("Search error:", e);
    return (
      <div className="alert alert-error m-4">
        <span>{t("searchError")}</span>
      </div>
    );
  }

  const maxPage = Math.ceil(data.meta.count / data.meta.perPage);

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
