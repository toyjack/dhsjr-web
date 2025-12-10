# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multilingual web application for searching Japanese character and word phonetics (漢字音・漢語音) across historical documents from the Heian period to modern times. The database is called DHSJR (資料横断的な漢字音・漢語音データベース).

## Development Commands

### Core Development
- `pnpm dev` - Start development server (runs `prisma generate` first)
- `pnpm build` - Build for production (runs `prisma generate` first)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint linter

### Database
- `pnpm studio` - Open Prisma Studio to view/edit database
- `prisma generate` - Generate Prisma Client (automatically run before dev/build)

### Data Management Scripts
- `pnpm data:update` - Import/update character data from TSV files in `contents/data/`
- `pnpm data:gen-book` - Generate `contents/books.json` from `contents/Bibliography_20240515.md`

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: Jotai
- **Internationalization**: next-international (ja/en/zh locales)
- **Package Manager**: pnpm
- **Code Quality**: Biome (linting + formatting)

### Database Architecture

The application uses a single Prisma model `dhsjr` that stores character and word phonetic data. Key fields include:
- Character information: `character`, `character_original`, `character_id`
- Word information: `word`, `word_original`, `word_alphabet`
- Phonetic annotations: `kana`, `shoten`, `fanqie`, `ruion`, `word_kana`, `shoten_word`
- Book metadata: `book_id`, `book_name`, `index_in_book`
- Additional fields: `word_type`, `pos_in_word`, `hakase`, `etc`, `notes`

Database connection is managed through a singleton pattern in [src/lib/prisma.ts](src/lib/prisma.ts) to prevent connection exhaustion in development.

### Search System

Two main search functions in [src/lib/db.ts](src/lib/db.ts):
1. **searchAll()** - Global search across all text fields (character, kana, word, book name, etc.)
2. **search()** - Detailed search allowing field-specific filtering via `Inputs` type

Both support pagination with configurable `page` and `perPage` parameters.

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
- Prisma types imported from `@prisma/client`

### Styling
- Use Tailwind utility classes
- DaisyUI components available (configured in [tailwind.config.ts](tailwind.config.ts))
- Theme support: light/dark modes only (no other themes)
- Use `cn()` utility from [src/lib/utils.ts](src/lib/utils.ts) for conditional classes

### Data Scripts
When running `data:update`:
- Reads newest TSV file from `contents/data/`
- Maps Japanese headers to English field names via `HEADER_MAPPING`
- Processes data in batches of 100 using Prisma transactions
- Uses upsert to handle both new and existing records

### Biome Configuration
- Formatter: 2-space indentation
- Linter: Recommended rules for React and Next.js
- Auto-organizes imports on save
- Run `pnpm lint` to check code quality

## Database Environment Variables

Required environment variables (not in repo):
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database connection for migrations (Supabase-specific)

Recent migration to Supabase is noted in git history.
