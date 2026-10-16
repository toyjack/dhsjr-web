import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
import { callMcpTool, LIVE, mcpRequest, SKIP_REASON } from "./helpers";

// MCP contract tests (Phase 2, docs/DHSJR_MCP_PHASE2_DESIGN.md).
// structuredContent is checked against the outputSchema published by
// tools/list, with the same JSON Schema validator a strict client would use.

const validator = new AjvJsonSchemaValidator();
const outputSchemas = new Map<string, unknown>();

before(async () => {
  if (!LIVE) return;
  const { result } = await mcpRequest("tools/list");
  const tools = (
    result as { tools: { name: string; outputSchema?: unknown }[] }
  ).tools;
  for (const tool of tools) outputSchemas.set(tool.name, tool.outputSchema);
});

type Call = Awaited<ReturnType<typeof callMcpTool>>;

function assertValid(tool: string, call: Call) {
  assert.equal(call.isError, false, call.summary);
  const schema = outputSchemas.get(tool);
  assert.ok(schema, `${tool} publishes an outputSchema`);
  const result = validator.getValidator(schema as never)(call.structured);
  assert.ok(
    result.valid,
    result.valid ? "" : `${tool}: ${result.errorMessage}`,
  );
}

const ids = (records: { character_id: string }[]) =>
  records.map((r) => r.character_id);

type Envelope = {
  schema_version: string;
  kind: string;
  meta: Record<string, unknown> & { warnings: { code: string }[] };
  data: Record<string, unknown>;
};
const envelope = (call: Call) => call.structured as unknown as Envelope;
const records = (call: Call) =>
  envelope(call).data.records as { character_id: string; word_url?: string }[];
const warningCodes = (call: Call) =>
  envelope(call).meta.warnings.map((w) => w.code);

describe("tools/list", { skip: SKIP_REASON }, () => {
  it("publishes an outputSchema for all six tools", () => {
    assert.deepEqual([...outputSchemas.keys()].sort(), [
      "get_book",
      "get_character",
      "get_word",
      "list_books",
      "search_all",
      "search_detail",
    ]);
    for (const [name, schema] of outputSchemas) assert.ok(schema, name);
  });
});

describe("search_all", { skip: SKIP_REASON }, () => {
  it("full: legacy text/JSON unchanged, envelope valid and consistent", async () => {
    const call = await callMcpTool("search_all", { term: "東" });
    assertValid("search_all", call);
    assert.deepEqual(Object.keys(call.json), [
      "count",
      "page",
      "per_page",
      "total_pages",
      "records",
    ]);
    const env = envelope(call);
    assert.equal(env.kind, "search_results");
    assert.equal(env.meta.response_mode, "full");
    assert.equal(env.meta.backend, "pgroonga");
    assert.equal(env.meta.count, call.json.count);
    assert.deepEqual(ids(records(call)), ids(call.json.records));
    assert.deepEqual(
      records(call),
      call.json.records,
      "full records = legacy records",
    );
    assert.equal(env.meta.has_more, true);
    assert.match(call.summary, /（続きあり: page=2）/);
  });

  it("compact: JSON text equals the envelope, links dropped, smaller payload", async () => {
    const full = await callMcpTool("search_all", { term: "東", per_page: 50 });
    const compact = await callMcpTool("search_all", {
      term: "東",
      per_page: 50,
      response_mode: "compact",
    });
    assertValid("search_all", compact);
    assert.deepEqual(compact.json, compact.structured);
    assert.deepEqual(ids(records(compact)), ids(records(full)));
    assert.ok(records(compact).every((r) => r.word_url === undefined));
    assert.ok(!compact.summary.includes("\n1. "), "no per-record lines");
    assert.ok(compact.bytes < full.bytes, `${compact.bytes} < ${full.bytes}`);
  });

  it("last page has no next_page", async () => {
    const first = await callMcpTool("search_all", { term: "東", per_page: 50 });
    const last = await callMcpTool("search_all", {
      term: "東",
      per_page: 50,
      page: envelope(first).meta.total_pages as number,
    });
    assertValid("search_all", last);
    assert.equal(envelope(last).meta.has_more, false);
    assert.equal(envelope(last).meta.next_page, undefined);
  });
});

