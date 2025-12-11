import type { Tables } from "@/types/supabase.type";

// Type for dhsjr table row with Japanese column names
export type DhsjrRow = Tables<"dhsjr">;

// Type for dhsjr with English field names (for easier use in the application)
export interface Dhsjr {
  character_id: string;
  book_id: string | null;
  book_name: string | null;
  index_in_book: number;
  word_index_in_book: string | null;
  character: string | null;
  character_original: string | null;
  word: string | null;
  word_original: string | null;
  word_alphabet: string | null;
  word_type: string | null;
  pos_in_word: string | null;
  len: string | null;
  shoten: string | null;
  shoten_word: string | null;
  kana: string | null;
  word_kana: string | null;
  fanqie: string | null;
  ruion: string | null;
  hakase: string | null;
  etc: string | null;
  position_in_book: string | null;
  notes: string | null;
}

// Mapping from English field names to Japanese column names
export const FIELD_TO_COLUMN: Record<keyof Dhsjr, keyof DhsjrRow> = {
  character_id: "ID",
  book_id: "資料番号",
  book_name: "資料名",
  index_in_book: "資料内漢字番号",
  word_index_in_book: "資料内漢語番号",
  character: "単字_見出し",
  character_original: "単字_出現形",
  word: "漢語_見出し",
  word_original: "漢語_出現形",
  word_alphabet: "漢語_alphabet",
  word_type: "語種",
  pos_in_word: "漢語内位置",
  len: "単字長",
  shoten: "声点",
  shoten_word: "声点型",
  kana: "仮名注",
  word_kana: "仮名型",
  fanqie: "反切",
  ruion: "類音",
  hakase: "節博士",
  etc: "その他",
  position_in_book: "出現位置",
  notes: "備考",
};

// Mapping from Japanese column names to English field names
export const COLUMN_TO_FIELD: Record<keyof DhsjrRow, keyof Dhsjr> = {
  ID: "character_id",
  資料番号: "book_id",
  資料名: "book_name",
  資料内漢字番号: "index_in_book",
  資料内漢語番号: "word_index_in_book",
  単字_見出し: "character",
  単字_出現形: "character_original",
  漢語_見出し: "word",
  漢語_出現形: "word_original",
  漢語_alphabet: "word_alphabet",
  語種: "word_type",
  漢語内位置: "pos_in_word",
  単字長: "len",
  声点: "shoten",
  声点型: "shoten_word",
  仮名注: "kana",
  仮名型: "word_kana",
  反切: "fanqie",
  類音: "ruion",
  節博士: "hakase",
  その他: "etc",
  出現位置: "position_in_book",
  備考: "notes",
};

/**
 * Convert a database row (with Japanese column names) to Dhsjr (with English field names)
 */
export function rowToDhsjr(row: DhsjrRow): Dhsjr {
  return {
    character_id: row.ID,
    book_id: row.資料番号,
    book_name: row.資料名,
    index_in_book: row.資料内漢字番号,
    word_index_in_book: row.資料内漢語番号,
    character: row.単字_見出し,
    character_original: row.単字_出現形,
    word: row.漢語_見出し,
    word_original: row.漢語_出現形,
    word_alphabet: row.漢語_alphabet,
    word_type: row.語種,
    pos_in_word: row.漢語内位置,
    len: row.単字長,
    shoten: row.声点,
    shoten_word: row.声点型,
    kana: row.仮名注,
    word_kana: row.仮名型,
    fanqie: row.反切,
    ruion: row.類音,
    hakase: row.節博士,
    etc: row.その他,
    position_in_book: row.出現位置,
    notes: row.備考,
  };
}

/**
 * Convert Dhsjr (with English field names) to database row (with Japanese column names)
 */
export function dhsjrToRow(dhsjr: Dhsjr): DhsjrRow {
  return {
    ID: dhsjr.character_id,
    資料番号: dhsjr.book_id,
    資料名: dhsjr.book_name,
    資料内漢字番号: dhsjr.index_in_book,
    資料内漢語番号: dhsjr.word_index_in_book,
    単字_見出し: dhsjr.character,
    単字_出現形: dhsjr.character_original,
    漢語_見出し: dhsjr.word,
    漢語_出現形: dhsjr.word_original,
    漢語_alphabet: dhsjr.word_alphabet,
    語種: dhsjr.word_type,
    漢語内位置: dhsjr.pos_in_word,
    単字長: dhsjr.len,
    声点: dhsjr.shoten,
    声点型: dhsjr.shoten_word,
    仮名注: dhsjr.kana,
    仮名型: dhsjr.word_kana,
    反切: dhsjr.fanqie,
    類音: dhsjr.ruion,
    節博士: dhsjr.hakase,
    その他: dhsjr.etc,
    出現位置: dhsjr.position_in_book,
    備考: dhsjr.notes,
  };
}
