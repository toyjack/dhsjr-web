import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import { z } from "zod";
import type { BookSource } from "@/lib/books";
import { DbError } from "@/lib/db-error";
import type { Dhsjr } from "@/lib/field-mapping";
import { classifyError, failureResult } from "@/lib/mcp/errors";
import {
  characterUrl,
  errorResult,
  pageSources,
  pageWarnings,
  positionNote,
  recordSource,
  searchResult,
  wildcardWarnings,
  wordResult,
} from "@/lib/mcp/format";
import { withRequestOrigin } from "@/lib/mcp/request-context";
import { getWordOutput, searchAllOutput } from "@/lib/mcp/schemas";
import { detailConditions } from "@/lib/search-params";

const record = (overrides: Partial<Dhsjr> = {}): Dhsjr => ({
  character_id: "20-002-01-000030",
  book_id: "20-002-01",
  book_name: "医心方_半井家旧蔵",
  index_in_book: 30,
  word_index_in_book: "19",
  character: "微",
  character_original: "微",
  word: "幽微",
  word_original: "幽微",
  word_alphabet: null,
  word_type: null,
  pos_in_word: "2",
  len: null,
  shoten: "平",
  shoten_word: "平平",
  kana: null,
  word_kana: null,
  fanqie: null,
  ruion: null,
  hakase: null,
  etc: null,
  position_in_book: "0101b9",
  notes: null,
  ...overrides,
});

const ishinpo: BookSource = {
  book_id: "20-002-01",
  title: "医心方",
  period: "平安",
  holding_institution: "国立東京博物館",
  input_notes: [
    "出現位置は、「巻、裏表、行数」で示した。",
    "声点は朱筆である。",
  ],
};
const books = new Map([[ishinpo.book_id, ishinpo]]);

const validator = new AjvJsonSchemaValidator();
function assertMatchesSchema(schema: z.ZodType, value: unknown) {
  const jsonSchema = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "output",
  });
  const result = validator.getValidator(jsonSchema as never)(value);
  assert.ok(result.valid, result.valid ? "" : result.errorMessage);
}

describe("classifyError", () => {
  it("separates timeouts, outages and other failures", () => {
    assert.equal(classifyError(new DbError("x", "57014", 500)), "TIMEOUT");
    assert.equal(
      classifyError(new DbError("x", "", 0)),
      "DATABASE_UNAVAILABLE",
    );
    assert.equal(
      classifyError(new DbError("x", "PGRST001", 503)),
      "DATABASE_UNAVAILABLE",
    );
    assert.equal(
      classifyError(new DbError("x", undefined, 502)),
      "DATABASE_UNAVAILABLE",
    );
    assert.equal(
      classifyError(new DbError("x", "42P01", 404)),
      "SEARCH_FAILED",
    );
    assert.equal(classifyError(new Error("boom")), "SEARCH_FAILED");
  });
});

describe("error results", () => {
  it("start with the code and carry no structuredContent", () => {
    const result = errorResult(
      "NOT_FOUND",
      "見つかりませんでした。",
      "確認してください。",
    );
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.equal(
      result.content[0].text,
      "[NOT_FOUND] 見つかりませんでした。 確認してください。",
    );
  });

  it("do not leak database messages (D14)", (t) => {
    t.mock.method(console, "error", () => {});
    const secret = 'relation "dhsjr" does not exist at 10.0.0.1';
    const result = failureResult(
      "search_all",
      new DbError(`Search failed: ${secret}`, "57014", 500),
    );
    assert.match(result.content[0].text, /^\[TIMEOUT\] /);
    assert.ok(!result.content[0].text.includes(secret));
    mock.restoreAll();
  });
});

describe("warnings", () => {
  it("flags wildcard characters in partial-match values only", () => {
    const codes = (params: Record<string, string>) =>
      wildcardWarnings(detailConditions(params)).map((w) => w.code);
    assert.deepEqual(codes({ kana: "%" }), ["WILDCARD_IN_VALUE"]);
    assert.deepEqual(codes({ word_kana: "*ト" }), ["WILDCARD_IN_VALUE"]);
    assert.deepEqual(codes({ kana: "キ_ウ" }), ["WILDCARD_IN_VALUE"]);
    assert.deepEqual(codes({ word_kana: "＊ト" }), []); // full-width placeholder
    assert.deepEqual(codes({ book_id: "20_002" }), []); // exact match
  });

  it("flags an empty page only when there are hits", () => {
    assert.deepEqual(
      pageWarnings(252, 99, 13, 0).map((w) => w.code),
      ["PAGE_OUT_OF_RANGE"],
    );
    assert.deepEqual(pageWarnings(0, 1, 0, 0), []);
    assert.deepEqual(pageWarnings(252, 1, 13, 20), []);
  });
});

