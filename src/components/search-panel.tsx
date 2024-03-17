import React from "react";
import SearchDetailedForm from "./search-detailed-form";
import SearchAllForm from "./search-all-form";

export default function SearchPanel() {
  return (
    <div className="card py-2 mx-1 my-2 md:p-4 md:m-4 bg-base-300 shadow flex flex-col justify-center items-center md:w-full">
      {/* <h2 className="text-xl font-bold p-4">検索</h2> */}

      <div className="flex flex-col max-w-5xl w-full gap-y-4 px-2">
        <SearchAllForm />
        
        <div
          tabIndex={0}
          className="collapse collapse-plus border border-base-300 bg-base-200"
        >
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-sm md:text-xl font-medium">詳細検索</div>
          <div className="collapse-content">
            <div className="flex flex-col gap-y-4">
              <SearchDetailedForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
