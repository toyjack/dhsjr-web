import WordCell from "@/components/word-cell";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/locales/server";
import Link from "next/link";

export default async function CharacterPage({
  params,
}: {
  params: { charID: string };
}) {
  const character = await prisma.dhsjr.findUnique({
    where: {
      character_id: params.charID,
    },
  });
  const t = await getI18n();

  return (
    <div className="p-2 md:p-4 lg:p-16">
      {/* <div>CharacterPage: {params.charID}</div> */}
      <div>
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t("field")}</th>
              <th>{t("value")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t("character_id")}</th>
              <td>{character?.character_id}</td>
            </tr>
            <tr>
              <th>{t("character")}</th>
              <td>{character?.character}</td>
            </tr>
            <tr>
              <th>{t("character_original")}</th>
              <td>{character?.character_original}</td>
            </tr>
            <tr>
              <th>{t("character_len")}</th>
              <td>{character?.len}</td>
            </tr>
            <tr>
              <th>{t("shoten")}</th>
              <td>{character?.shoten}</td>
            </tr>
            <tr>
              <th>{t("kanachu")}</th>
              <td>{character?.kana}</td>
            </tr>
            <tr>
              <th>{t("fanqie")}</th>
              <td>{character?.fanqie}</td>
            </tr>
            <tr>
              <th>{t("ruion")}</th>
              <td>{character?.ruion}</td>
            </tr>
            
            <tr>
              <th>{t("word")}</th>
              <td>
                <WordCell
                  word={character?.word!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>{t("word_original")}</th>
              <td>
                <WordCell
                  word={character?.word_original!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>{t("word_alphabet")}</th>
              <td>{character?.word_alphabet}</td>
            </tr>

            <tr>
              <th>{t("shotengata")}</th>
              <td>{character?.shoten_word}</td>
            </tr>
            <tr>
              <th>{t("kanagata")}</th>
              <td>{character?.word_kana}</td>
            </tr>

            <tr>
              <th>{t("book_id")}</th>
              <td>
                <Link
                  className="link link-hover text-info"
                  href={`/book/${character?.book_id}`}
                >
                  {character?.book_id}
                </Link>
              </td>
            </tr>

            <tr>
              <th>{t("bookName")}</th>
              <td>
                <Link
                  className="link link-hover text-info"
                  href={`/book/${character?.book_id}`}
                >
                  {character?.book_name}
                </Link>
              </td>
            </tr>
            <tr>
              <th>{t("positionInBook")}</th>
              <td>{character?.position_in_book}</td>
            </tr>
            <tr>
              <th>{t("hakase")}</th>
              <td>{character?.hakase}</td>
            </tr>

            <tr>
              <th>{t("etc")}</th>
              <td>{character?.etc}</td>
            </tr>
            <tr>
              <th>{t("notes")}</th>
              <td>{character?.notes}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* <pre>{JSON.stringify(character, null, 2)}</pre> */}
    </div>
  );
}
