"use client";

import { Dhsjr } from "@prisma/client";
import RubyCell from "./ruby-cell";
import Link from "next/link";

export default function ResultsTable({ data }: { data: Dhsjr[] }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="table">
        <thead>
          <tr>
            <th>character_id</th>
            <th>book_name</th>
            <th>
              <RubyCell
                baseText="character(fanqie, ruion)"
                rubyTop="shoten"
                rubyBottom="kana"
              />
            </th>
            <th>
              <RubyCell
                baseText="word"
                rubyTop="shoten_word"
                rubyBottom="word_kana"
              />
            </th>
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
                  <div>{row.position_in_book}</div>
                </div>
              </td>
              <td className="text-base-content text-2xl font-semibold">
                <RubyCell
                  baseText={row.character}
                  rubyTop={row.shoten}
                  rubyBottom={row.kana}
                  fanqie={row.fanqie}
                  ruion={row.ruion}
                />
              </td>
              <td className="text-2xl">
                {/* TODO word's id  */}
                <Link href={`/word/${row.book_id}-${row.word_index_in_book}`}>
                  <RubyCell
                    baseText={row.word}
                    rubyTop={row.shoten_word}
                    rubyBottom={row.word_kana}
                  />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
