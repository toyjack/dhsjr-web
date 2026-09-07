-- 全文検索 RPC（アプリの searchAll / MCP の search_all が呼ぶのはこの2つ）
--
-- 注意: 同ディレクトリの full_text_search.sql は別系統（search_dhsjr_fulltext）の
-- 定義で、アプリからは呼ばれていない。実際に使われているのはこのファイル。
--
-- 検索対象（15列 → 11列に縮小）
--   除外した列とその理由:
--     資料名   … 書名に含まれる字（經・法など）でその資料の全レコードが該当し、
--                「経」で 92256 件中 90000 件超が書名だけの一致になっていた。
--                資料で絞りたいときは search()（詳細検索）の book_name / book_id を使う。
--     声点・声点型・節博士
--              … 値が「平・上・去・入」なので、単字の「平」を検索すると
--                声調注記が 60000 件以上該当した。声点で絞りたいときは詳細検索を使う。
--
-- 並び順: 一致した列の優先度（単字 → 漢語 → 仮名 → 反切/類音 → その他/備考）、
--         同順位内は資料番号・資料内漢字番号の順。
--
-- 実装上の注意:
--   &@~ は WHERE 句に書いたときだけ PGroonga インデックス（normalizers 込み）が使われる。
--   CASE / FILTER / SELECT リストの中で評価すると順次検索にフォールバックし、
--   異体字テーブルや unify_kana の正規化が効かず取りこぼす。そのため優先度は
--   CASE ではなく「層ごとの UNION ALL + min()」で求めている。
--
--   SET search_path = public, extensions は必須。pgroonga 拡張は extensions
--   スキーマにあり、anon / authenticated ロールには search_path が設定されて
--   いないため、これがないと PostgREST 経由の呼び出しが
--   「operator does not exist: text &@~ text」(42883) で失敗する。
--   その場合アプリは db.ts の ilike フォールバックに落ちるので、
--   画面上はエラーにならず件数だけが静かに変わる。

CREATE OR REPLACE FUNCTION public.count_dhsjr_all_fields_by_word(search_query TEXT)
RETURNS BIGINT
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $function$
  SELECT COUNT(*)
  FROM dhsjr AS d
  WHERE
    d."単字_見出し"   &@~ search_query OR
    d."単字_出現形"   &@~ search_query OR
    d."漢語_見出し"   &@~ search_query OR
    d."漢語_出現形"   &@~ search_query OR
    d."漢語_alphabet" &@~ search_query OR
    d."仮名注"        &@~ search_query OR
    d."仮名型"        &@~ search_query OR
    d."反切"          &@~ search_query OR
    d."類音"          &@~ search_query OR
    d."その他"        &@~ search_query OR
    d."備考"          &@~ search_query;
$function$;

CREATE OR REPLACE FUNCTION public.search_dhsjr_all_fields_by_word(
  search_query TEXT,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE(
  "ID" TEXT,
  "資料番号" TEXT,
  "資料名" TEXT,
  "資料内漢字番号" BIGINT,
  "資料内漢語番号" TEXT,
  "単字_見出し" TEXT,
  "単字_出現形" TEXT,
  "漢語_見出し" TEXT,
  "漢語_出現形" TEXT,
  "漢語_alphabet" TEXT,
  "語種" TEXT,
  "漢語内位置" TEXT,
  "単字長" TEXT,
  "声点" TEXT,
  "声点型" TEXT,
  "仮名注" TEXT,
  "仮名型" TEXT,
  "反切" TEXT,
  "類音" TEXT,
  "節博士" TEXT,
  "その他" TEXT,
  "出現位置" TEXT,
  "備考" TEXT
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $function$
BEGIN
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RAISE EXCEPTION 'search_query must not be empty';
  END IF;

  IF page_number < 1 THEN
    RAISE EXCEPTION 'page_number must be >= 1, got %', page_number;
  END IF;

  IF page_size < 1 OR page_size > 500 THEN
    RAISE EXCEPTION 'page_size must be between 1 and 500, got %', page_size;
  END IF;

  RETURN QUERY
  WITH matched AS (
    SELECT d."ID", 1 AS match_rank
    FROM dhsjr AS d
    WHERE d."単字_見出し" &@~ search_query OR d."単字_出現形" &@~ search_query
    UNION ALL
    SELECT d."ID", 2
    FROM dhsjr AS d
    WHERE d."漢語_見出し" &@~ search_query OR d."漢語_出現形" &@~ search_query
    UNION ALL
    SELECT d."ID", 3
    FROM dhsjr AS d
    WHERE d."仮名注" &@~ search_query OR d."仮名型" &@~ search_query
    UNION ALL
    SELECT d."ID", 4
    FROM dhsjr AS d
    WHERE d."反切" &@~ search_query OR d."類音" &@~ search_query
       OR d."漢語_alphabet" &@~ search_query
    UNION ALL
    SELECT d."ID", 5
    FROM dhsjr AS d
    WHERE d."その他" &@~ search_query OR d."備考" &@~ search_query
  ), best AS (
    SELECT m."ID", min(m.match_rank) AS match_rank
    FROM matched AS m
    GROUP BY m."ID"
  )
  SELECT
    d."ID",
    d."資料番号",
    d."資料名",
    d."資料内漢字番号",
    d."資料内漢語番号",
    d."単字_見出し",
    d."単字_出現形",
    d."漢語_見出し",
    d."漢語_出現形",
    d."漢語_alphabet",
    d."語種",
    d."漢語内位置",
    d."単字長",
    d."声点",
    d."声点型",
    d."仮名注",
    d."仮名型",
    d."反切",
    d."類音",
    d."節博士",
    d."その他",
    d."出現位置",
    d."備考"
  FROM best AS b
  JOIN dhsjr AS d ON d."ID" = b."ID"
  ORDER BY b.match_rank, d."資料番号", d."資料内漢字番号"
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_dhsjr_all_fields_by_word TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_dhsjr_all_fields_by_word TO anon, authenticated;

COMMENT ON FUNCTION public.search_dhsjr_all_fields_by_word IS
  '全文検索。資料名・声点・声点型・節博士は対象外。一致した列の優先度→資料番号→資料内漢字番号の順に並べる。';
COMMENT ON FUNCTION public.count_dhsjr_all_fields_by_word IS
  'search_dhsjr_all_fields_by_word と同じ条件での件数。';
