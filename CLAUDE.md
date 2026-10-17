# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multilingual web application for searching Japanese character and word phonetics (漢字音・漢語音) across historical documents from the Heian period to modern times. The database is called DHSJR (資料横断的な漢字音・漢語音データベース).

## Development Commands

### Core Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint linter
- `pnpm test` - Unit tests (`node:test` + tsx, no database)
- `DHSJR_LIVE_TESTS=1 pnpm test:live` - Read-only integration tests against the Supabase project in `.env` (pagination completeness, Web/MCP consistency, MCP contract tests)
- `DHSJR_IIIF_TESTS=1 pnpm test:iiif` - Fetches the IIIF manifests in `contents/manifest.ts` from their third-party hosts and checks they are valid

### Data Management Scripts
- `pnpm data:update` - Import/update character data from TSV files in `contents/data/`
- `pnpm data:gen-book` - Generate `contents/books.json` from `contents/Bibliography.md`
- `pnpm supabase:gen` - Regenerate TypeScript types from database schema into `src/types/supabase.type.ts`

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Database Client**: @supabase/supabase-js
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: Jotai
- **Internationalization**: next-international (ja/en/zh locales)
- **Package Manager**: pnpm
- **Code Quality**: ESLint (linting via `pnpm lint`) + Biome (formatting, import organization)

### Database Architecture

The primary table is `dhsjr`, which stores character and word phonetic data. Key fields include:
- Character information: `character`, `character_original`, `character_id`
- Word information: `word`, `word_original`, `word_alphabet`
- Phonetic annotations: `kana`, `shoten`, `fanqie`, `ruion`, `word_kana`, `shoten_word`
- Book metadata: `book_id`, `book_name`, `index_in_book`
- Additional fields: `word_type`, `pos_in_word`, `hakase`, `etc`, `notes`

Additional tables in the database: `jyobatsu_records`, `kanseki_records`, `normalizations`, `racvyoxv_shogyokuhen`, `tsj_wakun`.

Database connection is managed through a singleton Supabase client in [src/lib/supabase.ts](src/lib/supabase.ts) to prevent connection exhaustion in development.

Generated TypeScript types for the database schema are in [src/types/supabase.type.ts](src/types/supabase.type.ts), including the `Database` interface. Run `pnpm supabase:gen` to regenerate after schema changes.

The `Dhsjr` interface (English field names) and column mapping utilities are in [src/lib/field-mapping.ts](src/lib/field-mapping.ts):
- `Dhsjr` - Interface with English field names for app use
- `DhsjrRow` - Raw database row type (Japanese column names)
- `FIELD_TO_COLUMN` / `COLUMN_TO_FIELD` - Bidirectional English↔Japanese name maps
- `rowToDhsjr()` / `dhsjrToRow()` - Conversion functions between the two representations

### Search System

Search functions in [src/lib/db.ts](src/lib/db.ts):

1. **getBookList()** - Returns the book list from the `dhsjr-books` table (via `books.ts`)
2. **searchAll(term, page, perPage)** - Global search using PGroonga RPC (`search_dhsjr_all_fields_by_word`), with automatic fallback to `ilike` if PGroonga is unavailable
3. **search(params, page, perPage)** - Detailed search with field-specific `ilike` filtering via `Inputs` type, ordered by `資料番号, 資料内漢字番号, ID` (without an explicit order, range pagination repeats and skips rows)
4. **getWord(bookId, wordIndexInBook)** - Fetch a single word record by book ID and word index
5. **getWordRecords(bookId, wordIndexInBook)** - Fetch all character records for a word, ordered by `index_in_book`

