"use client";

import { Inputs } from "@/types";
import { useRouter } from "next/navigation";
import { Form, SubmitHandler, useForm } from "react-hook-form";
import TextInput from "./text-input";

export default function SearchForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    console.log(data);

    const path = `/results?${new URLSearchParams(data).toString()}`;
    router.push(path);
  };

  return (
    <form
      onSubmit={handleSubmit((e) => onSubmit(e))}
      className="flex flex-col w-full pt-10 px-4 gap-y-4"
    >
      <p>すべてはAND検索である。</p>
      <TextInput
        label="word"
        register={register}
        fieldLable="単字・漢語"
        placeholder="漢字を入力"
      />
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

      <div className="flex flex-row w-full gap-x-4 pb-4">
        <button className="flex-1 btn btn-error w-full" onClick={() => reset()}>
          クリア
        </button>
        <input
          type="submit"
          className="flex-1 btn btn-primary w-full"
          value="検索"
        />
      </div>
    </form>
  );
}
