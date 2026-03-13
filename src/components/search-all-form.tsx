"use client";

import { perPageAtom } from "@/lib/atoms";
import { useI18n } from "@/locales/client";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";

type Inputs = {
  query: string;
};
export default function SearchAllForm() {
  const t = useI18n();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const router = useRouter();

  const [perPage] = useAtom(perPageAtom);

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    if (!data.query?.trim()) return;
    const path = `/results?${new URLSearchParams(
      data
    ).toString()}&page=1&perPage=${perPage}`;
    router.push(path);
  };

  return (
    <form className="w-full" onSubmit={handleSubmit((e) => onSubmit(e))}>
      <div className="join w-full">
        <input
          className="input input-bordered input-primary join-item w-full"
          placeholder={t("search_all_form_placeholder")}
          {...register("query")}
        />
        <input
          type="submit"
          value={t("search")}
          className="btn btn-primary join-item"
        />
      </div>
    </form>
  );
}
