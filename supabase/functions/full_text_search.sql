-- Enable PGroonga extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- Drop existing index if it exists (to recreate with proper tokenizer)
DROP INDEX IF EXISTS pgroonga_dhsjr_fulltext_index;

-- Create PGroonga index with Japanese tokenizer for full-text search on dhsjr table
-- TokenMecab is the recommended tokenizer for Japanese text
-- This index covers multiple text fields for comprehensive search
CREATE INDEX pgroonga_dhsjr_fulltext_index ON dhsjr USING pgroonga (
  (
    COALESCE("単字_見出し", '') || ' ' ||
    COALESCE("漢語_見出し", '') || ' ' ||
    COALESCE("仮名注", '') || ' ' ||
    COALESCE("仮名型", '') || ' ' ||
    COALESCE("声点", '') || ' ' ||
    COALESCE("声点型", '') || ' ' ||
    COALESCE("資料名", '') || ' ' ||
    COALESCE("漢語_alphabet", '') || ' ' ||
    COALESCE("語種", '') || ' ' ||
    COALESCE("反切", '') || ' ' ||
    COALESCE("類音", '') || ' ' ||
    COALESCE("その他", '') || ' ' ||
    COALESCE("備考", '')
  ) pgroonga_text_full_text_search_ops_v2
) WITH (
  tokenizer='TokenMecab',
  normalizers='
    NormalizerNFKC150
    NormalizerTable(
                  "normalized", "${table:public.pgrn_normalizations_index}.normalized",
                  "target", "target"
                )
    '
);

-- Function: Full-text search with pagination and scoring
-- Returns records matching the search query with relevance scores
CREATE OR REPLACE FUNCTION search_dhsjr_fulltext(
  search_query TEXT,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 100
)
RETURNS TABLE (
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
  "備考" TEXT,
  score REAL
)
LANGUAGE SQL
STABLE
AS $$
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
    d."備考",
    pgroonga_score(tableoid, ctid) AS score
  FROM dhsjr AS d
  WHERE (
    COALESCE(d."単字_見出し", '') || ' ' ||
    COALESCE(d."漢語_見出し", '') || ' ' ||
    COALESCE(d."仮名注", '') || ' ' ||
    COALESCE(d."仮名型", '') || ' ' ||
    COALESCE(d."声点", '') || ' ' ||
    COALESCE(d."声点型", '') || ' ' ||
    COALESCE(d."資料名", '') || ' ' ||
    COALESCE(d."漢語_alphabet", '') || ' ' ||
    COALESCE(d."語種", '') || ' ' ||
    COALESCE(d."反切", '') || ' ' ||
    COALESCE(d."類音", '') || ' ' ||
    COALESCE(d."その他", '') || ' ' ||
    COALESCE(d."備考", '')
  ) &@~ search_query
  ORDER BY score DESC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
$$;

-- Function: Count total results for a full-text search query
CREATE OR REPLACE FUNCTION count_dhsjr_fulltext(
  search_query TEXT
)
RETURNS BIGINT
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::BIGINT
  FROM dhsjr AS d
  WHERE (
    COALESCE(d."単字_見出し", '') || ' ' ||
    COALESCE(d."漢語_見出し", '') || ' ' ||
    COALESCE(d."仮名注", '') || ' ' ||
    COALESCE(d."仮名型", '') || ' ' ||
    COALESCE(d."声点", '') || ' ' ||
    COALESCE(d."声点型", '') || ' ' ||
    COALESCE(d."資料名", '') || ' ' ||
    COALESCE(d."漢語_alphabet", '') || ' ' ||
    COALESCE(d."語種", '') || ' ' ||
    COALESCE(d."反切", '') || ' ' ||
    COALESCE(d."類音", '') || ' ' ||
    COALESCE(d."その他", '') || ' ' ||
    COALESCE(d."備考", '')
  ) &@~ search_query;
$$;

-- Function: Search specific field with PGroonga
-- Useful for targeted searches on individual columns
CREATE OR REPLACE FUNCTION search_dhsjr_field(
  field_name TEXT,
  search_query TEXT,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 100
)
RETURNS TABLE (
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
  "備考" TEXT,
  score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
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
      d."備考",
      pgroonga_score(tableoid, ctid) AS score
    FROM dhsjr AS d
    WHERE COALESCE(d.%I, '''') &@~ $1
    ORDER BY score DESC
    LIMIT $2
    OFFSET $3
  ', field_name)
  USING search_query, page_size, (page_number - 1) * page_size;
END;
$$;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION search_dhsjr_fulltext TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_dhsjr_fulltext TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_dhsjr_field TO anon, authenticated;

COMMENT ON FUNCTION search_dhsjr_fulltext IS 'Full-text search across all text fields in dhsjr table using PGroonga with Japanese tokenization';
COMMENT ON FUNCTION count_dhsjr_fulltext IS 'Count total results for a full-text search query';
COMMENT ON FUNCTION search_dhsjr_field IS 'Search a specific field in dhsjr table using PGroonga';
