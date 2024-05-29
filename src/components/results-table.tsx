"use client";

import { Dhsjr } from "@prisma/client";
import RubyCell from "./ruby-cell";
import Link from "next/link";
import { useI18n } from "@/locales/client";

export default function ResultsTable({ data }: { data: Dhsjr[] }) {
  const t = useI18n();

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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.character_id}>
              <th>
                <Link
                  href={`/character/${row.character_id}`}
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
                      href={`/book/${row.book_id}`}
                    >
                      {row.book_name}
                    </Link>
                  </div>
                  <div>{t("shozai")}：{row.position_in_book}</div>
                </div>
              </td>
              <td className="text-base-content text-2xl font-semibold">
                <RubyCell
                  baseText={row.character}
                  rubyTop={row.shoten}
                  rubyBottom={row.kana}
                  fanqie={row.fanqie}
                  ruion={row.ruion}
                  href={`/character/${row.character_id}`}
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
                  href={`/character/${row.character_id}`}
                  className="btn btn-primary"
                >
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