All search functions support pagination with configurable `page` and `perPage` parameters. Parameter parsing shared by the Web results page, the MCP tools and `db.ts` lives in [src/lib/search-params.ts](src/lib/search-params.ts) (`normalizePagination`, `detailConditions`, the fallback's `.or()` quoting); it has no Supabase import so it can be unit-tested.

**PGroonga Setup:**
- The RPCs `searchAll` actually calls are defined in [supabase/functions/search_all_fields_by_word.sql](supabase/functions/search_all_fields_by_word.sql). [supabase/functions/full_text_search.sql](supabase/functions/full_text_search.sql) defines a different, unused set (`search_dhsjr_fulltext`).
- `searchAll` searches 11 columns: character/word headwords and surface forms, `word_alphabet`, `kana`, `word_kana`, `fanqie`, `ruion`, `etc`, `notes`. Book name, shoten, shoten_word and hakase are deliberately excluded — a character common in book titles, or a tone value like 平, otherwise floods the results. Rows are ordered by which column matched (character → word → kana → fanqie/ruion → etc/notes), then `book_id`, then `index_in_book`.
- `GLOBAL_SEARCH_COLUMNS` in `search-params.ts` (the `ilike` fallback) must mirror that column list. Fallback results carry `meta.backend = "ilike_fallback"`: they lack variant/kana normalization and match-rank order.
- The RPC caps `page_size` at 500 until [supabase/migrations/20261016000000_search_all_stable_order.sql](supabase/migrations/20261016000000_search_all_stable_order.sql) is applied (raises it to 1000 and adds `ID` as the final sort key); `SEARCH_ALL_MAX_PER_PAGE` mirrors that limit.
- Both functions need `SET search_path = public, extensions`: PGroonga lives in the `extensions` schema and the `anon`/`authenticated` roles have no search_path, so without it every PostgREST call fails with `operator does not exist: text &@~ text` (42883) and silently falls back to `ilike`.
- `&@~` only uses the PGroonga index inside a `WHERE` clause. In a `CASE`, `FILTER` or select-list expression it degrades to a sequential match without the index normalizers (variant-kanji table, `unify_kana`) and under-matches.

### MCP Server

A read-only MCP (Model Context Protocol) server is exposed as a Next.js route handler at `/api/mcp` (Streamable HTTP, via `mcp-handler` + `@modelcontextprotocol/server`). The i18n middleware already excludes `/api`.

- Route: [src/app/api/mcp/route.ts](src/app/api/mcp/route.ts) — also holds the server instructions. Cross-tool rules (variant forms, wildcards, full-text syntax, pagination honesty, sources, error codes) are written there once; tool descriptions in `register.ts` only say what each tool does and how it matches. Claude Code normalises tool descriptions (full-width `＊` becomes `*`) but not the instructions, so symbol-level guidance belongs in the instructions. `tests/live/mcp-contract.test.ts` checks that every book ID used as an example exists and that the texts stay within a size budget
- Tools/resources: [src/lib/mcp/register.ts](src/lib/mcp/register.ts) — `search_all`, `search_detail`, `list_books`, `get_book`, `get_word`, `get_character`, plus the `dhsjr://book/{book_id}` resource template
- Output schemas: [src/lib/mcp/schemas.ts](src/lib/mcp/schemas.ts) — every tool declares an `outputSchema` and returns `structuredContent` as `{ schema_version, kind, meta, data }` (paging, query, backend and `warnings` in `meta`). zod objects publish `additionalProperties: false`, so any new field must be added to the schema; `tests/live/mcp-contract.test.ts` validates real results against the published schema with the SDK's Ajv
- Result formatting: [src/lib/mcp/format.ts](src/lib/mcp/format.ts) — besides `structuredContent`, the text content keeps the original summary block plus the original JSON block (null fields stripped, links attached), unchanged for older clients; `list_books` returns the envelope as its JSON block. `response_mode: "compact"` (search_all, search_detail, get_word) drops the summary lines and `word_url`/`book_url`. `MAX_PER_PAGE` caps a call at 50 records. Claude Code passes only `structuredContent` to the model, so anything the model must see belongs in the envelope (e.g. `meta.warnings`), not only in the summary text
- Errors: [src/lib/mcp/errors.ts](src/lib/mcp/errors.ts) — error results are text starting with `[CODE]` (`EMPTY_QUERY`, `NOT_FOUND`, `SEARCH_FAILED`, `DATABASE_UNAVAILABLE`, `TIMEOUT`) and carry no `structuredContent`; database messages go to the server log only. db/books functions throw `DbError` ([src/lib/db-error.ts](src/lib/db-error.ts)) so failures can be classified
- Tools reuse the existing `src/lib/db.ts` / `src/lib/books.ts` functions — add new capabilities there first, then register them. MCP uses the throwing `fetchBookData` / `fetchBookList`; the Web keeps `getBookData` / `getBookList`, which turn database errors into "not found" / an empty list
- Links in tool results are absolute: `NEXT_PUBLIC_SITE_URL` when set (inlined at build time), otherwise the request's public origin. `route.ts` stores `getPublicOrigin(req)` in an `AsyncLocalStorage` ([src/lib/mcp/request-context.ts](src/lib/mcp/request-context.ts)) that `siteLink()` reads; outside a request (unit tests) links stay relative. Links have no locale prefix (`/en/...` redirects to the unprefixed path)
- Sources (schema 1.1): `get_character` / `get_word` return `data.source` and search results `data.sources` (per book on the page) from `fetchBooksByIds`: title, period, holding, `book_url`, IIIF manifest, `bibliography: "registered" | "missing"`, and `position_note` — the bibliography's `input_notes` lines about 出現位置, quoted verbatim. `position_in_book` is never converted to a page or IIIF canvas. Structured `get_book` omits `references_parsed` (many entries have shifted fields); `references_raw` is the source text
- [.mcp.json](.mcp.json) wires the local dev endpoint for Claude Code

### Internationalization

- Default locale: `ja` (Japanese)
- Supported locales: `ja`, `en`, `zh`
- URL strategy: `rewriteDefault` (default locale has no prefix)
- Client-side: [src/locales/client.ts](src/locales/client.ts) exports `useI18n`, `useCurrentLocale`, `useChangeLocale`
- Server-side: [src/locales/server.ts](src/locales/server.ts) exports `getI18n`, `getScopedI18n`
- Translation files: [src/locales/ja.ts](src/locales/ja.ts), [src/locales/en.ts](src/locales/en.ts), [src/locales/zh.ts](src/locales/zh.ts)
- Middleware: [src/middleware.ts](src/middleware.ts) handles locale detection and routing

### State Management

Global atoms defined in [src/lib/atoms.ts](src/lib/atoms.ts):
- `perPageAtom` - Pagination setting (default: 100)
- `themeAtom` - Theme preference (light/dark)
- `currentIFFFViewerAtom` - IIIF viewer selection (tify/mirador)

Provider hierarchy in [src/app/[locale]/providers.tsx](src/app/[locale]/providers.tsx):
```
JotaiProvider > I18nProviderClient > ThemeProvider
```

### Book Data Management

Book metadata is stored in the Supabase table `dhsjr-books` and accessed via [src/lib/books.ts](src/lib/books.ts):
- `fetchBookData(bookId)` / `fetchBookList()` - Single book / all `book_id` + `title`; throw `DbError` on database errors (used by MCP)
- `getBookData(bookId)` / `getBookList()` - Same, but return `null` / `[]` on errors (used by the Web pages and the layout's search panel)

Columns include `book_id`, `title`, `period`, `holding_institution`, `input_responsible`, `image_info`, `input_notes`, `phonetic_info`, `references_raw`/`references_parsed` and `raw_markdown`. The script that fills this table is not in this repository (`pnpm data:gen-book` writes `contents/books.json`, which the app no longer reads).

### IIIF Manifest Mapping

[contents/manifest.ts](contents/manifest.ts) exports `ALL_MANIFEST` — a static list of `{ book_id, manifest }` objects mapping `book_id` values to their IIIF manifest URLs. Used in book and word detail pages to conditionally show the IIIF viewer icon.

### IIIF Viewers

The application supports viewing IIIF resources using two viewers:
- **Tify** - Lightweight IIIF document viewer
- **Mirador** - Full-featured IIIF viewer

Components in [src/components/iiif-viewer.tsx](src/components/iiif-viewer.tsx), [src/components/tify-viewer.tsx](src/components/tify-viewer.tsx), [src/components/uv-viewer.tsx](src/components/uv-viewer.tsx).

## File Structure Patterns

### App Router Structure
```
src/app/[locale]/
├── layout.tsx - Root layout with header, footer, search panel
├── page.tsx - Home page
├── providers.tsx - Client-side provider setup
├── books/page.tsx - Book list
├── book/[bookID]/page.tsx - Individual book details
├── character/[charID]/page.tsx - Character detail page
├── word/[wordID]/page.tsx - Word detail page
└── results/page.tsx - Search results page
```

### Component Organization
All React components are in [src/components/](src/components/) with descriptive names like `search-panel.tsx`, `results-table.tsx`, `word-cell.tsx`.

### Path Aliases
Use `@/` prefix for imports from `src/` directory (configured in [tsconfig.json](tsconfig.json)).

## Important Conventions

### TypeScript
- Strict mode enabled
- Use explicit types from [src/types.ts](src/types.ts): `Inputs`, `BookList`, `SearchResults`
- Generated database types imported from `@/types/supabase.type`
- `Dhsjr` interface (English field names) imported from `@/lib/field-mapping`
- Always use `rowToDhsjr()` from `@/lib/field-mapping` to convert raw database rows to `Dhsjr`

### Styling
- Use Tailwind utility classes
- DaisyUI components available (configured in [tailwind.config.ts](tailwind.config.ts))
- Theme support: light/dark modes only (no other themes)
- Use `cn()` utility from [src/lib/utils.ts](src/lib/utils.ts) for conditional classes

### Data Scripts
When running `data:update`:
- Reads newest TSV file from `contents/data/`
- Maps Japanese headers to English field names via `HEADER_MAPPING`
- Processes data in batches of 100 using Supabase `upsert` operations
- Uses `onConflict: "character_id"` to handle both new and existing records

### Code Quality
- `pnpm lint` runs ESLint 9 with the flat config in `eslint.config.mjs` (eslint-config-next 16). `next build` lints too, so a rule left at "error" fails the production build; three rules with pre-existing findings are set to "warn" there
- Biome handles formatting (2-space indentation) and import organization; configured in `biome.json`

## Database Environment Variables

Required environment variables (not in repo):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - (Optional) Service role key for server-side operations with elevated privileges

See [.env.example](.env.example) for the template.
