import { AsyncLocalStorage } from "node:async_hooks";

// The public origin of the MCP request being handled, so tool results can carry
// absolute links when NEXT_PUBLIC_SITE_URL is not set (D18,
// docs/DHSJR_MCP_PHASE3_DESIGN.md). Set per request in src/app/api/mcp/route.ts.
const requestOrigin = new AsyncLocalStorage<string>();

export function withRequestOrigin<T>(origin: string, run: () => T) {
  return requestOrigin.run(origin, run);
}

export function currentRequestOrigin() {
  return requestOrigin.getStore();
}
