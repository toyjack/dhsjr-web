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
        すべてはAND検索である。上の全文検索と併用できない。
      </p>
      {/* TODO divide 漢字　漢語 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="character"
          register={register}
          fieldLable="単字"
          placeholder="漢字を入力"
        />

        <TextInput
          label="word"
          register={register}
          fieldLable="漢語"
          placeholder="漢字を入力"
        />
      </div>

      <div className="grid grid-cols-1">
      <label className="form-control w-full">
          <div className="label">
            <span className="label-text">資料名</span>
          </div>
          <select
            className="select select-bordered select-info w-full"
            {...register("book_id")}
          >
            <option value={""}>資料を選ぶ</option>
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
          fieldLable="声点（単字）"
          placeholder="朱、平、濁など"
          className="input-info basis-1/2"
        />
        <TextInput
          label="shoten_word"
          register={register}
          fieldLable="声点（漢語）"
          placeholder="上上平など"
          className="input-info basis-1/2"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="kana"
          register={register}
          fieldLable="仮名（単字）"
          placeholder="墨、カタカナ"
        />
        <TextInput
          label="word_kana"
          register={register}
          fieldLable="仮名（漢語）"
          placeholder="カタカナ"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="fanqie"
          register={register}
          fieldLable="反切"
          placeholder="漢字を入力"
        />
        <TextInput
          label="ruion"
          register={register}
          fieldLable="類音"
          placeholder="漢字を入力"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="etc"
          register={register}
          fieldLable="その他"
          placeholder=""
        />
      </div>

      <div className="flex flex-row w-full gap-x-4 pb-2 items-end justify-end">
        <button
          className="flex-1 btn btn-error w-full max-w-32"
          onClick={() => reset()}
        >
          クリア
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
