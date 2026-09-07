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
      "1. 見出し（character / word）は旧字体・正字で格納されている。search_all は全文検索側で異体字を正規化するので「経」でも「經」でも同じ結果になるが、search_detail は部分一致（ilike）なので「經」「醫」と旧字体で指定しないと 0 件になる。新字体は出現形（character_original / word_original）に現れる。",
      "2. search_all の対象は 単字見出し・単字出現形・漢語見出し・漢語出現形・漢語alphabet・仮名注・仮名型・反切・類音・その他・備考 の11フィールド。資料名・声点・声点型・節博士は対象外なので、資料で絞りたいときは search_detail の book_name / book_id（または list_books）、声点で絞りたいときは search_detail の shoten を使う。",
      "3. search_all の結果は「一致したフィールドの優先度（単字 → 漢語 → 仮名 → 反切/類音 → その他/備考）→ 資料番号 → 資料内漢字番号」の順に並ぶ。最初のページほど単字そのものの一致が多い。",
      "4. 仮名注・声点には筆色の注記〔墨〕〔朱〕などが前置されることがあり、仮名型・声点型では注記のない位置が ＊ で埋められる。これらは部分一致検索の対象文字列にそのまま含まれる。",
      "5. character と book_id は完全一致、その他のフィールドは部分一致。1回あたり最大 50 件までしか返らないので、件数が多い場合は page を進めるか条件を足す。",
    ].join("\n"),
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
