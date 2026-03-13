"use client";

import type { Dhsjr } from "@/lib/field-mapping";
import { localePath } from "@/lib/utils";
import RubyCell from "./ruby-cell";
import Link from "next/link";
import { useI18n, useCurrentLocale } from "@/locales/client";

export default function ResultsTable({ data }: { data: Dhsjr[] }) {
  const t = useI18n();
  const locale = useCurrentLocale();

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-base-content/60">{t("noResults")}</div>;
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="table">
        <thead>
          <tr>
            <th>{t("id")}</th>
            <th>
              <div>
                <div>{t("bookName")}</div>
                <div>{t("positionInBook")}</div>
              </div>
            </th>
            <th>
              <RubyCell
                baseText={`${t("character")}(${t("fanqie")}, ${t("ruion")})`}
                rubyTop={t("shoten")}
                rubyBottom={t("kanachu")}
              />
            </th>
            <th>
              <RubyCell
                baseText={t("word")}
                rubyTop={t("shotengata")}
                rubyBottom={t("kanagata")}
              />
            </th>
            <th> </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.character_id}>
              <th>
                <Link
                  href={localePath(`/character/${row.character_id}`, locale)}
                  className="link link-hover"
                >
                  {row.character_id}
                </Link>
              </th>
              <td>
                <div>
                  <div>
                    <Link
                      className="link link-hover"
                      href={localePath(`/book/${row.book_id}`, locale)}
                    >
                      {row.book_name}
                    </Link>
                  </div>
                  <div>
                    {t("shozai")}：{row.position_in_book}
                  </div>
                </div>
              </td>
              <td className="text-base-content text-2xl font-semibold">
                <RubyCell
                  baseText={row.character}
                  rubyTop={row.shoten}
                  rubyBottom={row.kana}
                  fanqie={row.fanqie}
                  ruion={row.ruion}
                  href={localePath(`/character/${row.character_id}`, locale)}
                />
              </td>
              <td className="text-2xl">
                {/* TODO word's id  */}
                {/* <Link href={`/word/${row.book_id}-${row.word_index_in_book}`}> */}
                <RubyCell
                  baseText={row.word}
                  rubyTop={row.shoten_word}
                  rubyBottom={row.word_kana}
                />
                {/* </Link> */}
              </td>
              <td>
                <Link
                  href={localePath(`/character/${row.character_id}`, locale)}
                  className="btn btn-primary"
                >
                  {t("details")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