describe("search_detail", { skip: SKIP_REASON }, () => {
  it("full: records the applied conditions", async () => {
    const call = await callMcpTool("search_detail", {
      character: " 東 ",
      per_page: 20,
    });
    assertValid("search_detail", call);
    assert.deepEqual(envelope(call).meta.query, {
      conditions: { character: "東" },
    });
    assert.deepEqual(Object.keys(call.json), [
      "count",
      "page",
      "per_page",
      "total_pages",
      "records",
    ]);
  });

  it("past the last page: valid empty page with PAGE_OUT_OF_RANGE", async () => {
    const call = await callMcpTool("search_detail", {
      character: "東",
      page: 99,
    });
    assertValid("search_detail", call);
    assert.equal(records(call).length, 0);
    assert.deepEqual(warningCodes(call), ["PAGE_OUT_OF_RANGE"]);
    assert.match(call.summary, /⚠ \[PAGE_OUT_OF_RANGE\]/);
  });

  it("wildcards in a partial-match value: WILDCARD_IN_VALUE, results unchanged (D2)", async () => {
    const call = await callMcpTool("search_detail", {
      word_kana: "*ト",
      per_page: 1,
      response_mode: "compact",
    });
    assertValid("search_detail", call);
    assert.deepEqual(warningCodes(call), ["WILDCARD_IN_VALUE"]);
    const placeholder = await callMcpTool("search_detail", {
      word_kana: "＊ト",
      per_page: 1,
    });
    assert.deepEqual(warningCodes(placeholder), []);
    assert.ok(
      (envelope(call).meta.count as number) >=
        (envelope(placeholder).meta.count as number),
    );
  });
});

describe(
  "get_word / get_character / get_book / list_books",
  { skip: SKIP_REASON },
  () => {
    it("get_word full and compact", async () => {
      const full = await callMcpTool("get_word", {
        book_id: "30-010-01",
        word_index_in_book: "1029",
      });
      assertValid("get_word", full);
      assert.deepEqual(Object.keys(full.json), [
        "book_id",
        "word_index_in_book",
        "word",
        "word_url",
        "records",
      ]);
      const word = envelope(full).data.word as Record<string, unknown>;
      assert.equal(word.word, "方等經典");
      assert.equal(word.book_name, "阿弥陀経_西本願寺");

      const compact = await callMcpTool("get_word", {
        book_id: "30-010-01",
        word_index_in_book: "1029",
        response_mode: "compact",
      });
      assertValid("get_word", compact);
      assert.deepEqual(compact.json, compact.structured);
      assert.deepEqual(ids(records(compact)), ids(records(full)));
    });

    it("get_character: legacy JSON is the record, envelope adds the manifest", async () => {
      const call = await callMcpTool("get_character", {
        character_id: "20-002-01-000030",
      });
      assertValid("get_character", call);
      assert.deepEqual(envelope(call).data.record, call.json);
      assert.equal(
        envelope(call).data.iiif_manifest,
        "https://emuseum.nich.go.jp/iiifapi/100173002/manifest.json",
      );
    });

    it("get_book: legacy JSON unchanged, structured book without nulls", async () => {
      const call = await callMcpTool("get_book", { book_id: "20-002-01" });
      assertValid("get_book", call);
      assert.ok("heading" in call.json, "legacy JSON keeps null columns");
      const book = envelope(call).data.book as Record<string, unknown>;
      assert.ok(Object.values(book).every((v) => v !== null));
      assert.equal(book.url, call.json.url);
    });

    it("list_books: JSON text block equals the envelope (D12)", async () => {
      const call = await callMcpTool("list_books", {});
      assertValid("list_books", call);
      assert.deepEqual(call.json, call.structured);
      const env = envelope(call);
      assert.equal(env.meta.count, (env.data.books as unknown[]).length);
    });
  },
);

describe("errors", { skip: SKIP_REASON }, () => {
  const expectError = async (name: string, args: object, code: string) => {
    const call = await callMcpTool(name, args);
    assert.equal(call.isError, true);
    assert.equal(call.structured, undefined);
    assert.match(call.summary, new RegExp(`^\\[${code}\\] `));
    return call;
  };

  it("NOT_FOUND for unknown IDs", async () => {
    await expectError(
      "get_character",
      { character_id: "NO_SUCH_ID" },
      "NOT_FOUND",
    );
    await expectError(
      "get_word",
      { book_id: "30-010-01", word_index_in_book: "999999" },
      "NOT_FOUND",
    );
    await expectError("get_book", { book_id: "99-999-99" }, "NOT_FOUND");
  });

  it("NOT_FOUND with a hint when the book has records but no bibliography (NEW-7)", async () => {
    const call = await expectError(
      "get_book",
      { book_id: "30-026-05" },
      "NOT_FOUND",
    );
    assert.match(call.summary, /search_detail の book_id/);
  });

  it("EMPTY_QUERY for blank input", async () => {
    await expectError("search_all", { term: "   " }, "EMPTY_QUERY");
    await expectError("search_detail", { kana: "  " }, "EMPTY_QUERY");
  });

  it("INVALID_ARGUMENT stays the SDK's input validation error", async () => {
    const call = await callMcpTool("search_all", { term: "東", per_page: 51 });
    assert.equal(call.isError, true);
    assert.match(call.summary, /Input validation error/);
  });

  it("an unknown resource is 'not found', not an internal error (NEW-9)", async () => {
    const { error } = await mcpRequest("resources/read", {
      uri: "dhsjr://book/NOPE",
    });
    assert.ok(error);
    assert.notEqual(error.code, -32603);
    assert.match(error.message, /NOPE/);
  });
});
