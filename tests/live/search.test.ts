import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { callMcpTool, isDetailOrder, LIVE, SKIP_REASON } from "./helpers";

// Read-only checks against the live database (D6 in docs/DHSJR_MCP_PHASE0_REPORT.md).
// Assertions use invariants (unique IDs = count, order) instead of fixed counts,
// because the data can be updated between runs.

type Db = typeof import("@/lib/db");
type Params = typeof import("@/lib/search-params");
let db: Db;
let params: Params;

before(async () => {
  if (!LIVE) return;
  db = await import("@/lib/db");
  params = await import("@/lib/search-params");
});

async function allDetailPages(
  condition: Parameters<Db["search"]>[0],
  perPage: number,
) {
  const first = await db.search(condition, 1, perPage);
  const rows = [...first.data];
  const pages = Math.ceil(first.meta.count / perPage);
  for (let page = 2; page <= pages; page++) {
    rows.push(...(await db.search(condition, page, perPage)).data);
  }
  return { count: first.meta.count, rows };
}

describe(
  "search (detail) pagination — ISSUE-001",
  { skip: SKIP_REASON },
  () => {
    it("T11: character=東, 20 per page, returns every record exactly once in order", async () => {
      const { count, rows } = await allDetailPages({ character: "東" }, 20);
      const ids = rows.map((r) => r.character_id);
      assert.ok(count > 20, "needs more than one page to be meaningful");
      assert.equal(rows.length, count);
      assert.equal(new Set(ids).size, count);
      assert.ok(
        isDetailOrder(rows),
        "rows are in (資料番号, 資料内漢字番号, ID) order",
      );
    });

    it("T11b: book_id=20-002-01, 1000 per page (Web 'all records' button)", async () => {
      const { count, rows } = await allDetailPages(
        { book_id: "20-002-01" },
        1000,
      );
      assert.ok(count > 1000);
      assert.equal(new Set(rows.map((r) => r.character_id)).size, count);
      assert.ok(isDetailOrder(rows));
    });

    it("returns the same page for the same request", async () => {
      const a = await db.search({ shoten: "平" }, 3, 50);
      const b = await db.search({ shoten: "平" }, 3, 50);
      assert.deepEqual(
        a.data.map((r) => r.character_id),
        b.data.map((r) => r.character_id),
      );
    });

    it("returns an empty page with the real count past the last page", async () => {
      const first = await db.search({ character: "東" }, 1, 20);
      const beyond = await db.search({ character: "東" }, 9999, 20);
      assert.equal(beyond.data.length, 0);
      assert.equal(beyond.meta.count, first.meta.count);
    });

    it("falls back to page 1 / 100 per page when page and perPage are missing (NEW-2)", async () => {
      const r = await db.search(
        { character: "東" },
        Number(undefined),
        Number(undefined),
      );
      assert.equal(r.meta.page, 1);
      assert.equal(r.meta.perPage, 100);
      assert.equal(r.data.length, Math.min(100, r.meta.count));
    });
  },
);

describe("search (detail) conditions", { skip: SKIP_REASON }, () => {
  it("trims values", async () => {
    const plain = await db.search({ character: "東" }, 1, 1);
    const padded = await db.search({ character: " 東 " }, 1, 1);
    assert.equal(padded.meta.count, plain.meta.count);
  });

  it("refuses a search with only blank conditions instead of returning the whole table", async () => {
    await assert.rejects(
      db.search({ kana: "  " }, 1, 1),
      /no search condition/,
    );
  });

  it("combines conditions with AND", async () => {
    const book = await db.search({ book_id: "20-002-01" }, 1, 1);
    const both = await db.search({ book_id: "20-002-01", shoten: "平" }, 1, 50);
    assert.ok(both.meta.count > 0 && both.meta.count < book.meta.count);
    assert.ok(
      both.data.every(
        (r) => r.book_id === "20-002-01" && r.shoten?.includes("平"),
      ),
    );
  });

  it("keeps headword matching on the standard form (経 0 hits, 經 > 0)", async () => {
    assert.equal((await db.search({ character: "経" }, 1, 1)).meta.count, 0);
    assert.ok((await db.search({ character: "經" }, 1, 1)).meta.count > 0);
  });

  it("keeps ILIKE wildcard semantics for partial-match fields (D2)", async () => {
    const { supabase } = await import("@/lib/supabase");
    const { count: kanaNotNull } = await supabase
      .from("dhsjr")
      .select("ID", { count: "exact", head: true })
      .not("仮名注", "is", null);
    assert.equal(
      (await db.search({ kana: "%" }, 1, 1)).meta.count,
      kanaNotNull,
    );
  });
});

