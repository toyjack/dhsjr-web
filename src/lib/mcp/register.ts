import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getBookData, getBookList } from "@/lib/books";
import { getWordRecords, search, searchAll } from "@/lib/db";
import { rowToDhsjr } from "@/lib/field-mapping";
import { supabase } from "@/lib/supabase";
import type { Inputs } from "@/types";
import {
  bookUrl,
  compactRecord,
  DEFAULT_PER_PAGE,
  errorResult,
  MAX_PER_PAGE,
  manifestOf,
  recordLine,
  recordsResult,
  textResult,
  wordUrl,
} from "./format";

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

export function registerDhsjr(server: McpServer) {
  server.registerTool(
    "search_all",
    {
      title: "全文検索",
      description:
        "DHSJR（資料横断的な漢字音・漢語音データベース）を全フィールド横断で全文検索する。単字・漢語・仮名注・声点・反切・資料名などをまとめて探したいときに使う。注意: 資料名（book_name）も検索対象なので、資料名に頻出する字（經・法など）を渡すと資料名だけが一致した無関係なレコードが大量に返る。単字そのものを調べるなら search_detail の character を使うこと。",
      inputSchema: z.object({
        term: z
          .string()
          .min(1)
          .describe(
            "検索語（漢字・仮名・ローマ字・資料名など）。漢字は旧字体・正字で指定する（経→經）。",
          ),
        ...pagination,
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ term, page, per_page }) => {
      const result = await searchAll(term, page, per_page);
      return recordsResult(result.data, {
        count: result.meta.count,
        page,
        perPage: per_page,
        query: `全文検索「${term}」`,
      });
    },
  );

  server.registerTool(
    "search_detail",
    {
      title: "詳細検索",
      description:
        "フィールドを指定して DHSJR を検索する。単字（character）と資料番号（book_id）は完全一致、その他は部分一致。最低1つの条件が必要。見出しの単字・漢語は旧字体・正字で格納されているため「經」「醫」のように指定する（「経」「医」など新字体では 0 件になる）。",
      inputSchema: z.object({ ...detailFields, ...pagination }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ page, per_page, ...params }) => {
      const conditions = Object.entries(params).filter(([, value]) => value);
      if (conditions.length === 0) {
        return errorResult(
          "検索条件を1つ以上指定してください（character, word, kana, shoten, fanqie, book_id ...）。",
        );
      }

      const result = await search(params as Partial<Inputs>, page, per_page);
      const label = conditions
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      return recordsResult(result.data, {
        count: result.meta.count,
        page,
        perPage: per_page,
        query: `詳細検索（${label}）`,
      });
    },
  );

  server.registerTool(
    "list_books",
    {
      title: "資料一覧",
      description:
        "DHSJR に収録されている資料（資料番号と資料名）の一覧を返す。",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const books = await getBookList();
      const lines = books.map(
        (book) =>
          `${book.book_id} ${book.title ?? ""} ${bookUrl(book.book_id)}`,
      );
      return textResult(
        [`資料 ${books.length}件`, ...lines].join("\n"),
        books.map((book) => ({
          book_id: book.book_id,
          title: book.title,
          url: bookUrl(book.book_id),
          iiif_manifest: manifestOf(book.book_id),
        })),
      );
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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ book_id }) => {
      const book = await getBookData(book_id);
      if (!book) {
        return errorResult(
          `資料 ${book_id} は見つかりませんでした。list_books で資料番号を確認してください。`,
        );
      }

      // raw_markdown は dhsjr://book/{book_id} リソースで返すのでここでは省く。
      const {
        raw_markdown: _rawMarkdown,
        parse_warnings: _parseWarnings,
        source_hash: _sourceHash,
        git_commit: _gitCommit,
        ...rest
      } = book;
      const summary = [
        `${book.title ?? book.book_id}（${book.book_id}）`,
        book.period ? `年代: ${book.period}` : null,
        book.holding_institution ? `所蔵: ${book.holding_institution}` : null,
        bookUrl(book.book_id),
      ]
        .filter(Boolean)
        .join("\n");

      return textResult(summary, {
        ...rest,
        url: bookUrl(book.book_id),
        iiif_manifest: manifestOf(book.book_id),
      });
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
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ book_id, word_index_in_book }) => {
      const records = await getWordRecords(book_id, word_index_in_book);
      if (records.length === 0) {
        return errorResult(
          `漢語 ${book_id}_${word_index_in_book} は見つかりませんでした。`,
        );
      }

      const head = records[0];
      const summary = [
        `${head.word ?? head.word_original ?? ""}（${records.length}字）${wordUrl(book_id, word_index_in_book)}`,
        ...records.map((record, i) => recordLine(record, i + 1)),
      ].join("\n");

      return textResult(summary, {
        book_id,
        word_index_in_book,
        word: head.word,
        word_url: wordUrl(book_id, word_index_in_book),
        records: records.map(compactRecord),
      });
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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ character_id }) => {
      const { data, error } = await supabase
        .from("dhsjr")
        .select("*")
        .eq("ID", character_id)
        .maybeSingle();

      if (error) {
        return errorResult(`取得に失敗しました: ${error.message}`);
      }
      if (!data) {
        return errorResult(`単字ID ${character_id} は見つかりませんでした。`);
      }

      const record = rowToDhsjr(data);
      return textResult(recordLine(record), compactRecord(record));
    },
  );

  server.registerResource(
    "book-bibliography",
    new ResourceTemplate("dhsjr://book/{book_id}", {
      list: async () => {
        const books = await getBookList();
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
          const books = await getBookList();
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
      const book = bookId ? await getBookData(bookId) : null;
      if (!book) {
        throw new Error(
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
