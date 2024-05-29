"use client";

import { BookList, Inputs } from "@/types";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import TextInput from "./text-input";
import { useAtom } from "jotai";
import { perPageAtom } from "@/lib/atoms";
import { useI18n } from "@/locales/client";

export default function SearchDetailedForm({
  bookList,
}: {
  bookList: BookList;
}) {
  const t = useI18n();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();

  const [perPage] = useAtom(perPageAtom);

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    const path = `/results?${new URLSearchParams(
      data
    ).toString()}&page=1&perPage=${perPage}`;
    router.push(path);
  };

  return (
    <form
      onSubmit={handleSubmit((e) => onSubmit(e))}
      className="flex flex-col w-full md:p-2 gap-y-4"
    >
      <p className="text-base text-base-content">
        {t("advanced_search_description")}
      </p>
      {/* TODO divide 漢字　漢語 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="character"
          register={register}
          fieldLable={t("search_form_character")}
          placeholder={t("search_form_input_chinese_character")}
        />

        <TextInput
          label="word"
          register={register}
          fieldLable={t("search_form_word")}
          placeholder={t("search_form_input_chinese_character")}
        />
      </div>

      <div className="grid grid-cols-1">
      <label className="form-control w-full">
          <div className="label">
            <span className="label-text">{t("search_form_book")}</span>
          </div>
          <select
            className="select select-bordered select-info w-full"
            {...register("book_id")}
          >
            <option value={""}>{t("search_form_select_book")}</option>
            {bookList.map((book) => {
              return (
                <option key={book.book_id} value={book.book_id}>
                  {book.book_id}{" "}{book.book_name}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="shoten"
          register={register}
          fieldLable={t("search_form_shoten")}
          placeholder={t("search_form_input_shoten_placeholder")}
          className="input-info basis-1/2"
        />
        <TextInput
          label="shoten_word"
          register={register}
          fieldLable={t("search_form_shoten_word")}
          placeholder={t("search_form_input_shoten_word_placeholder")}
          className="input-info basis-1/2"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="kana"
          register={register}
          fieldLable={t("search_form_kana")}
          placeholder={t("search_form_input_kana_placeholder")}
        />
        <TextInput
          label="word_kana"
          register={register}
          fieldLable={t("search_form_kana_word")}
          placeholder={t("search_form_input_kana_word_placeholder")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="fanqie"
          register={register}
          fieldLable={t("search_form_fanqie")}
          placeholder={t("search_form_input_chinese_character")}
        />
        <TextInput
          label="ruion"
          register={register}
          fieldLable={t("search_form_ruion")}
          placeholder={t("search_form_input_chinese_character")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="etc"
          register={register}
          fieldLable={t("search_form_etc")}
          placeholder=""
        />
        <TextInput
          label="notes"
          register={register}
          fieldLable={t("search_form_notes")}
          placeholder=""
        />
      </div>

      <div className="flex flex-row w-full gap-x-4 pb-2 items-end justify-end">
        <button
          className="flex-1 btn btn-error w-full max-w-32"
          onClick={() => reset()}
        >
          {t("clear")}
        </button>
        <input
          type="submit"
          className="flex-1 btn btn-info w-full max-w-32"
          value={t("advancedSearch")}
        />
      </div>
    </form>
  );
}
