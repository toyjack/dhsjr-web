"use client";

import { cn } from "@/lib/utils";
import { Dhsjr } from "@prisma/client";
import RubyCell from "./ruby-cell";

export default function ResultsTable({ data }: { data: Dhsjr[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>character_id</th>
            <th>book_name</th>
            <th>
              <RubyCell baseText="character(fanqie, ruion)" rubyTop="shoten" rubyBottom="kana" />
            </th>
            <th>
              <RubyCell baseText="word" rubyTop="shoten_word" rubyBottom="word_kana" />
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.character_id}>
              <th>{row.character_id}</th>
              <td>{row.book_name}</td>
              <td className="text-base-content text-2xl font-semibold">
                <RubyCell baseText={row.character} rubyTop={row.shoten} rubyBottom={row.kana} fanqie={row.fanqie} ruion={row.ruion} />
              </td>
              <td className="text-2xl">
                <RubyCell baseText={row.word} rubyTop={row.shoten_word} rubyBottom={row.word_kana}  />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
