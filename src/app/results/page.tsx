import { search } from "@/lib/db";
import { Inputs } from "@/types";
import React from "react";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  const data = await search(searchParams as Inputs);
  return <div>
    <pre>
    {JSON.stringify(data, null, 2)}
    </pre>
  </div>;
}
