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

1. **getBookList()** - Returns static book list from `contents/books.json`
2. **searchAll(term, page, perPage)** - Global search using PGroonga RPC (`search_dhsjr_all_fields_by_word`), with automatic fallback to `ilike` if PGroonga is unavailable
3. **search(params, page, perPage)** - Detailed search with field-specific `ilike` filtering via `Inputs` type
4. **getWord(bookId, wordIndexInBook)** - Fetch a single word record by book ID and word index
5. **getWordRecords(bookId, wordIndexInBook)** - Fetch all character records for a word, ordered by `index_in_book`

All search functions support pagination with configurable `page` and `perPage` parameters.

**PGroonga Setup:**
- SQL setup: [supabase/functions/full_text_search.sql](supabase/functions/full_text_search.sql)
- Documentation: [README_PGROONGA.md](README_PGROONGA.md)

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

Book metadata is stored in `contents/books.json` and accessed via [src/lib/books.ts](src/lib/books.ts):
- `getBookData(bookId)` - Get single book by ID
- `getAllBooksFileNameList()` - Get all book IDs

Book data structure includes: id, title, age, owner, pictures, guide, information, inputor, bibs.

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
- `pnpm lint` runs ESLint (eslint-config-next)
- Biome handles formatting (2-space indentation) and import organization; configured in `biome.json`

## Database Environment Variables

Required environment variables (not in repo):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - (Optional) Service role key for server-side operations with elevated privileges

See [.env.example](.env.example) for the template.
