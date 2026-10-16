import type { McpServer } from "@modelcontextprotocol/server";
import {
  ResourceNotFoundError,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { fetchBookData, fetchBookList, fetchBooksByIds } from "@/lib/books";
import {
  countBookRecords,
  getCharacterRecord,
  getWordRecords,
  search,
  searchAll,
} from "@/lib/db";
import type { Dhsjr } from "@/lib/field-mapping";
import { cleanText, detailConditions } from "@/lib/search-params";
import type { Inputs } from "@/types";
import { failureResult } from "./errors";
import {
  bookListResult,
  bookResult,
  bookUrl,
  characterResult,
  DEFAULT_PER_PAGE,
  errorResult,
  MAX_PER_PAGE,
  manifestOf,
  searchResult,
  wildcardWarnings,
  wordResult,
} from "./format";
import {
  getBookOutput,
  getCharacterOutput,
  getWordOutput,
  listBooksOutput,
  searchAllOutput,
  searchDetailOutput,
} from "./schemas";

const pagination = {
  page: z.number().int().min(1).default(1).describe("ページ番号（1始まり）"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(DEFAULT_PER_PAGE)
    .describe(`1ページあたりの件数（最大 ${MAX_PER_PAGE}）`),
};

const responseMode = {
  response_mode: z
    .enum(["full", "compact"])
    .default("full")
    .describe(
      "full（既定）または compact。compact は word_url・book_url と1件ごとの要約行を省く（研究用フィールドはすべて残る）。多くのページを読むときに使う",
    ),
};

const detailFields = {
  character: z
    .string()
    .optional()
    .describe("単字見出し（完全一致・正字）例: 經"),
  word: z.string().optional().describe("漢語見出し（部分一致・正字）例: 經典"),
  kana: z.string().optional().describe("この字の仮名注（部分一致）例: キヤウ"),
  word_kana: z
    .string()
    .optional()
    .describe(
      "漢語全体の仮名型（部分一致）。注記のない位置は全角アスタリスク。半角 * はワイルドカード",
    ),
  shoten: z
    .string()
    .optional()
    .describe("この字の声点（部分一致）例: 平（平濁・平軽にも一致）"),
  shoten_word: z
    .string()
    .optional()
    .describe(
      "漢語全体の声点型（部分一致）例: 平上。注記のない位置は全角アスタリスク。半角 * はワイルドカード",
    ),
  fanqie: z.string().optional().describe("反切（部分一致）例: 徳紅反"),
  ruion: z.string().optional().describe("類音（部分一致）"),
  book_name: z.string().optional().describe("資料名（部分一致）例: 医心方"),
  book_id: z
    .string()
    .optional()
    .describe("資料番号（完全一致）例: 20-002-01。list_books で確認できる"),
  etc: z.string().optional().describe("その他（部分一致）"),
  notes: z.string().optional().describe("備考（部分一致）"),
};

/** Bibliography entries for the books of these records (one query), for source / sources. */
function booksOf(records: Pick<Dhsjr, "book_id">[]) {
  const ids = new Set<string>();
  for (const { book_id } of records) if (book_id) ids.add(book_id);
  return fetchBooksByIds([...ids]);
}

export function registerDhsjr(server: McpServer) {
  server.registerTool(
    "search_all",
    {
      title: "全文検索",
      description:
        "全文検索。単字・漢語の見出しと出現形、漢語 alphabet、仮名注、仮名型、反切、類音、その他、備考の 11 フィールドを横断して探す（資料名・声点・声点型・節博士は対象外）。異体字と平仮名・片仮名の違いは正規化される。空白で区切った語は同じフィールド内にすべて含まれるものが一致し、OR も使える。どのフィールドにあるか分からないときに使う。",
      inputSchema: z.object({
        term: z
          .string()
          .min(1)
          .describe('検索語。例: 東、經、トウ、得紅反、"東西"、東 OR 西'),
        ...pagination,
        ...responseMode,
      }),
      outputSchema: searchAllOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ term, page, per_page, response_mode }) => {
      const query = cleanText(term);
      if (!query) {
        return errorResult(
          "EMPTY_QUERY",
          "検索語が空です。",
          "漢字・仮名・ローマ字などを指定してください。",
        );
      }
      try {
        const result = await searchAll(query, page, per_page);
        const books = await booksOf(result.data);
        return searchResult(result.data, {
          tool: "search_all",
          query: { term: query },
          label: `全文検索「${query}」`,
          count: result.meta.count,
          page: result.meta.page,
          perPage: result.meta.perPage,
          responseMode: response_mode,
          books,
          backend: result.meta.backend ?? "pgroonga",
        });
      } catch (error) {
        return failureResult("search_all", error);
      }
    },
  );

  server.registerTool(
    "search_detail",
    {
      title: "詳細検索",
      description:
        "フィールドを指定して検索する（条件はすべて AND、1つ以上必要）。character と book_id は完全一致、その他は部分一致で、% と * は任意の文字列、_ は任意の1文字。見出しは正字で格納されているので「經」「醫」のように正字で指定する。特定の単字・漢語を確実に引くとき、声点や資料で絞るときに使う。",
      inputSchema: z.object({
        ...detailFields,
        ...pagination,
        ...responseMode,
      }),
      outputSchema: searchDetailOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ page, per_page, response_mode, ...params }) => {
      // Same parsing as db.search(): trimmed, blank values dropped.
      const conditions = detailConditions(params);
      if (conditions.length === 0) {
        return errorResult(
          "EMPTY_QUERY",
          "検索条件を1つ以上指定してください（character, word, kana, shoten, fanqie, book_id ...）。",
        );
      }

      try {
        const result = await search(params as Partial<Inputs>, page, per_page);
        const books = await booksOf(result.data);
        const label = conditions
          .map(({ field, value }) => `${field}=${value}`)
          .join(", ");
        return searchResult(result.data, {
          tool: "search_detail",
          query: {
            conditions: Object.fromEntries(
              conditions.map(({ field, value }) => [field, value]),
            ),
          },
          label: `詳細検索（${label}）`,
          count: result.meta.count,
          page: result.meta.page,
          perPage: result.meta.perPage,
          responseMode: response_mode,
          books,
          warnings: wildcardWarnings(conditions),
        });
      } catch (error) {
        return failureResult("search_detail", error);
      }
    },
  );

  server.registerTool(
    "list_books",
    {
      title: "資料一覧",
      description:
        "収録資料の一覧（資料番号・資料名・IIIF マニフェスト）。資料番号を確認するときに使う。書誌が未登録の資料は含まれない。",
      outputSchema: listBooksOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return bookListResult(await fetchBookList());
      } catch (error) {
        return failureResult("list_books", error);
      }
    },
  );

  server.registerTool(
    "get_book",
    {
      title: "資料の書誌情報",
      description:
        "資料番号から書誌情報を返す：年代、所蔵、入力凡例（position_note に出現位置の書式）、字音の解説、参考文献（原文）、IIIF マニフェスト。",
      inputSchema: z.object({
        book_id: z.string().min(1).describe("資料番号 例: 20-002-01"),
      }),
      outputSchema: getBookOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ book_id }) => {
      try {
        const book = await fetchBookData(book_id);
        if (book) {
          return bookResult(book_id, book);
        }
        // Some book IDs have records but no bibliography entry (NEW-7).
        const records = await countBookRecords(book_id);
        return records > 0
          ? errorResult(
              "NOT_FOUND",
              `資料 ${book_id} の書誌情報は登録されていません。`,
              `この資料番号のレコードは ${records} 件あり、search_detail の book_id で検索できます。`,
            )
          : errorResult(
              "NOT_FOUND",
              `資料 ${book_id} は見つかりませんでした。`,
              "list_books で資料番号を確認してください。",
            );
      } catch (error) {
        return failureResult("get_book", error);
      }
    },
  );

  server.registerTool(
    "get_word",
    {
      title: "漢語の全漢字レコード",
      description:
        "漢語を構成する全単字レコードを資料内の順に返す。字ごとの仮名注・声点は records、漢語全体の仮名型・声点型は word にある。book_id と word_index_in_book は検索結果のレコードの値を使う。",
      inputSchema: z.object({
        book_id: z.string().min(1).describe("資料番号 例: 20-002-01"),
        word_index_in_book: z
          .string()
          .min(1)
          .describe("資料内漢語番号（検索結果の word_index_in_book）"),
        ...responseMode,
      }),
      outputSchema: getWordOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ book_id, word_index_in_book, response_mode }) => {
      try {
        const records = await getWordRecords(book_id, word_index_in_book);
        if (records.length === 0) {
          return errorResult(
            "NOT_FOUND",
            `漢語 ${book_id}_${word_index_in_book} は見つかりませんでした。`,
            "book_id と word_index_in_book は検索結果のレコードの値を指定してください。",
          );
        }
        return wordResult(
          book_id,
          word_index_in_book,
          records,
          response_mode,
          await fetchBooksByIds([book_id]),
        );
      } catch (error) {
        return failureResult("get_word", error);
      }
    },
  );

  server.registerTool(
    "get_character",
    {
      title: "単字レコード",
      description:
        "単字ID（character_id）から1件のレコードの全フィールドと出典（source）を返す。",
      inputSchema: z.object({
        character_id: z
          .string()
          .min(1)
          .describe("単字ID（検索結果の character_id）"),
      }),
      outputSchema: getCharacterOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ character_id }) => {
      try {
        const record = await getCharacterRecord(character_id);
        if (!record) {
          return errorResult(
            "NOT_FOUND",
            `単字ID ${character_id} は見つかりませんでした。`,
            "検索結果の character_id を指定してください。",
          );
        }
        return characterResult(character_id, record, await booksOf([record]));
      } catch (error) {
        return failureResult("get_character", error);
      }
    },
  );

  server.registerResource(
    "book-bibliography",
    new ResourceTemplate("dhsjr://book/{book_id}", {
      list: async () => {
        const books = await fetchBookList();
        return {
          resources: books.map((book) => ({
            uri: `dhsjr://book/${book.book_id}`,
            name: `${book.book_id} ${book.title ?? ""}`.trim(),
            title: book.title ?? book.book_id,
            description: `${book.book_id} の書誌情報`,
            mimeType: "text/markdown",
          })),
        };
      },
      complete: {
        book_id: async (value) => {
          const books = await fetchBookList();
          return books
            .map((book) => book.book_id)
            .filter((id) => id.startsWith(value))
            .slice(0, 100);
        },
      },
    }),
    {
      title: "資料書誌",
      description: "DHSJR 各資料の書誌情報（Bibliography の Markdown）。",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const bookId = Array.isArray(variables.book_id)
        ? variables.book_id[0]
        : variables.book_id;
      const book = bookId ? await fetchBookData(bookId) : null;
      if (!book) {
        throw new ResourceNotFoundError(
          uri.href,
          `資料 ${bookId ?? "(未指定)"} は見つかりませんでした。`,
        );
      }

      const manifest = manifestOf(book.book_id);
      const text = [
        book.raw_markdown?.trim() ?? "",
        "",
        `- ページ: ${bookUrl(book.book_id)}`,
        manifest ? `- IIIF マニフェスト: ${manifest}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("\n");

      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
    },
  );
}
