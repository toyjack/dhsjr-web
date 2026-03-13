import WordCell from "@/components/word-cell";
import { supabase } from "@/lib/supabase";
import { rowToDhsjr } from "@/lib/field-mapping";
import { localePath } from "@/lib/utils";
import { getI18n } from "@/locales/server";
import Link from "next/link";
import { ALL_MANIFEST } from "../../../../../contents/manifest";
import { IoImagesOutline } from "react-icons/io5";

export default async function CharacterPage(
  props: {
    params: Promise<{ locale: string; charID: string }>;
  }
) {
  const params = await props.params;
  const t = await getI18n();

  const { data, error } = await supabase
    .from("dhsjr")
    .select("*")
    .eq("ID", params.charID)
    .single();

  if (error || !data) {
    return <div>{t("character_not_found")}</div>;
  }

  const character = rowToDhsjr(data);

  if (!character) {
    return <div>{t("character_not_found")}</div>;
  }

  const manifest = ALL_MANIFEST.find(
    (m) => m.book_id === character.book_id
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
                  word={character?.word ?? undefined}
                  position={character?.pos_in_word ?? undefined}
                />
              </td>
            </tr>
            <tr>
              <th>{t("word_original")}</th>
              <td>
                <WordCell
                  word={character?.word_original ?? undefined}
                  position={character?.pos_in_word ?? undefined}
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
                  className="link link-hover text-info flex gap-1"
                  href={localePath(`/book/${character?.book_id}`, params.locale)}
                >
                  {character?.book_id}
                  {manifest && <IoImagesOutline className="text-base" />}
                </Link>
              </td>
            </tr>

            <tr>
              <th>{t("bookName")}</th>
              <td>
                <Link
                  className="link link-hover text-info flex gap-1"
                  href={localePath(`/book/${character?.book_id}`, params.locale)}
                >
                  {character?.book_name}
                  {manifest && <IoImagesOutline className="text-base" />}
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
