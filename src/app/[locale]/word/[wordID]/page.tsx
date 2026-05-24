import type { Metadata } from "next";
import Link from "next/link";
import { IoImagesOutline } from "react-icons/io5";
import RubyCell from "@/components/ruby-cell";
import WordCell from "@/components/word-cell";
import { getWordRecords } from "@/lib/db";
import { localePath } from "@/lib/utils";
import { getI18n } from "@/locales/server";
import { ALL_MANIFEST } from "../../../../../contents/manifest";

type WordPageProps = {
  params: Promise<{ locale: string; wordID: string }>;
};

function parseWordID(wordID: string) {
  const [wordIndexInBook, ...bookIDParts] = wordID.split("_").reverse();
  return {
    bookID: bookIDParts.reverse().join("_"),
    wordIndexInBook,
  };
}

export async function generateMetadata({
  params,
}: WordPageProps): Promise<Metadata> {
  const { wordID } = await params;
  const { bookID, wordIndexInBook } = parseWordID(wordID);
  const records = await getWordRecords(bookID, wordIndexInBook);
  const word = records[0]?.word ?? records[0]?.word_original ?? wordID;

  return { title: `DHSJR - ${word}` };
}

export default async function WordPage(props: WordPageProps) {
  const params = await props.params;
  const t = await getI18n();
  const { bookID, wordIndexInBook } = parseWordID(params.wordID);
  const records = await getWordRecords(bookID, wordIndexInBook);

  if (records.length === 0) {
    return <div>{t("word_not_found")}</div>;
  }

  const word = records[0];
  const manifest = ALL_MANIFEST.find(
    (m) => m.book_id === word.book_id,
  )?.manifest;

  return (
    <div className="py-2 sm:py-4 lg:p-16">
      <div className="overflow-x-auto bg-base-100 md:p-2 rounded-sm">
        <table className="table">
          <thead>
            <tr>
              <th>{t("field")}</th>
              <th>{t("value")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t("word")}</th>
              <td className="text-2xl font-semibold">
                <RubyCell
                  baseText={word.word}
                  rubyTop={word.shoten_word}
                  rubyBottom={word.word_kana}
                />
              </td>
            </tr>
            <tr>
              <th>{t("word_original")}</th>
              <td className="text-2xl">
                <RubyCell
                  baseText={word.word_original}
                  rubyTop={word.shoten_word}
                  rubyBottom={word.word_kana}
                />
              </td>
            </tr>
            <tr>
              <th>{t("word_alphabet")}</th>
              <td>{word.word_alphabet}</td>
            </tr>
            <tr>
              <th>{t("word_type")}</th>
              <td>{word.word_type}</td>
            </tr>
            <tr>
              <th>{t("shotengata")}</th>
              <td>{word.shoten_word}</td>
            </tr>
            <tr>
              <th>{t("kanagata")}</th>
              <td>{word.word_kana}</td>
            </tr>
            <tr>
              <th>{t("book_id")}</th>
              <td>
                <Link
                  className="link link-hover text-info flex gap-1"
                  href={localePath(`/book/${word.book_id}`, params.locale)}
                >
                  {word.book_id}
                  {manifest && <IoImagesOutline className="text-base" />}
                </Link>
              </td>
            </tr>
            <tr>
              <th>{t("bookName")}</th>
              <td>
                <Link
                  className="link link-hover text-info flex gap-1"
                  href={localePath(`/book/${word.book_id}`, params.locale)}
                >
                  {word.book_name}
                  {manifest && <IoImagesOutline className="text-base" />}
                </Link>
              </td>
            </tr>
            <tr>
              <th>{t("word_index_in_book")}</th>
              <td>{wordIndexInBook}</td>
            </tr>
            <tr>
              <th>{t("positionInBook")}</th>
              <td>{word.position_in_book}</td>
            </tr>
            <tr>
              <th>{t("etc")}</th>
              <td>{word.etc}</td>
            </tr>
            <tr>
              <th>{t("notes")}</th>
              <td>{word.notes}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="divider" />

      <div className="overflow-x-auto bg-base-100 md:p-2 rounded-sm">
        <table className="table">
          <thead>
            <tr>
              <th>{t("character_id")}</th>
              <th>{t("character")}</th>
              <th>{t("word")}</th>
              <th>{t("positionInBook")}</th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.character_id}>
                <th>
                  <Link
                    className="link link-hover"
                    href={localePath(
                      `/character/${record.character_id}`,
                      params.locale,
                    )}
                  >
                    {record.character_id}
                  </Link>
                </th>
                <td className="text-base-content text-2xl font-semibold">
                  <RubyCell
                    baseText={record.character}
                    rubyTop={record.shoten}
                    rubyBottom={record.kana}
                    fanqie={record.fanqie}
                    ruion={record.ruion}
                    href={localePath(
                      `/character/${record.character_id}`,
                      params.locale,
                    )}
                  />
                </td>
                <td className="text-2xl">
                  <WordCell
                    word={record.word ?? undefined}
                    position={record.pos_in_word ?? undefined}
                  />
                </td>
                <td>{record.position_in_book}</td>
                <td>
                  <Link
                    href={localePath(
                      `/character/${record.character_id}`,
                      params.locale,
                    )}
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
    </div>
  );
}
