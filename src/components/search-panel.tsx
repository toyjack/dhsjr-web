import SearchDetailedForm from "./search-detailed-form";
import SearchAllForm from "./search-all-form";
import { getI18n } from "@/locales/server";
import { getBookList } from "@/lib/db";

export default async function SearchPanel() {
  const t = await getI18n();
  const bookList = await getBookList();

  return (
    <div className="w-full py-2 flex flex-col justify-center items-center lg:w-full">
      <div className="flex flex-col w-full gap-y-4 px-2">
        <div role="tablist" className="tabs tabs-lifted">
          <input
            type="radio"
            name="my_tabs_2"
            role="tab"
            className="tab"
            aria-label="全文検索"
            defaultChecked
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <SearchAllForm />
          </div>

          <input
            type="radio"
            name="my_tabs_2"
            role="tab"
            className="tab"
            aria-label="詳細検索"
          />
          <div
            role="tabpanel"
            className="tab-content bg-base-100 border-base-300 rounded-box p-6"
          >
            <SearchDetailedForm bookList={bookList} />
          </div>
        </div>

      </div>
    </div>
  );
}
