-- PGroonga Setup Diagnostic Queries
-- Run these queries in Supabase SQL Editor to check your PGroonga setup

-- 1. Check if PGroonga extension is enabled
SELECT
  extname AS "Extension Name",
  extversion AS "Version",
  CASE
    WHEN extname = 'pgroonga' THEN '✓ Enabled'
    ELSE '✗ Not Found'
  END AS "Status"
FROM pg_extension
WHERE extname = 'pgroonga';

-- If empty result, run: CREATE EXTENSION IF NOT EXISTS pgroonga;

-- 2. Check if PGroonga index exists
SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  indexname AS "Index Name",
  indexdef AS "Index Definition"
FROM pg_indexes
WHERE tablename = 'dhsjr'
  AND indexname LIKE '%pgroonga%';

-- 3. Check if RPC functions exist
SELECT
  proname AS "Function Name",
  pronargs AS "Number of Arguments",
  CASE
    WHEN proname = 'search_dhsjr_fulltext' THEN '✓ Full-text search function exists'
    WHEN proname = 'count_dhsjr_fulltext' THEN '✓ Count function exists'
    WHEN proname = 'search_dhsjr_field' THEN '✓ Field search function exists'
    ELSE proname
  END AS "Status"
FROM pg_proc
WHERE proname LIKE '%dhsjr%';

-- 4. Test full-text search function (should return results if data exists)
-- Replace '春' with a character you know exists in your database
SELECT * FROM search_dhsjr_fulltext('春', 1, 5);

-- 5. Test count function
SELECT count_dhsjr_fulltext('春') AS "Total Results";

-- 6. Test field search (search only in 単字_見出し column)
SELECT * FROM search_dhsjr_field('単字_見出し', '春', 1, 5);

-- 7. Check PGroonga configuration
SELECT
  name AS "Setting",
  setting AS "Value"
FROM pg_settings
WHERE name LIKE '%pgroonga%';

-- 8. Check available tokenizers (should show TokenMecab for Japanese)
SELECT pgroonga_command('tokenizer_list')::json AS "Available Tokenizers";

-- 9. Verify table has data
SELECT COUNT(*) AS "Total Records in dhsjr" FROM dhsjr;

-- 10. Sample data check (to verify columns exist)
SELECT
  "ID",
  "単字_見出し",
  "漢語_見出し",
  "資料名"
FROM dhsjr
LIMIT 3;
