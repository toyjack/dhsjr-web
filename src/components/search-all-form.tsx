"use client";

import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";

type Inputs = {
  query: string;
}
export default function SearchAllForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();
  const router = useRouter();

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    const path = `/results?${new URLSearchParams(data).toString()}`;
    router.push(path);
  };

  return (
    <form className="w-full" onSubmit={handleSubmit((e) => onSubmit(e))}>
      <div className="join w-full">
        <input className="input input-bordered input-primary join-item w-full" placeholder="フリーワードで全文検索" {...register("query")} />
        <input type="submit" value={"検索"} className="btn btn-primary join-item" />
      </div>
    </form>
  )
}
