"use client";

import { perPageAtom } from "@/lib/atoms";
import { useAtom } from "jotai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const perPageOptions = [
  { value: 50, label: "50件表示" },
  { value: 100, label: "100件表示" },
  { value: 200, label: "200件表示" },
  { value: 500, label: "500件表示" },
  { value: 1000, label: "1000件表示" },
];

export default function PerPageSetting() {
  const [perPage, setPerPage] = useAtom(perPageAtom);

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const route = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(e.target.value));
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("perPage", e.target.value);
    newSearchParams.set("page", "1");
    const newUrl = `${pathname}?${newSearchParams.toString()}`
    // console.log(newUrl)
    route.push(newUrl);
  };

  return (
    <>
      <select
        className="select select-bordered select-info w-full max-w-xs"
        value={perPage}
        onChange={(e) => handleChange(e)}
      >
        {perPageOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.value === perPage}
          >
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
