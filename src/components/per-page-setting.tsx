"use client";

import { perPageAtom } from "@/lib/atoms";
import { useI18n } from "@/locales/client";
import { useAtom } from "jotai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const perPageOptions = [50, 100, 200, 500, 1000];

export default function PerPageSetting() {
  const [perPage, setPerPage] = useAtom(perPageAtom);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = useRouter();
  const t = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(e.target.value));
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("perPage", e.target.value);
    newSearchParams.set("page", "1");
    const newUrl = `${pathname}?${newSearchParams.toString()}`;
    route.push(newUrl);
  };

  return (
    <select
      className="select select-bordered select-info w-full max-w-xs"
      value={perPage}
      onChange={(e) => handleChange(e)}
    >
      {perPageOptions.map((option) => (
        <option key={option} value={option} disabled={option === perPage}>
          {t("perPage", { count: option })}
        </option>
      ))}
    </select>
  );
}
