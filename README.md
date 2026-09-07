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

各ツールは「人が読める要約」と「JSON」の2つのテキストブロックを返します。1回あたりの取得件数は最大 50 件です。

### クライアントからの接続

Claude Code の場合:

```bash
claude mcp add --transport http dhsjr http://localhost:3000/api/mcp
```

このリポジトリには `.mcp.json`（ローカル開発用の接続設定）を同梱しています。

### 環境変数

`NEXT_PUBLIC_SITE_URL` を設定すると、ツールの結果に含まれるリンクが絶対 URL になります（未設定の場合はサイト相対パス）。
