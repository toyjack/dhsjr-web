import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_MANIFEST } from "../../contents/manifest";

// Checks the IIIF manifests registered in contents/manifest.ts against the
// third-party servers that host them (docs/DHSJR_MCP_PHASE3_DESIGN.md §4).
// Separate switch from the database tests because it calls external hosts.

const SKIP =
  process.env.DHSJR_IIIF_TESTS === "1"
    ? false
    : "set DHSJR_IIIF_TESTS=1 to fetch the registered IIIF manifests";

describe("registered IIIF manifests", { skip: SKIP }, () => {
  for (const { book_id, manifest } of ALL_MANIFEST) {
    it(`${book_id}: reachable Presentation 2/3 manifest whose id is its URL`, async () => {
      const res = await fetch(manifest, {
        headers: { accept: "application/json, application/ld+json" },
        signal: AbortSignal.timeout(30_000),
      });
      assert.equal(res.status, 200);
      const json = (await res.json()) as Record<string, unknown>;
      const context = JSON.stringify(json["@context"] ?? "");
      assert.match(context, /iiif\.io\/api\/presentation\/[23]\/context\.json/);
      assert.match(String(json.type ?? json["@type"]), /^(sc:)?Manifest$/);
      assert.equal(json.id ?? json["@id"], manifest);
    });
  }
});
