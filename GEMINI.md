# About This Project

This is a Next.js web application for the "dhsjr" project. It appears to be a digital humanities platform for viewing and searching a collection of digitized books and texts. The application uses the International Image Interoperability Framework (IIIF) to display high-resolution manuscript images alongside their transcribed text content.

The application is internationalized, supporting at least Japanese, Chinese, and English.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Package Manager**: pnpm
- **Linting**: ESLint

## Key Features

- **Book Viewer**: Displays text content from markdown files located in `contents/books`.
- **IIIF Viewers**: Integrates multiple IIIF image viewers (`clover-viewer`, `iiif-viewer`, `mirador-js`, `tify-viewer`, `uv-viewer`) to display high-resolution source documents.
- **Search**: Provides functionality to search through the text corpus, with dedicated pages for results, characters, and words.
- **Internationalization (i18n)**: Content is localized, with locale files in `src/locales`.
- **Data Management**: Uses scripts (`scripts/gen-book.ts`, `scripts/update-data.ts`) to process and update the content and database.

## Project Structure

- `src/app/[locale]/`: Main application routes, organized by locale.
- `src/components/`: Reusable React components, including the various IIIF viewers.
- `src/lib/`: Core logic, database connection (Prisma), and utility functions.
- `contents/`: Contains the raw data for books (markdown files) and data manifests.
- `prisma/`: Contains the database schema (`schema.prisma`) and migrations.
- `scripts/`: Contains helper scripts for data processing.

## Common Commands

- `pnpm install`: Install dependencies.
- `pnpm dev`: Start the development server.
- `pnpm build`: Build the application for production.
- `pnpm start`: Run the production server.
- `pnpm lint`: Run ESLint to check for code quality issues.
- `npx prisma generate`: Generate the Prisma client after schema changes.
- `npx prisma migrate dev`: Run database migrations.
- `pnpm exec ts-node scripts/update-data.ts`: Execute the data update script.
