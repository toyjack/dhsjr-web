"use client";

import { perPageAtom } from "@/lib/atoms";
import { useAtom } from "jotai";

export default function ResultsTable() {
  const [perPage,setPerPage] = useAtom(perPageAtom)
  return (
    <div>
      <h2>ResultsTable</h2>
      <p>perPage: {perPage}</p>
      <button onClick={() => setPerPage(50)}>Set perPage to 50</button>
    </div>
  )
}
