import { createMcpHandler } from "mcp-handler";
import { registerDhsjr } from "@/lib/mcp/register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerDhsjr(server);
  },
  {
    serverInfo: { name: "dhsjr", version: "1.0.0" },
    instructions: [
      "DHSJR（資料横断的な漢字音・漢語音データベース）の読み取り専用 MCP サーバー。平安時代から近代までの資料に付された漢字音・漢語音（仮名注・声点・反切・類音など）を検索できる。",
      "",
      "使い分け: 資料名や語をざっくり探すときは search_all、単字や漢語を確実に引くときは search_detail。詳細は get_character / get_word、資料の書誌は list_books / get_book と dhsjr://book/{book_id} リソースを参照する。",
      "",
      "検索時の注意:",
      "1. 見出し（character / word）は旧字体・正字で格納されている。「経」ではなく「經」、「医」ではなく「醫」で検索すること。新字体は出現形（character_original / word_original）にしか現れないことが多く、新字体で検索すると 0 件になる。",
      "2. search_all は資料名（book_name）も検索対象に含む。「經」「法」など資料名に頻出する字を search_all に渡すと、資料名だけが一致した無関係なレコードが大量に返る。単字そのものを調べたいときは search_detail の character を使う。",
      "3. 仮名注・声点には筆色の注記〔墨〕〔朱〕などが前置されることがあり、仮名型・声点型では注記のない位置が ＊ で埋められる。これらは部分一致検索の対象文字列にそのまま含まれる。",
      "4. character と book_id は完全一致、その他のフィールドは部分一致。1回あたり最大 50 件までしか返らないので、件数が多い場合は page を進めるか条件を足す。",
    ].join("\n"),
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
