import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanText,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  detailConditions,
  GLOBAL_SEARCH_COLUMNS,
  globalSearchOrFilter,
  isRangeNotSatisfiable,
  MAX_PER_PAGE,
  normalizePagination,
  quoteFilterValue,
} from "@/lib/search-params";

describe("normalizePagination", () => {
  it("keeps valid positive integers, including numeric strings", () => {
    assert.deepEqual(normalizePagination(3, 50), { page: 3, perPage: 50 });
    assert.deepEqual(normalizePagination("3", "50"), { page: 3, perPage: 50 });
    assert.deepEqual(normalizePagination(["2"], ["200"]), {
      page: 2,
      perPage: 200,
    });
  });

  it("falls back to defaults for missing or invalid values", () => {
    const defaults = { page: DEFAULT_PAGE, perPage: DEFAULT_PER_PAGE };
    for (const bad of [
      undefined,
      null,
      Number.NaN,
      "",
      "abc",
      0,
      -1,
      2.5,
      "1e400",
    ]) {
      assert.deepEqual(normalizePagination(bad, bad), defaults, String(bad));
    }
  });

  it("caps perPage at the given maximum", () => {
    assert.equal(normalizePagination(1, 5000).perPage, MAX_PER_PAGE);
    assert.equal(normalizePagination(1, 1000, 500).perPage, 500);
    assert.equal(normalizePagination(1, 20, 50).perPage, 20);
  });
});

describe("cleanText", () => {
  it("trims and drops blank values", () => {
    assert.equal(cleanText(" 東 "), "東");
    assert.equal(cleanText("　東　"), "東"); // full-width space
    assert.equal(cleanText("   "), undefined);
    assert.equal(cleanText(""), undefined);
    assert.equal(cleanText(undefined), undefined);
    assert.equal(cleanText(1), undefined);
  });

  it("takes the first value of a repeated URL parameter", () => {
    assert.equal(cleanText(["經", "経"]), "經");
  });

  it("keeps wildcard and placeholder characters as they are (D2)", () => {
    assert.equal(cleanText("%"), "%");
    assert.equal(cleanText("＊ト"), "＊ト");
  });
});

describe("detailConditions", () => {
  it("maps fields to columns with exact or partial matching", () => {
    assert.deepEqual(
      detailConditions({ book_id: "20-002-01", character: "東", shoten: "平" }),
      [
        { field: "character", column: "単字_見出し", op: "eq", value: "東" },
        { field: "shoten", column: "声点", op: "ilike", value: "平" },
        { field: "book_id", column: "資料番号", op: "eq", value: "20-002-01" },
      ],
    );
  });

  it("drops blank values and ignores parameters search() does not handle", () => {
    assert.deepEqual(
      detailConditions({
        kana: "  ",
        hakase: "31",
        page: "2",
        perPage: "100",
        query: "東",
      }),
      [],
    );
  });

  it("trims values", () => {
    assert.equal(detailConditions({ character: " 經 " })[0]?.value, "經");
  });

  it("covers every field the Web form and MCP search_detail accept", () => {
    const fields = [
      "character",
      "word",
      "kana",
      "word_kana",
      "shoten",
      "shoten_word",
      "fanqie",
      "ruion",
      "book_name",
      "book_id",
      "etc",
      "notes",
    ];
    const all = Object.fromEntries(fields.map((f) => [f, "x"]));
    assert.deepEqual(
      detailConditions(all).map((c) => c.field),
      fields,
    );
  });
});

describe("PostgREST filter quoting", () => {
  it("wraps values in double quotes and escapes quote and backslash", () => {
    assert.equal(quoteFilterValue("a,b"), '"a,b"');
    assert.equal(quoteFilterValue("東)"), '"東)"');
    assert.equal(quoteFilterValue('a"b\\c'), '"a\\"b\\\\c"');
  });

  it("builds one quoted ilike condition per global search column", () => {
    const filter = globalSearchOrFilter("a,b");
    for (const column of GLOBAL_SEARCH_COLUMNS) {
      assert.ok(filter.includes(`${column}.ilike."%a,b%"`), column);
    }
    assert.equal(filter.split(`.ilike."%a,b%"`).length - 1, 11);
  });
});

describe("isRangeNotSatisfiable", () => {
  it("recognises PostgREST's out-of-range error only", () => {
    assert.equal(isRangeNotSatisfiable({ code: "PGRST103" }), true);
    assert.equal(isRangeNotSatisfiable({ code: "PGRST116" }), false);
    assert.equal(isRangeNotSatisfiable(null), false);
  });
});
