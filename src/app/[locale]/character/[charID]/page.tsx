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
              <th>単字_見出し</th>
              <td>{character?.character}</td>
            </tr>
            <tr>
              <th>単字_出現形</th>
              <td>{character?.character_original}</td>
            </tr>
            <tr>
              <th>単字長さ</th>
              <td>{character?.len}</td>
            </tr>
            <tr>
              <th>声点</th>
              <td>{character?.shoten}</td>
            </tr>
            <tr>
              <th>仮名注</th>
              <td>{character?.kana}</td>
            </tr>
            <tr>
              <th>反切</th>
              <td>{character?.fanqie}</td>
            </tr>
            <tr>
              <th>類音</th>
              <td>{character?.ruion}</td>
            </tr>
            
            <tr>
              <th>漢語_見出し</th>
              <td>
                <WordCell
                  word={character?.word!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>漢語_出現形</th>
              <td>
                <WordCell
                  word={character?.word_original!}
                  position={character?.pos_in_word!}
                />
              </td>
            </tr>
            <tr>
              <th>漢語_alphabet</th>
              <td>{character?.word_alphabet}</td>
            </tr>

            <tr>
              <th>声点型</th>
              <td>{character?.shoten_word}</td>
            </tr>
            <tr>
              <th>仮名型</th>
              <td>{character?.word_kana}</td>
            </tr>

            <tr>
              <th>資料番号</th>
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
              <th>資料名</th>
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
              <th>出現位置</th>
              <td>{character?.position_in_book}</td>
            </tr>
            <tr>
              <th>節博士</th>
              <td>{character?.hakase}</td>
            </tr>

            <tr>
              <th>その他</th>
              <td>{character?.etc}</td>
            </tr>
            <tr>
              <th>備考</th>
              <td>{character?.notes}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* <pre>{JSON.stringify(character, null, 2)}</pre> */}
    </div>
  );
}
