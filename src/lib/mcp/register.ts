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
      "full（既定）: 1件1行の要約と全フィールドの JSON。compact: 要約行と word_url / book_url を省いた JSON のみ（研究用フィールドはすべて残る）",
    ),
};

const detailFields = {
  character: z
    .string()
    .optional()
    .describe("単字見出し（完全一致）。旧字体・正字で指定する 例: 經"),
  word: z
    .string()
    .optional()
    .describe("漢語見出し（部分一致）。旧字体・正字で指定する 例: 經典"),
  kana: z
    .string()
    .optional()
    .describe(
      "仮名注（部分一致）例: キヤウ。筆色の注記〔墨〕〔朱〕が前置されることがある。",
    ),
  word_kana: z
    .string()
    .optional()
    .describe("漢語の仮名型（部分一致）。注記のない位置は ＊ で埋められる。"),
  shoten: z
    .string()
    .optional()
    .describe(
      "声点（部分一致）例: 平・上・去・入・平濁。筆色の注記〔墨〕〔朱〕が前置されることがある。",
    ),
  shoten_word: z
    .string()
    .optional()
    .describe("声点型（部分一致）。注記のない位置は ＊ で埋められる。"),
  fanqie: z.string().optional().describe("反切（部分一致）"),
  ruion: z.string().optional().describe("類音（部分一致）"),
  book_name: z.string().optional().describe("資料名（部分一致）"),
  book_id: z.string().optional().describe("資料番号（完全一致）例: 10-001-01"),
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
        "DHSJR（資料横断的な漢字音・漢語音データベース）を全文検索する。対象は 単字見出し・単字出現形・漢語見出し・漢語出現形・漢語alphabet・仮名注・仮名型・反切・類音・その他・備考 の11フィールドで、資料名・声点・声点型・節博士は含まない（資料で絞るなら search_detail の book_name / book_id、声点で絞るなら search_detail の shoten）。結果は一致したフィールドの優先度（単字 → 漢語 → 仮名 → 反切/類音 → その他/備考）順に並ぶ。",
      inputSchema: z.object({
        term: z
          .string()
          .min(1)
          .describe(
            "検索語（漢字・仮名・ローマ字など）。異体字は正規化されるので新字体（経）でも旧字体（經）でも同じ結果になる。",
          ),
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
        "フィールドを指定して DHSJR を検索する。単字（character）と資料番号（book_id）は完全一致、その他は部分一致。最低1つの条件が必要。見出しの単字・漢語は旧字体・正字で格納されているため「經」「醫」のように指定する（「経」「医」など新字体では 0 件になる）。",
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
        "DHSJR に収録されている資料（資料番号と資料名）の一覧を返す。",
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
        "資料番号（book_id）から書誌情報（年代・所蔵・入力情報・IIIF マニフェストなど）を返す。",
      inputSchema: z.object({
        book_id: z.string().min(1).describe("資料番号 例: 10-001-01"),
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
        "資料番号と資料内漢語番号から、その漢語を構成する全漢字レコードを資料内の並び順で返す。検索結果の word_url に対応する。",
      inputSchema: z.object({
        book_id: z.string().min(1).describe("資料番号 例: 10-001-01"),
        word_index_in_book: z.string().min(1).describe("資料内漢語番号"),
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
        "単字ID（character_id）から1件の漢字レコードの全フィールドを返す。検索結果の character_id / url に対応する。",
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
