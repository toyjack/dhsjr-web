-- search_dhsjr_all_fields_by_word の修正（Phase 1, docs/DHSJR_MCP_PHASE0_REPORT.md の D1 / D5）
--
-- 未適用。本番への適用はデータベース管理者が行う。
-- 適用後は supabase/functions/search_all_fields_by_word.sql を同じ定義に更新し、
-- src/lib/search-params.ts の SEARCH_ALL_MAX_PER_PAGE を 1000 に上げる。
--
-- 変更点（それ以外は 2026-10-16 時点の本番定義と同一）:
--   1. ORDER BY の最後に d."ID"（主キー）を追加し、並び順を一意に決める。
--      (資料番号, 資料内漢字番号) は現状すべての行で一意だが、それを前提にしない。
--   2. page_number / page_size が NULL のときもエラーにする。
--      これまでは NULL < 1 が NULL になって検査を素通りし、LIMIT NULL で全件を返していた
--      （Web の結果ページで page / perPage が欠けた URL から到達できた）。
--   3. page_size の上限を 500 → 1000 に上げる（Web の「1000件表示」に合わせる）。
--
-- 戻り値の型・引数・検索対象列・一致順位は変えないので、呼び出し側の変更は不要。
-- count_dhsjr_all_fields_by_word は変更しない。

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

  IF page_number IS NULL OR page_number < 1 THEN
    RAISE EXCEPTION 'page_number must be >= 1, got %', page_number;
  END IF;

  IF page_size IS NULL OR page_size < 1 OR page_size > 1000 THEN
    RAISE EXCEPTION 'page_size must be between 1 and 1000, got %', page_size;
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
  ORDER BY b.match_rank, d."資料番号", d."資料内漢字番号", d."ID"
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_dhsjr_all_fields_by_word TO anon, authenticated;

COMMENT ON FUNCTION public.search_dhsjr_all_fields_by_word IS
  '全文検索。資料名・声点・声点型・節博士は対象外。一致した列の優先度→資料番号→資料内漢字番号→ID の順に並べる。';