describe("searchAll", { skip: SKIP_REASON }, () => {
  it("T11c: 東, 50 per page, returns every record exactly once", async () => {
    const first = await db.searchAll("東", 1, 50);
    const ids = first.data.map((r) => r.character_id);
    for (let page = 2; page <= Math.ceil(first.meta.count / 50); page++) {
      ids.push(
        ...(await db.searchAll("東", page, 50)).data.map((r) => r.character_id),
      );
    }
    assert.equal(ids.length, first.meta.count);
    assert.equal(new Set(ids).size, first.meta.count);
    assert.equal(first.meta.backend, "pgroonga");
  });

  it("normalises variants (経 = 經)", async () => {
    const a = await db.searchAll("経", 1, 20);
    const b = await db.searchAll("經", 1, 20);
    assert.equal(a.meta.count, b.meta.count);
    assert.deepEqual(
      a.data.map((r) => r.character_id),
      b.data.map((r) => r.character_id),
    );
  });

  it("caps perPage at the RPC limit instead of failing (NEW-1)", async () => {
    const r = await db.searchAll("東", 1, 1000);
    assert.equal(r.meta.perPage, params.SEARCH_ALL_MAX_PER_PAGE);
    assert.ok(r.data.length <= params.SEARCH_ALL_MAX_PER_PAGE);
  });

  it("uses page 1 / 100 per page when page and perPage are missing, not every hit (NEW-2)", async () => {
    const r = await db.searchAll("東", Number(undefined), Number(undefined));
    assert.equal(r.meta.page, 1);
    assert.equal(r.meta.perPage, 100);
    assert.equal(r.data.length, Math.min(100, r.meta.count));
  });

  it("rejects a blank term with a clear message", async () => {
    await assert.rejects(db.searchAll("   ", 1, 20), /search term is empty/);
  });
});

describe("ilike fallback filter — ISSUE-005", { skip: SKIP_REASON }, () => {
  it("keeps reserved characters inside the value", async () => {
    const { supabase } = await import("@/lib/supabase");
    const count = async (term: string) => {
      const { count, error } = await supabase
        .from("dhsjr")
        .select("ID", { count: "exact", head: true })
        .or(params.globalSearchOrFilter(term));
      assert.equal(error, null, `${term}: ${error?.message}`);
      return count ?? 0;
    };
    // Unquoted, "東)" was cut at the parenthesis and matched every 東 headword (252).
    // Quoted, the whole string is the value, which no record contains.
    assert.equal(await count("東)zzz"), 0);
    for (const term of [",", "a,b", "(", '"', "\\", "a.b:c"]) {
      await count(term);
    }
  });
});

describe("Web / MCP consistency", { skip: SKIP_REASON }, () => {
  it("search_detail returns the same records in the same order as search()", async () => {
    for (const page of [1, 2, 13]) {
      const web = await db.search({ character: "東" }, page, 20);
      const mcp = await callMcpTool("search_detail", {
        character: "東",
        page,
        per_page: 20,
      });
      assert.equal(mcp.isError, false);
      assert.equal(mcp.json.count, web.meta.count);
      assert.deepEqual(
        mcp.json.records.map((r: { character_id: string }) => r.character_id),
        web.data.map((r) => r.character_id),
        `page ${page}`,
      );
    }
  });

  it("search_all returns the same records in the same order as searchAll()", async () => {
    for (const page of [1, 2]) {
      const web = await db.searchAll("経", page, 20);
      const mcp = await callMcpTool("search_all", {
        term: "経",
        page,
        per_page: 20,
      });
      assert.equal(mcp.json.count, web.meta.count);
      assert.deepEqual(
        mcp.json.records.map((r: { character_id: string }) => r.character_id),
        web.data.map((r) => r.character_id),
      );
    }
  });

  it("search_detail past the last page is an empty page, not an error", async () => {
    const mcp = await callMcpTool("search_detail", {
      character: "東",
      page: 99,
      per_page: 20,
    });
    assert.equal(mcp.isError, false);
    assert.equal(mcp.json.records.length, 0);
    assert.ok(mcp.json.count > 0);
  });

  it("search_detail with only blank fields asks for a condition", async () => {
    const mcp = await callMcpTool("search_detail", { kana: "  " });
    assert.equal(mcp.isError, true);
    assert.match(mcp.summary, /検索条件を1つ以上指定してください/);
  });

  it("get_word keeps the in-book order", async () => {
    const records = await db.getWordRecords("30-010-01", "1029");
    assert.ok(records.length > 1);
    assert.ok(
      records.every(
        (r, i) => i === 0 || records[i - 1].index_in_book < r.index_in_book,
      ),
    );
  });
});
