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
              <th>フィールド</th>
              <th>値</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>ID</th>
              <td>{character?.character_id}</td>
            </tr>
            <tr>
              <th>character</th>
              <td>{character?.character}</td>
            </tr>
            <tr>
              <th>character original</th>
              <td>{character?.character_original}</td>
            </tr>
            <tr>
              <th>length</th>
              <td>{character?.len}</td>
            </tr>
            <tr>
              <th>shoten</th>
              <td>{character?.shoten}</td>
            </tr>
            <tr>
              <th>kana</th>
              <td>{character?.kana}</td>
            </tr>
            <tr>
              <th>fanqie</th>
              <td>{character?.fanqie}</td>
            </tr>
            <tr>
              <th>ruion</th>
              <td>{character?.ruion}</td>
            </tr>
            <tr>
              <th>word</th>
              <td>
                <WordCell
                  word={character?.word!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>word original</th>
              <td>
                <WordCell
                  word={character?.word_original!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>word alphabet</th>
              <td>{character?.word_alphabet}</td>
            </tr>

            <tr>
              <th>word shoten</th>
              <td>{character?.shoten_word}</td>
            </tr>
            <tr>
              <th>word kana</th>
              <td>{character?.word_kana}</td>
            </tr>

            <tr>
              <th>book id</th>
              <td>
                <Link
                  className="link link-hover"
                  href={`/book/${character?.book_id}`}
                >
                  {character?.book_id}
                </Link>
              </td>
            </tr>

            <tr>
              <th>book </th>
              <td>
                <Link
                  className="link link-hover"
                  href={`/book/${character?.book_id}`}
                >
                  {character?.book_name}
                </Link>
              </td>
            </tr>
            <tr>
              <th>position</th>
              <td>{character?.position_in_book}</td>
            </tr>
            <tr>
              <th>hakase</th>
              <td>{character?.hakase}</td>
            </tr>

            <tr>
              <th>etc</th>
              <td>{character?.etc}</td>
            </tr>
            <tr>
              <th>notes</th>
              <td>{character?.notes}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* <pre>{JSON.stringify(character, null, 2)}</pre> */}
    </div>
  );
}
