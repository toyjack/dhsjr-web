DHSJR検索WEBアプリ

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## MCP サーバー

DHSJR の検索機能を読み取り専用の MCP（Model Context Protocol）サーバーとして公開しています。
エンドポイントは Next.js のルートハンドラ（Streamable HTTP）です。

- 実装: [src/app/api/mcp/route.ts](src/app/api/mcp/route.ts) / [src/lib/mcp/](src/lib/mcp/)
- ローカル: `pnpm dev` を起動して `http://localhost:3000/api/mcp`
- 本番: `https://<デプロイ先ドメイン>/api/mcp`

### 提供する機能

| 種別 | 名前 | 内容 |
| --- | --- | --- |
| Tool | `search_all` | 全フィールド横断の全文検索（PGroonga、ページング付き） |
| Tool | `search_detail` | 単字・漢語・仮名注・声点・反切・資料などを指定した詳細検索 |
| Tool | `list_books` | 収録資料（資料番号・資料名）の一覧 |
| Tool | `get_book` | 資料の書誌情報（年代・所蔵・入力情報・IIIF マニフェスト） |
| Tool | `get_word` | 漢語を構成する全漢字レコード |
| Tool | `get_character` | 単字ID から1件の全フィールド |
| Resource | `dhsjr://book/{book_id}` | 各資料の書誌情報（Markdown） |

### 結果の形式

- すべてのツールは `structuredContent` として `{ schema_version: "1.1", kind, meta, data }` を返し、`tools/list` で `outputSchema` を公開しています。
- テキストの content には従来どおり「人が読める要約」と JSON を入れています（古いクライアント向け。`list_books` の JSON は structuredContent と同じ）。
- `meta` には総件数 `count`、`page` / `per_page` / `total_pages`、続きの有無 `has_more` / `next_page`、`warnings` が入ります。全文検索では使われた検索エンジン `backend`（`pgroonga` / `ilike_fallback`）も返します。
- 1回あたりの取得件数は最大 50 件です。`search_all`・`search_detail`・`get_word` は `response_mode: "compact"` で要約行と `word_url` / `book_url` を省けます（研究用フィールドはすべて残ります）。
- `get_character` / `get_word` は出典 `source`、検索結果は資料ごとの `sources`（資料名・年代・所蔵・資料ページ・IIIF マニフェスト、出現位置の書式説明 `position_note`）を返します。
- 詳細検索は 資料番号 → 資料内漢字番号 → ID の順に並び、ページをまたいでも重複・欠落しません。

### エラー

エラーは `isError: true` のテキストで、先頭に `[EMPTY_QUERY]` `[NOT_FOUND]` `[SEARCH_FAILED]` `[DATABASE_UNAVAILABLE]` `[TIMEOUT]` のいずれかが付きます。データベースの内部メッセージは返さず、サーバーログにだけ出力します。引数の誤りは SDK の `Input validation error` になります。

### クライアントからの接続

Claude Code の場合:

```bash
claude mcp add --transport http dhsjr http://localhost:3000/api/mcp
```

このリポジトリには `.mcp.json`（ローカル開発用の接続設定）を同梱しています。接続中のクライアントはツール説明をキャッシュするので、サーバーを更新したら再接続してください。

### 環境変数

ツールの結果に含まれるリンクは絶対 URL です。`NEXT_PUBLIC_SITE_URL` を設定するとその値を、未設定ならリクエストの公開 origin（プロキシのヘッダーまたはリクエスト URL）を使います。`NEXT_PUBLIC_*` はビルド時に埋め込まれます。

### テスト

```bash
pnpm test                              # 単体テスト（データベース不要）
DHSJR_LIVE_TESTS=1 pnpm test:live      # 読み取り専用の統合テスト・MCP 契約テスト（.env の Supabase に接続）
DHSJR_IIIF_TESTS=1 pnpm test:iiif      # 登録済み IIIF マニフェストの確認（外部サーバーに接続）
```

詳しい使い方は [docs/DHSJR_MCP_GUIDE.md](docs/DHSJR_MCP_GUIDE.md) を参照してください。
