import type { Dhsjr } from "@/lib/field-mapping";

export type Inputs = {
  character: string;
  word_original: string;
  book_name: string;
  book_id: string;
  word: string;
  word_alphabet: string;
  word_type: string;
  pos_in_word: string;
  len: string;
  shoten: string;
  shoten_word: string;
  kana: string;
  word_kana: string;
  fanqie: string;
  ruion: string;
  hakase: string;
  etc: string;
  notes: string;
};

export type SearchResults = {
  meta: {
    query: { 
      term?:string,
      params?:Inputs
     },
    count: number,
    page: number,
    perPage: number,
  },
  data: Dhsjr[],
}