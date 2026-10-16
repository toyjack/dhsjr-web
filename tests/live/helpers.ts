// Shared helpers for the live (read-only) tests. These talk to the database
// configured in .env through the anon key, the same path the Web UI uses.

export const LIVE = process.env.DHSJR_LIVE_TESTS === "1";
export const SKIP_REASON = LIVE
  ? false
  : "set DHSJR_LIVE_TESTS=1 to run read-only tests against the configured Supabase project";

type OrderedRow = {
  character_id: string;
  book_id: string | null;
  index_in_book: number;
};

/** True when rows are in (book_id, index_in_book, character_id) order. */
export function isDetailOrder(rows: OrderedRow[]) {
  return rows.every((row, i) => {
    if (i === 0) return true;
    const prev = rows[i - 1];
    const a = prev.book_id ?? "";
    const b = row.book_id ?? "";
    if (a !== b) return a < b;
    if (prev.index_in_book !== row.index_in_book) {
      return prev.index_in_book < row.index_in_book;
    }
    return prev.character_id < row.character_id;
  });
}

let nextId = 1;

/** Call the /api/mcp route handler in-process with one JSON-RPC request. */
export async function callMcpTool(name: string, args: object) {
  const { POST } = await import("@/app/api/mcp/route");
  const res = await POST(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: nextId++,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    }),
  );
  const text = await res.text();
  const json = (res.headers.get("content-type") ?? "").includes(
    "text/event-stream",
  )
    ? JSON.parse(
        text
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .at(-1)
          ?.slice(5) ?? "null",
      )
    : JSON.parse(text);
  const result = json.result as {
    content: { type: string; text: string }[];
    isError?: boolean;
  };
  const payload = result.content[1]?.text;
  return {
    isError: result.isError ?? false,
    summary: result.content[0]?.text ?? "",
    json: payload ? JSON.parse(payload) : undefined,
  };
}
