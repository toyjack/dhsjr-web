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

/** Send one JSON-RPC request to the /api/mcp route handler in-process. */
export async function mcpRequest(
  method: string,
  params: object = {},
  headers: Record<string, string> = {},
) {
  const { POST } = await import("@/app/api/mcp/route");
  const res = await POST(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  const text = await res.text();
  const body = (res.headers.get("content-type") ?? "").includes(
    "text/event-stream",
  )
    ? (text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .at(-1)
        ?.slice(5) ?? "null")
    : text;
  return {
    bytes: Buffer.byteLength(body),
    ...(JSON.parse(body) as {
      result?: Record<string, unknown>;
      error?: { code: number; message: string };
    }),
  };
}

/** Call one tool in-process and split its result into the parts the tests check. */
export async function callMcpTool(
  name: string,
  args: object,
  headers: Record<string, string> = {},
) {
  const { result, bytes } = await mcpRequest(
    "tools/call",
    { name, arguments: args },
    headers,
  );
  const { content, isError, structuredContent } = result as {
    content: { type: string; text: string }[];
    isError?: boolean;
    structuredContent?: Record<string, unknown>;
  };
  const payload = content[1]?.text;
  return {
    bytes,
    isError: isError ?? false,
    content,
    summary: content[0]?.text ?? "",
    json: payload ? JSON.parse(payload) : undefined,
    structured: structuredContent,
  };
}
