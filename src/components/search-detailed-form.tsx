"use client";

import { Inputs } from "@/types";
import { useRouter } from "next/navigation";
import { Form, SubmitHandler, useForm } from "react-hook-form";
import TextInput from "./text-input";
import { useAtom } from "jotai";
import { perPageAtom } from "@/lib/atoms";

export default function SearchDetailedForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();

  const [perPage] = useAtom(perPageAtom)

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    const path = `/results?${new URLSearchParams(data).toString()}&page=1&perPage=${perPage}`;
    router.push(path);
  };

  return (
    <form
      onSubmit={handleSubmit((e) => onSubmit(e))}
      className="flex flex-col w-full px-2 pt-2 gap-y-4"
    >
      <p className="text-base text-base-content">
        すべてはAND検索である。上の全文検索と併用できない。
      </p>
      <TextInput
        label="word"
        register={register}
        fieldLable="単字・漢語"
        placeholder="漢字を入力"
      />
      <div className="flex gap-4">
        <TextInput
          label="shoten"
          register={register}
          fieldLable="声点（単字）"
          placeholder="朱、平、濁など"
        />
        <TextInput
          label="shoten_word"
          register={register}
          fieldLable="声点（漢語）"
          placeholder="上上平など"
        />
      </div>
      <div className="flex gap-4">
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

      <div className="flex gap-4">
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

      <div className="flex flex-row w-full gap-x-4 pb-2 items-end justify-end">
        <button
          className="flex-1 btn btn-error w-full max-w-32"
          onClick={() => reset()}
        >
          クリア
        </button>
        <input
          type="submit"
          className="flex-1 btn btn-primary w-full max-w-32"
          value="詳細検索"
        />
      </div>
    </form>
  );
}
