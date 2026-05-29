import SearchDetailedForm from "./search-detailed-form";
import SearchAllForm from "./search-all-form";
import { getI18n } from "@/locales/server";
import { getBookList } from "@/lib/db";

export default async function SearchPanel() {
  const t = await getI18n();
  const bookList = await getBookList();

  return (
    <div className="w-full py-2 flex flex-col justify-center items-center lg:w-full">
      <div className="flex flex-col max-w-5xl w-full gap-y-4 px-2">
        <SearchAllForm />

        <div
          // biome-ignore lint/a11y/noNoninteractiveTabindex: <explanation>
          tabIndex={0}
          className="collapse collapse-plus border border-base-300 bg-base-300 rounded-md"
        >
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-sm md:text-xl font-medium">
            {t("advancedSearch")}
          </div>
          <div className="collapse-content">
            <div className="flex flex-col gap-y-4">
              <SearchDetailedForm bookList={bookList} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