describe("searchResult", () => {
  const options = {
    tool: "search_all" as const,
    query: { term: "微" },
    label: "全文検索「微」",
    count: 45,
    page: 1,
    perPage: 20,
    backend: "pgroonga" as const,
    books,
  };

  it("full mode keeps the legacy text and JSON, and adds a valid envelope", () => {
    const result = searchResult([record()], {
      ...options,
      responseMode: "full",
    });
    const legacy = JSON.parse(result.content[1].text);
    assert.deepEqual(Object.keys(legacy), [
      "count",
      "page",
      "per_page",
      "total_pages",
      "records",
    ]);
    assert.equal(legacy.records[0].word_url, "/word/20-002-01_19");
    assert.match(
      result.content[0].text,
      /^全文検索「微」 — 45件ヒット \/ ページ 1\/3（1件表示）（続きあり: page=2）\n1\. 微 /,
    );
    assertMatchesSchema(searchAllOutput, result.structuredContent);
    const meta = (result.structuredContent as { meta: Record<string, unknown> })
      .meta;
    assert.equal(meta.has_more, true);
    assert.equal(meta.next_page, 2);
  });

  it("compact mode drops the per-record lines and link fields only", () => {
    const result = searchResult([record()], {
      ...options,
      responseMode: "compact",
    });
    assert.equal(result.content.length, 2);
    assert.ok(!result.content[0].text.includes("1. 微"));
    assert.deepEqual(
      JSON.parse(result.content[1].text),
      result.structuredContent,
    );
    const [compact] = (
      result.structuredContent as {
        data: { records: Record<string, unknown>[] };
      }
    ).data.records;
    assert.equal(compact.word_url, undefined);
    assert.equal(compact.book_url, undefined);
    assert.equal(compact.position_in_book, "0101b9");
    assert.equal(compact.shoten_word, "平平");
    assertMatchesSchema(searchAllOutput, result.structuredContent);
  });

  it("warns when the ilike fallback produced the rows", () => {
    const result = searchResult([record()], {
      ...options,
      responseMode: "full",
      backend: "ilike_fallback",
    });
    assert.match(result.content[0].text, /⚠ \[FALLBACK_BACKEND\]/);
    assertMatchesSchema(searchAllOutput, result.structuredContent);
  });
});

describe("wordResult", () => {
  it("takes word-level fields from the first record and keeps per-character notes", () => {
    const records = [
      record({
        character_id: "a",
        character: "幽",
        pos_in_word: "1",
        shoten: "平",
        index_in_book: 29,
      }),
      record({
        character_id: "b",
        character: "微",
        pos_in_word: "2",
        shoten: "平",
        index_in_book: 30,
      }),
    ];
    const result = wordResult("20-002-01", "19", records, "full", books);
    const data = (
      result.structuredContent as {
        data: { word: Record<string, unknown>; records: unknown[] };
      }
    ).data;
    assert.equal(data.word.shoten_word, "平平");
    assert.equal(
      data.word.iiif_manifest,
      "https://emuseum.nich.go.jp/iiifapi/100173002/manifest.json",
    );
    assert.equal(data.records.length, 2);
    assert.equal(
      (data as { source?: { title?: string } }).source?.title,
      "医心方",
    );
    assertMatchesSchema(getWordOutput, result.structuredContent);
    const legacy = JSON.parse(result.content[1].text);
    assert.deepEqual(Object.keys(legacy), [
      "book_id",
      "word_index_in_book",
      "word",
      "word_url",
      "records",
    ]);
  });
});

describe("links (D18)", () => {
  it("stay site-relative outside a request", () => {
    assert.equal(characterUrl("x"), "/character/x");
  });

  it("use the request's public origin inside a request", () => {
    const url = withRequestOrigin("https://dhsjr.example.org", () =>
      characterUrl("20-002-01-000030"),
    );
    assert.equal(url, "https://dhsjr.example.org/character/20-002-01-000030");
  });

  it("prefer NEXT_PUBLIC_SITE_URL over the request origin", (t) => {
    const before = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://dhsjr.kojisho.com/";
    t.after(() => {
      if (before === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = before;
    });
    const url = withRequestOrigin("http://localhost:3000", () =>
      characterUrl("x"),
    );
    assert.equal(url, "https://dhsjr.kojisho.com/character/x");
  });
});

describe("sources (D20)", () => {
  it("quote only the input notes about 出現位置, verbatim", () => {
    assert.deepEqual(positionNote(ishinpo.input_notes), [
      "出現位置は、「巻、裏表、行数」で示した。",
    ]);
    assert.equal(positionNote(["声点は朱筆である。"]), undefined);
    assert.equal(positionNote(null), undefined);
  });

  it("mark a book without bibliography but keep its book_url (D19)", () => {
    const source = recordSource(
      { book_id: "30-026-05", book_name: "貞享版四座講式" },
      books,
    );
    assert.deepEqual(source, {
      book_id: "30-026-05",
      book_name: "貞享版四座講式",
      bibliography: "missing",
      book_url: "/book/30-026-05",
    });
  });

  it("list each book of a search page once", () => {
    const sources = pageSources(
      [
        record(),
        record({ character_id: "b" }),
        record({ character_id: "c", book_id: "30-026-05" }),
      ],
      books,
    );
    assert.deepEqual(Object.keys(sources), ["20-002-01", "30-026-05"]);
    assert.equal(sources["20-002-01"].title, "医心方");
    assert.equal(sources["20-002-01"].position_note, undefined);
    assert.equal(sources["30-026-05"].bibliography, "missing");
  });
});
