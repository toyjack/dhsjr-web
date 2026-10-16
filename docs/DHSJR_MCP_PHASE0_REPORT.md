# DHSJR MCP 改进项目 — Phase 0 审查与基线报告

**对应规格书：** [DHSJR_MCP_DEVELOPMENT.md](DHSJR_MCP_DEVELOPMENT.md)
**审查日期：** 2026-10-16
**审查对象：** `main` @ `7ae849e`（工作区仅有未跟踪的 `docs/`）
**本阶段性质：** 只读审查。未修改任何业务代码、数据库、部署配置；未提交、未建分支。

---

## 0. 结论摘要

| 优先级 | 结论 |
|---|---|
| **P0 已用测试确认** | `search()`（Web 详细检索 + MCP `search_detail` 共用）没有 `ORDER BY`，分页会**重复和遗漏记录**。`character=東`（252 件，每页 20）翻完全部页面只得到 170 个不同 ID（82 条重复、82 条从未出现）；Web「この資料の全レコード」按钮的场景 `book_id=20-002-01`（2917 件，每页 1000）只得到 2002 个不同 ID，**915 条记录从未显示**。生产 MCP 对同一条件返回的第 1 页，与本地对同一数据库取得的第 1 页内容完全不同。 |
| P0 已确认（目前未触发） | `search_all` 的 ilike 回退与 PGroonga 语义差异很大（`経` 835 vs 2938、`きやう` 1463 vs 5406、`平 上` 0 vs 604），且排序不同；回退时不会向调用方提示。回退的 `.or()` 字符串可被 `,` `)` 改变查询结构。 |
| P1 已确认 | 无 `structuredContent`/`outputSchema`（SDK 已支持）；生产环境返回相对 URL；LIKE 通配符 `% _ *` 未写入说明（按 D2 保留行为）；`search_detail` 越界页返回错误；Web 全文检索选 1000 件/页直接报错（生产已复现）；工具说明中的示例资料编号 `10-001-01` 不存在。 |
| 已验证、非缺陷 | 新/旧字体：行为与现有说明一致（`search_all` 归一化、`search_detail` 只按正字见出し完全匹配；Web 相同）。`search_all` 分页完整（東 721 件全部取回，无重复）。 |
| 工程基线 | `tsc` 通过、`pnpm build` 通过；`pnpm lint` **失败**（缺 `eslint.config.*`，既有问题）；仓库**没有任何自动化测试**。 |

---

## 1. 审查范围与方法

- 读取：`src/lib/{db,books,field-mapping,supabase,utils,atoms}.ts`、`src/lib/mcp/*`、`src/app/api/mcp/route.ts`、`src/app/[locale]/**/page.tsx`、全部搜索/分页组件、`supabase/functions/*.sql`、`src/types*.ts`、`scripts/update-data.ts`、`package.json`、配置文件，以及已安装的 `@modelcontextprotocol/server` 与 `mcp-handler` 源码。
- 运行时基线（全部只读）：
  - 业务层：用 `.env` 的 **anon key** 直接调用 `db.ts` / `books.ts` 的函数（与 Web、MCP 同一路径）。约 100 次有界查询，无写操作。
  - MCP 层：在进程内调用 `/api/mcp` 的 route handler（JSON-RPC：`initialize`、`tools/list`、`resources/templates/list`、`tools/call` ×19、`resources/read` ×2）。
  - 生产 MCP：通过本会话已连接的 DHSJR connector 调用 3 次（`search_all` 1 次、`search_detail` 2 次）。本地 `.env` 指向的数据库与生产返回的件数和记录一致，判断为同一数据库。
  - 生产 Web：3 次 `GET /results?...`。
  - IIIF：对 19 个 manifest URL 各 GET 一次。
- **未使用** `.env` 中的 `DB_URL`（直连凭据，会绕过 RLS）。因此无法读取线上函数定义、索引和 RLS 策略，见 §5。
- 测试数据均为线上实时数据，未使用快照；件数在数据更新后可能变化。

### 环境

| 项目 | 版本 |
|---|---|
| Node / pnpm | 24.19.0 / 10.11.1 |
| Next.js | 15.5.7 |
| `@modelcontextprotocol/server` | 2.0.0（握手协商出的协议版本 `2025-06-18`） |
| `mcp-handler` | 2.1.1（stateless，与路径无关） |
| `@supabase/supabase-js` | 2.87.1 |
| zod | 4.5.4 |
| `dhsjr` 表（anon 可见） | 387,268 行 |
| `dhsjr-books` 表 | 73 条；`dhsjr` 中实际出现的资料编号 74 个 |

---

## 2. 架构与检索调用链

```
Web
  SearchAllForm ──/results?query=…&page=1&perPage=N──┐
  SearchDetailedForm ──/results?character=…&…──────────┤
  SearchWordInBookBtn ──/results?book_id=…─────────────┤
                                                       ▼
  results/page.tsx ── query 有值 → searchAll(term, Number(page), Number(perPage))
                   └─ 否则      → search(searchParams as Inputs, Number(page), Number(perPage))
  character/[charID]/page.tsx ── 直接 supabase.from("dhsjr").eq("ID")
  word/[wordID]/page.tsx      ── getWordRecords(bookId, wordIndex)
  book(s)/page.tsx            ── books.ts（Supabase 表 "dhsjr-books"）+ contents/manifest.ts

MCP  (/api/mcp → mcp-handler → @modelcontextprotocol/server, stateless)
  search_all     → searchAll()            ┐
  search_detail  → search()               ├─ src/lib/db.ts（与 Web 共用）
  get_word       → getWordRecords()       ┘
  get_character  → supabase.from("dhsjr").eq("ID")（register.ts 内直接查询）
  list_books / get_book / dhsjr://book/{id} → src/lib/books.ts
  格式化 → src/lib/mcp/format.ts（摘要文本块 + JSON 文本块）

searchAll()
  rpc search_dhsjr_all_fields_by_word + rpc count_dhsjr_all_fields_by_word（串行两次调用）
  └ 错误信息命中 3 个特定字符串时 → searchAllFallback()：11 列 .or(ilike)
```

字段语义（`db.ts` 实测）：

| 参数 | 列 | 匹配 | 备注 |
|---|---|---|---|
| `character` | 単字_見出し | `eq` 完全一致 | 只有正字见出し；出現形不可检索（Web 同） |
| `book_id` | 資料番号 | `eq` 完全一致 | `20-002` 不匹配 `20-002-01` |
| `word` `kana` `word_kana` `shoten` `shoten_word` `fanqie` `ruion` `book_name` `etc` `notes` | 各列 | `ilike %v%` | 未转义；`平` 同时命中 `平濁`、`平軽`、`〔朱〕平` |
| 排序 | — | **无** | 见 ISSUE-001 |

列类型：`資料番号` text（形如 `NN-NNN-NN`，字典序 = 数值序）、`資料内漢字番号` bigint 非空、`資料内漢語番号` text、`ID` text（`update-data.ts` 的 upsert 冲突键）。抽样 `20-002-01` 前 1000 行：`ID = 資料番号 + "-" + 6 位补零的資料内漢字番号`，`資料内漢字番号` 在资料内唯一。

---

## 3. Web / MCP 功能对照表

| Web 功能 | Web 实现 | MCP 对应 | 差异 / 结论 |
|---|---|---|---|
| 全文检索 | `SearchAllForm` → `searchAll` | `search_all` | 同一函数。每页件数：Web 50/100/200/500/**1000**（1000 报错），MCP 1–50（默认 20） |
| 详细检索 | `SearchDetailedForm`：character, word, book_id（下拉）, shoten, shoten_word, kana, word_kana, fanqie, ruion, etc, notes | `search_detail` | MCP 为超集（多 `book_name`）。Web 下拉只列 `dhsjr-books` 的 73 种资料 |
| 结果列表 | `ResultsTable`：ID、资料名、所在、字+声点/仮名注+反切/類音、语+声点型/仮名型 | 摘要行 + JSON | JSON 含全部非空字段；摘要行缺 `shoten_word`、`position_in_book` |
| 分页 | `PaginationPanel`、`PerPageSetting` | `page`/`per_page`/`total_pages` | 共享 ISSUE-001 |
| 单字详情 | `/character/[id]`：全部字段 + 资料链接 + IIIF 图标 | `get_character` | MCP 不返回 `iiif_manifest`；空字段被省略 |
| 汉语详情 | `/word/[book]_[idx]`：词级字段 + 构成字表 | `get_word` | 数据等价（逐字记录含全部字段）；顶层缺 `book_name`、`word_original`、`word_kana`、`shoten_word`、`book_url` |
| 资料详情 | `/book/[id]`：书志各项 + IIIF Viewer +「全レコード」按钮 | `get_book` + `dhsjr://book/{id}` | MCP 为超集；「全レコード」= `search_detail book_id` |
| 资料一览 | `/books`：ID、名称、IIIF 有无 | `list_books` | 等价（MCP 多给 manifest URL） |
| IIIF 浏览 | Tify / Mirador | 仅 manifest URL | 按设计 |
| 出現形检索 | 无 | 无 | 两侧都没有；按规格 4.2 不新增参数 |

**结论：** 目前不存在 Web 能做而 MCP 做不到的检索能力；问题集中在共用查询层的正确性和 MCP 输出质量上。

---

## 4. 问题清单

状态说明：**测试确认** = 本次实际执行并复现；**代码确认** = 代码中可直接看到，未单独执行；**待验证** = 本次条件下无法确认。

### P0

| ID | 状态 | 内容 | 证据 | 影响范围 | 涉及代码 |
|---|---|---|---|---|---|
| ISSUE-001 | **测试确认** | `search()` 无排序，range 分页重复/遗漏 | `character=東` 252 件/每页 20：取回 252 行，唯一 ID 170（82 重复、82 缺失）。`book_id=20-002-01` 2917 件/每页 1000：唯一 2002（**915 条缺失**）。顺序随时间变化：本地第 1 页以 `50-041-01-*` 开头，生产 MCP 稍后返回的第 1 页以 `20-043-01-000005` 开头（同一数据库，件数均为 252）。短时间内连续请求同一页 3 次结果相同。原因推测为不同 offset/limit 下执行计划不同或并行扫描，未用 `EXPLAIN` 确认；结论（必须显式排序）不受影响 | Web 详细检索、「全レコード」按钮、MCP `search_detail` | `src/lib/db.ts:110-176` |
| ISSUE-005 | **测试确认**（回退目前未触发） | ilike 回退与 PGroonga 语义不等价，且不告知调用方 | 件数对比见下表；排序：PGroonga 按命中列优先级，回退只按 资料番号/資料内漢字番号（`東` 首 8 条完全不同）。回退 `.or()` 未加引号：`a,b` → 报错且 message 为空；`東)` → 252 件，与只按 `単字_見出し` 匹配「東」的件数相同，说明 `)` 截断了 OR 条件 | `search_all`（Web + MCP），仅在 PGroonga 不可用时 | `src/lib/db.ts:28-63` |

ISSUE-005 件数对比（`search_all` 11 列）：

| 检索词 | PGroonga | ilike 回退 |
|---|---|---|
| 東 | 721 | 721 |
| 経 / 經 | 2938 / 2938 | 835 / 2913 |
| 医 / 醫 | 414 / 414 | 298 / 388 |
| キヤウ / きやう | 5406 / 5406 | 3599 / 1463 |
| `平 上`（含空格） | 604（PGroonga 查询语法：空格 = AND） | 0（字面子串） |

### P1

| ID | 状态 | 内容 | 证据 | 涉及代码 |
|---|---|---|---|---|
| ISSUE-002 | 测试确认 | 无 `outputSchema` / `structuredContent` | `tools/list` 6 个工具均无 outputSchema；所有结果 `structuredContent` 缺失。已安装 SDK 2.0.0 支持二者：有 outputSchema 时会校验 structuredContent（不符则返回错误）；structuredContent 必须是对象（数组会被包成 `{result: …}`，影响 `list_books`） | `src/lib/mcp/format.ts`、`register.ts` |
| ISSUE-003 | 测试确认（已测量） | 摘要 + JSON 双重输出 | `search_all 東 per_page=50`：响应 33,898 B（摘要 4,732 字 + JSON 20,200 字）；`per_page=20`：13,791 B；`get_book 20-002-01`：10,045 B；`list_books`：11,871 B；`tools/list`：5,351 B | `format.ts` |
| ISSUE-004 | **生产确认** | URL 为相对路径 | 生产 connector 返回 `"url":"/character/20-043-01-000005"`，说明生产未设置 `NEXT_PUBLIC_SITE_URL`。`mcp-handler` 已有从 `x-forwarded-host/proto` 推导公开 origin 的逻辑可参考 | `format.ts:5` |
| ISSUE-007a | 测试确认；按 D2 保留行为，Phase 4 写入说明 | LIKE 通配符未转义，也未写入说明 | `search_detail kana="%"`、`"_"`、`"*"` 均为 276,867 件（= kana 非空的全部行）。PostgREST 把 ASCII `*` 当 `%`。数据中的占位符是全角 `＊`（仮名型 18,337 行含 `＊`，含 ASCII `*` 的为 0 行）。**另见下方 NEW-5** | `db.ts:121-150` |
| ISSUE-007b | 测试确认 | `search_detail` 越界页报错，`search_all` 返回空页 | `character=東 page=99` → `isError` "Search failed: Requested range not satisfiable"；`search_all 東 page=9999` → 0 条 + count 721 | `db.ts:156-162` |
| ISSUE-007c | 测试确认 | 空白/异常输入的错误不规范 | `search_all term=" "` 通过 schema（`min(1)`）后由数据库报 "search_query must not be empty"；`search_detail kana=" "` 被当作字面空格（0 件）；检索词无长度上限；错误文本直接透出 PostgREST/SQL 消息（无密钥泄露） | `register.ts`、`db.ts` |
| NEW-1 | **生产确认** | Web 全文检索选择「1000件表示」直接报错 | RPC `page_size` 上限 500；`/results?query=東&page=1&perPage=1000` 显示「検索中にエラーが発生しました」 | `per-page-setting.tsx`、SQL |
| NEW-2 | 测试确认 | Web 结果页缺少 `page`/`perPage` 参数时异常 | `Number(undefined)` = NaN：详细检索显示「252件」但 0 行（生产 `/results?character=東` 复现）；全文检索 NaN 经 JSON 变为 null → SQL `LIMIT NULL`，**返回全部命中**（`東)` 11 件全部返回）。常见词的手写 URL 可造成大结果集 | `results/page.tsx:35-46`、SQL |
| NEW-3 | 测试确认 | 工具说明的示例资料编号不存在 | `10-001-01` 在 `dhsjr` 与 `dhsjr-books` 中均无记录，`get_book 10-001-01` → not found。AI 可能照抄 | `register.ts:65,162,206` |
| NEW-4 | 测试确认 | PGroonga 查询语法未说明 | 空格 = AND、`OR`、`-`、括号有特殊含义（`(` 7730 件、`東)` 11 件、`平 上` 604 件）。现有说明称「部分一致」，与实际不符 | `register.ts`、`route.ts` |
| NEW-5 | 观察确认 | 客户端把 `＊` 显示为 ASCII `*` | 本会话的 DHSJR connector 工具 schema 中，`word_kana`/`shoten_word` 的描述显示为 `*`（源码为全角 `＊`）。AI 照抄 `*` 会触发 ISSUE-007a 的通配符，返回全部记录 | `register.ts:51,61` |
| NEW-6 | 代码确认 | 服务故障被伪装成空结果/未找到 | `getBookList()` 出错返回 `[]` → `list_books` 显示「資料 0件」；`getBookData()` 任何错误都返回 null → 「見つかりませんでした」 | `src/lib/books.ts` |

### P2

| ID | 状态 | 内容 |
|---|---|---|
| NEW-7 | 测试确认 | 资料主表与数据不一致（数据问题，非代码）：`30-026-05`（貞享版四座講式，1930 行）与 `50-035-03`（論語_龍谷大学図書館_枝賢元亀三年点，1159 行）有数据无书志；`50-035-02`（論語）有书志和龍谷大学 manifest 但无数据。疑似 `50-035-02`/`50-035-03` 编号错位，需数据负责人确认。影响：`list_books` 漏 2 种、`book_url` 指向不存在页面、Web 下拉不可选 |
| NEW-8 | 代码确认 | Web 结果页把 `hakase` 等 `search()` 不处理的参数也算作检索条件 → 无过滤，返回全表计数 |
| NEW-9 | 测试确认 | 不存在的资源 `dhsjr://book/NOPE` 返回 JSON-RPC `-32603`（内部错误），而非“资源不存在” |
| NEW-10 | 测试确认 | `position_in_book` 各资料格式不同：`0101b9`、`001_012_a_03`、`涅08ウ04`、`2-27b2`、`K0912542`、`32ウ2`、`663l`。是资料内定位字符串，**不是**页码或 Canvas 序号；目前没有任何到 Canvas 的映射 |
| NEW-11 | 测试确认 | `pnpm lint` 失败（ESLint 9.38 找不到 `eslint.config.*`）；Biome 在 `atoms.ts`/`books.ts`/`supabase.ts`/`utils.ts` 报 4 个既有格式问题（MCP 与 `db.ts` 文件无问题） |
| NEW-12 | 代码确认 | `CLAUDE.md` 称书目来自 `contents/books.json`，实际来自 Supabase `dhsjr-books` 表；`db.ts` 的 `getWord()` 未被使用；`searchAll` 两次 RPC 串行执行 |

### 已验证、不是缺陷

| 项目 | 结果 |
|---|---|
| ISSUE-006 新旧字体 | `search_all`：経/經 均 2938、医/醫 均 414，首页 ID 完全一致。`search_detail character`：経 0 / 經 1177、医 0 / 醫 170，与工具说明一致，Web 相同。`単字_出現形=経` 331 行，见出し全部是 `經`（`医` 122 行全部为 `醫`），即「原文字形」与「检索用正字」在数据里已分列保存，MCP 两者都返回。`search_detail kana` 不做假名统一（キヤウ 1657 / きやう 772），`search_all` 统一（均 5406）。建议仅改进说明（Phase 4），不做规范化 |
| `search_all` 分页 | `東` 每页 50 × 15 页 = 721 行，721 个唯一 ID。抽样 250 行中 (资料番号, 資料内漢字番号) 无并列 |
| 只读性（代码层） | 6 个工具和资源只调用 `select` / `rpc`（两个 RPC 均为 `STABLE`）。数据库层权限见 §5 |

---

## 5. 待验证风险（本次无法确认）

| 风险 | 原因 | 所需条件 |
|---|---|---|
| 线上 SQL 是否与仓库 `search_all_fields_by_word.sql` 一致 | anon 读不到函数定义。旁证：线上错误消息与仓库一致（`page_size must be between 1 and 500`、`search_query must not be empty`） | 已授权（D7）：Phase 1 第 0 步用 `DB_URL` 在只读事务中查看 `pg_get_functiondef` |
| RLS / anon 权限是否严格只读 | 不能在生产上尝试写入来验证 | 数据库负责人确认 `dhsjr`、`dhsjr-books` 对 anon 仅有 SELECT |
| 新增 `ORDER BY` 的性能 | 不知道是否有 (資料番号, 資料内漢字番号) 索引。目前大结果集计数很快（`shoten=平` 41,629 件约 90 ms） | 已授权（D7）：Phase 1 第 0 步查看索引并对新排序做只读 `EXPLAIN`；修改前后用同一组查询测时 |
| T17 数据库故障 / 超时 | 不能在生产上制造故障 | Phase 2 用错误的 URL/key 在本地模拟 |
| ChatGPT 等其他客户端 | 本会话无法访问 | 记为**未测试** |
| 分页测试的严格可重复性 | 无快照或测试库，用的是线上实时数据 | 数据更新期间可能出现跨页变化（规格 8.2） |

---

## 6. 基线测试结果

除特别注明外均在本地经共用业务层（anon key）对线上数据执行。「基线」= 记录当前行为，供 Phase 1 之后回归对比。

| ID | 条件 | 期望 | 实际 | 判定 |
|---|---|---|---|---|
| T01 | `search_all 東` / `search_detail character=東` | 有结果 | 721 / 252 | 通过 |
| T02 | 経 vs 經 | 全文检索归一；详细检索仅正字 | 2938=2938（首页一致）；0 / 1177 | 通过（符合说明） |
| T03 | 医 vs 醫 | 同上 | 414=414；0 / 170 | 通过（符合说明） |
| T04 | `search_detail word=經典` | 有结果 | 115 | 通过 |
| T05 | `kana=キヤウ` / `きやう` | — | 详细 1657 / 772；全文 5406 / 5406 | 基线（详细检索不统一假名） |
| T06 | `shoten=平` | 部分一致 | 41,629（`eq 平` 为 23,309；含 平濁/平軽/〔朱〕平） | 基线（需在说明中写清） |
| T07 | `fanqie=紅反` | 部分一致 | 19（含 `〔右〕古紅反`） | 通过 |
| T08 | `book_name=論語` | 部分一致 | 4333 | 通过 |
| T09 | `book_id=20-002-01` / `20-002` | 完全一致 | 2917 / 0 | 通过 |
| T10 | `book_id=20-002-01` AND `shoten=平` | AND | 625 | 通过 |
| T11 | `search_detail character=東` 每页 20 全取 | 252 个唯一 ID | 170 唯一、82 重复、82 缺失 | **不通过**（ISSUE-001） |
| T11b | `book_id=20-002-01` 每页 1000 全取（Web 按钮场景） | 2917 唯一 | 2002 唯一 | **不通过**（ISSUE-001） |
| T11c | `search_all 東` 每页 50 全取 | 721 唯一 | 721 唯一 | 通过 |
| T12 | 不存在的词 | 0 件、非错误 | 两种检索均 0 件 | 通过 |
| T13 | 不存在的 `character_id` | 明确的 not found | `isError` + 「見つかりませんでした」 | 通过（无机器可读错误码） |
| T14 | `% _ *` / `,` `(` / 回退 `a,b` `東)` | 查询结构不变（按 D2，通配符保留） | 通配符生效（全部命中，按 D2 为保留行为）；回退报错或结构被改变 | **不通过**（回退部分，ISSUE-005） |
| T15 | 19 个 IIIF manifest | 可访问 | 19/19 HTTP 200 `application/json`（只验证可达，未校验内容） | 通过 |
| T16 | `get_word 30-010-01 / 1029`（方等經典） | 按资料内顺序 | 經(pos 3, #2419)、典(pos 4, #2420) | 通过 |
| T17 | 数据库故障 / 超时 | 明确错误 | — | **未测试** |
| W1 | 生产 Web `query=東&perPage=1000` | 显示结果 | 错误提示 | **不通过**（NEW-1） |
| W2 | 生产 Web `/results?character=東`（无 page） | 显示结果 | 「252件」+ 空表 | **不通过**（NEW-2） |
| M1 | MCP `initialize` / `tools/list` / `resources/templates/list` | 6 个工具 + 1 个模板 | 符合 | 通过 |
| M2 | MCP schema 校验（`per_page=51`、`page=0`） | 拒绝 | `isError` "Input validation error…" | 通过 |
| M3 | 生产 connector（Claude）调用 `search_all`、`search_detail` | 可调用 | 可调用；URL 为相对路径 | 部分通过（ISSUE-004） |
| M4 | ChatGPT 客户端 | — | — | **未测试** |
| B1 | `pnpm exec tsc --noEmit` | 通过 | exit 0 | 通过 |
| B2 | `pnpm build` | 通过 | exit 0 | 通过 |
| B3 | `pnpm lint` | 通过 | ESLint 配置缺失，exit 2 | **不通过**（既有，NEW-11） |
| B4 | 自动化测试 | — | 仓库中不存在测试 | 无 |

延迟（本机 → Supabase，单次，仅供参考）：`search_all` 100–330 ms；`search_detail` 30–210 ms；11 列 ilike 回退计数 165–835 ms。

---

## 7. Phase 1 实施计划（等待确认）

**目标：** 修复检索正确性，不改变已批准的检索规则。工作分支 `feat/mcp-phase1-search-correctness`（D8）；不合并到 `main`，不 push，不部署。

| # | 文件 | 改动 |
|---|---|---|
| 0 | —（不改文件） | 用 `DB_URL` 在 READ ONLY 事务中做只读诊断（D7）：线上 `search_dhsjr_all_fields_by_word` 定义是否与仓库一致、`dhsjr` 的索引、新排序的 `EXPLAIN`。不执行任何 DDL/DML；如需索引，只提交 SQL 方案和影响分析 |
| 1 | `src/lib/db.ts` | `search()` 增加确定性排序 `資料番号 ASC, 資料内漢字番号 ASC, ID ASC`（D1；与 `search_all` 同层顺序一致，`ID` 作为唯一的最终键）；回退 `searchAllFallback()` 加上 `ID` 作为最终键 |
| 2 | `src/lib/db.ts` | 新增纯函数：分页参数规范化（缺失/NaN/非正整数 → 默认值，上限截断）、PostgREST `.or()` 值加引号（修复回退的结构注入，但**保留** `%` `_` `*` 的通配符含义，D2）、条件值 `trim`（纯空白视为未指定）。LIKE 通配符不转义（D2） |
| 3 | `src/lib/db.ts` | `search()` 越界页：捕获 PostgREST "range not satisfiable"，返回空 `data` + 正确 `count`（与 `searchAll` 一致） |
| 4 | `src/lib/db.ts`、`src/types.ts` | `SearchResults.meta` 增加可选字段 `backend: "pgroonga" \| "ilike_fallback"`（只增不改，Web 不受影响）。保留回退（D3）；MCP 侧的警告文字放到 Phase 2 |
| 5 | `src/app/[locale]/results/page.tsx` | 使用第 2 项的分页规范化，修复 NEW-2；全文检索每页件数在迁移执行前先截断到 500，迁移后放开到 1000（D5） |
| 6 | `supabase/migrations/<日期>_search_all_stable_order.sql`（新文件，**不执行**） | `ORDER BY match_rank, 資料番号, 資料内漢字番号, ID`；`page_number`/`page_size` 为 NULL 时报错；`page_size` 上限改为 1000（D5）。PGroonga 查询语法保持不变（D4）。由您在 Supabase 上执行 |
| 7 | `tests/`（新）、`package.json` | 用 Node 内置 `node:test` + 已有的 `tsx`，**不新增依赖**。`pnpm test` 只跑纯函数单元测试；`pnpm test:live`（需 `DHSJR_LIVE_TESTS=1`，只用 anon key，D6）跑线上只读集成测试：T01–T16、分页完整性（T11/T11b/T11c）、Web 与 MCP 同条件对比（同一函数 + 进程内 MCP handler，比较件数、ID、顺序） |

Phase 1 不涉及：MCP 输出格式（Phase 2）、URL 绝对化（Phase 3）、工具说明与 Web 检索说明（Phase 4：NEW-3/4/5，以及把 `%` `_` `*` 通配符、PGroonga 查询语法写入说明，并说明占位符是全角 `＊`、ASCII `*` 会当通配符）、资料主表数据（NEW-7，需要数据负责人处理）。

验收：T11/T11b 唯一 ID 数 = count；T14 不再改变查询结构；W1/W2 正常；其余 T 项与本基线一致；`tsc`、`build` 通过；排序前后测时对比写入报告。

---

## 8. 风险

| 风险 | 说明 | 对策 |
|---|---|---|
| Web 结果顺序变化 | 详细检索从“物理顺序”变为按资料号/资料内编号排序。这是 ISSUE-001 要求的变化，用户可以看到 | 在 Phase 1 报告中注明 |
| 排序带来的性能下降 | 大结果集（如 `kana` 部分一致 27 万行）每次翻页都要排序；若无合适索引可能触及语句超时 | 前后测时；若变慢，先给出索引 SQL 和影响分析，由您决定是否执行 |
| 保留通配符后 AI 误用 | AI 可能把全角 `＊` 抄成 ASCII `*`，命中全部记录（NEW-5） | 按 D2 保留通配符；Phase 4 在工具说明中写明，并考虑在结果件数异常大时给出警告 |
| `trim` 改变语义 | 前后空格目前按字面匹配（` 東` 为 0 件） | 影响很小，列入 Phase 1 |
| SQL 迁移需要人工执行 | 在执行之前 `search_all` 没有 ID 最终键（抽样未发现并列，实际风险低）；D5 依赖迁移 | 迁移与代码向后兼容，可以分开上线 |
| 线上集成测试不稳定 | 数据更新会改变件数 | 断言用“唯一 ID 数 = count”这类不变式，不写死件数 |
| Phase 2 的 outputSchema 校验 | schema 与实际输出不一致时，SDK 会让整个调用返回错误 | Phase 2 用契约测试覆盖每个工具 |

---

## 9. 决定记录（2026-10-16 确认）

| # | 问题 | 决定 | 对计划的影响 |
|---|---|---|---|
| D1 | 详细检索的排序键 | `資料番号, 資料内漢字番号, ID` | §7 第 1 项 |
| D2 | `%` `_` `*` 通配符 | **保留通配符行为并写入说明**（未采纳“转义”建议） | §7 第 2 项不转义；Phase 4 在工具说明和 Web 上说明；ISSUE-007a 改为“已知且保留的行为”，T14 中通配符部分不再作为缺陷 |
| D3 | 全文检索的 ilike 回退 | 保留回退，并明确标注所用后端 | §7 第 2、4 项；Phase 2 在 MCP 结果中给出警告 |
| D4 | PGroonga 查询语法（空格=AND 等） | 保留语法，写入说明 | SQL 不改查询解析；Phase 4 写入说明 |
| D5 | Web 全文检索每页 1000 | SQL 上限改为 1000（迁移由您执行），执行前代码先截断到 500 | §7 第 5、6 项 |
| D6 | 线上只读测试 | 允许，需显式开启（`DHSJR_LIVE_TESTS=1`，只用 anon key） | §7 第 7 项 |
| D7 | `DB_URL` 只读诊断 | 允许，仅在 READ ONLY 事务中查看函数定义、索引和 `EXPLAIN` | §7 第 0 项；不执行 DDL/DML |
| D8 | 分支与提交 | 新建 `feat/mcp-phase1-search-correctness`，规格书和本报告作为首个 commit，之后每阶段一个 commit；不合并 `main`、不 push | Phase 1 开始时执行 |

另有两件不属于本项目代码范围、需要您处理的事：NEW-7（资料主表 3 个编号不一致）和生产环境设置 `NEXT_PUBLIC_SITE_URL=https://dhsjr.kojisho.com`（Phase 3 也会在代码中加入按请求推导 origin 的回退）。

---

# Phase 1 实施结果（2026-10-16）

分支 `feat/mcp-phase1-search-correctness`（未合并、未 push、未部署）。数据库只读；SQL 迁移只写成文件，**未执行**。

## 1. 第 0 步：只读诊断（D7）

用 `DB_URL` 连接，所有语句都在 `BEGIN READ ONLY … ROLLBACK` 中执行（`transaction_read_only = on`），未执行任何 DDL/DML。

| 项目 | 结果 |
|---|---|
| 版本 | PostgreSQL 15.8，PGroonga 3.2.5（`extensions` schema） |
| 线上函数与仓库 SQL | `search_dhsjr_all_fields_by_word`、`count_dhsjr_all_fields_by_word` 的函数体与 `supabase/functions/search_all_fields_by_word.sql` **完全一致**（忽略空白和注释），`search_path = public, extensions` 已设置 |
| `dhsjr` 的索引 | 主键 btree `("ID")`，以及 3 个 PGroonga 索引（全字段、`仮名型`、`漢語_見出し`）。**`資料番号`、`単字_見出し` 没有 btree 索引** |
| 排序键唯一性（全表 387,268 行） | `(資料番号, 資料内漢字番号)` 共 387,268 个不同值（全部唯一）；`資料番号` 无 NULL；**所有行**的 `ID` 都等于 `資料番号-` 加 6 位补零的 `資料内漢字番号`；`資料内漢字番号` 最大 77,588 |
| ISSUE-001 的成因 | 不排序时执行计划为顺序扫描，部分为并行扫描（`Gather workers=2`），行的返回顺序随请求变化，因此 offset 分页会重复和遗漏 |

`EXPLAIN ANALYZE`（数据库内执行时间）：

| 查询 | 现状（无 ORDER BY） | 新排序 | 计划 |
|---|---|---|---|
| `character=東` 第 1 页 / 20 | 3.2 ms | 43.7 ms | 顺序扫描 + top-N heapsort |
| `book_id=20-002-01` 第 2 页 / 1000 | 28.1 ms | 31.1 ms | 并行顺序扫描 + quicksort |
| `shoten ILIKE 平`（4.2 万件）第 1 页 / 100 | 11.8 ms | 28.3 ms | PGroonga 位图扫描 + top-N |
| 同上，第 401 页 | 22.2 ms | 61.8 ms | 外部归并排序 |
| `kana ILIKE %`（27.7 万件）第 1 页 / 100 | 8.3 ms | 82.5 ms | 位图扫描 + 并行 top-N |
| 同上，第 2701 页 | 134.9 ms | 224.1 ms | 外部归并排序 |
| `search_all` 函数体加 `ID` 最终键（東 / 経 / キヤウ） | 31.7 / 34.7 / 54.1 ms | 25.3 / 32.9 / 41.3 ms | 无可测差异 |

结论：新排序最多增加约 90 ms（极深分页约 224 ms），远低于超时，**不需要新增索引**。

## 2. 修改的文件

| 文件 | 改动 |
|---|---|
| `src/lib/search-params.ts`（新） | 不依赖 Supabase 的纯函数：`normalizePagination`、`cleanText`、`detailConditions`（字段→列、完全/部分一致、去空白、忽略未知参数）、`quoteFilterValue` / `globalSearchOrFilter`（回退 `.or()` 加引号）、`isRangeNotSatisfiable`；`GLOBAL_SEARCH_COLUMNS` 从 `db.ts` 移到这里 |
| `src/lib/db.ts` | `search()` 和回退按 `資料番号, 資料内漢字番号, ID` 排序（D1）；越界页返回空页 + 真实件数；分页参数规范化；`searchAll` 每页最多 500（D5，迁移前）；只有空白条件时报错而不是返回全表；`searchAll` 结果带 `meta.backend`（D3） |
| `src/types.ts` | `SearchResults.meta.backend?: "pgroonga" \| "ilike_fallback"`（可选字段） |
| `src/lib/mcp/register.ts` | `search_detail` 用 `detailConditions` 判断条件是否为空并生成标签（去掉首尾空白） |
| `src/app/[locale]/results/page.tsx` | 用同一个解析函数判断是否有检索条件 |
| `supabase/migrations/20261016000000_search_all_stable_order.sql`（新，**未执行**） | 只改 3 处：`ORDER BY` 末尾加 `d."ID"`；`page_number`/`page_size` 为 NULL 时报错；`page_size` 上限 500 → 1000。已与线上定义逐行比对，没有其他差异 |
| `tests/unit/search-params.test.ts`、`tests/live/*.ts`（新） | 见 §3 |
| `package.json` | 新增 `test`、`test:live` 脚本（无新依赖） |
| `CLAUDE.md` | 测试命令、排序说明、`search-params.ts` 与迁移的说明 |

## 3. 测试结果

| 测试 | 结果 |
|---|---|
| `pnpm test`（单元测试，无数据库） | **13/13 通过** |
| `DHSJR_LIVE_TESTS=1 pnpm test:live`（线上只读，约 100 次请求） | **21/21 通过** |
| 红灯检查：同一组线上测试换回修改前的 `db.ts` | 21 项中 12 项失败（T11、T11b、越界页、缺少分页参数、1000 件/页、空白条件、去空白、Web/MCP 结果一致性等），说明测试能检出原问题 |
| 不设置 `DHSJR_LIVE_TESTS` | 5 个测试组全部跳过并显示原因 |
| `tsc --noEmit` | 通过 |
| `pnpm build` | 通过 |
| Biome（`db.ts`、`search-params.ts`、`register.ts`、`tests/`） | 通过。`results/page.tsx`、`types.ts` 在修改前就未按 Biome 格式化，为避免无关改动没有重排 |
| `pnpm lint` | 仍然失败（缺少 ESLint 配置，既有问题，未处理） |

线上测试覆盖的基线项与结果：

| 基线 ID | Phase 0 | Phase 1 |
|---|---|---|
| T11 `character=東` 每页 20 | 170/252 唯一 | 252/252 唯一，按排序键有序 |
| T11b `book_id=20-002-01` 每页 1000 | 2002/2917 唯一 | 2917/2917 唯一 |
| T11c `search_all 東` 每页 50 | 721/721 | 721/721（未退化） |
| 越界页（`search_detail` 第 99 页） | 错误 | 空页 + 正确件数 |
| W1 全文检索 1000 件/页 | 错误 | 按 500 件/页返回（迁移后可到 1000） |
| W2 缺少 `page`/`perPage` | 有件数无记录；全文检索返回全部命中 | 第 1 页、每页 100 件 |
| 回退 `.or()` 中的 `)` `,` | 结构被改变 / 报错 | 作为值的一部分（`東)zzz` → 0 件，无报错） |
| Web 与 MCP 同条件结果 | 顺序不稳定，无法逐条对比 | `search_detail` 第 1/2/13 页、`search_all` 第 1/2 页的件数、ID、顺序完全一致 |
| D2 通配符保留 | — | `kana="%"` 件数 = `仮名注` 非空行数 |
| 新/旧字体 | — | `search_all` 経=經；`search_detail character=経` 仍为 0（未改变规则） |

端到端延迟（本机 → Supabase，3 次取中位数）：

| 查询 | 修改前 | 修改后 |
|---|---|---|
| 详细 `character=東` 第 1 页 / 20 | 60 ms | 76 ms |
| 详细 `book_id=20-002-01` 第 2 页 / 1000 | 94 ms | 103 ms |
| 详细 `shoten=平` 第 1 页 / 100 | 48 ms | 77 ms |
| 详细 `shoten=平` 第 400 页 / 100 | 61 ms | 108 ms |
| 详细 `kana=キ` 第 1 页 / 100 | 47 ms | 51 ms |
| `search_all 東` 第 1 页 / 20 | 101 ms | 109 ms |

## 4. 兼容性影响

- **Web 详细检索的显示顺序改变**：从不稳定的扫描顺序改为按资料编号、资料内编号排序（ISSUE-001 的修复本身）。
- **MCP**：工具名称、参数、输出格式均不变。`search_detail` 结果顺序同上；越界页从 `isError` 改为空页；只有空白值的参数现在被视为“未指定”（例如 `kana: "  "` 返回“请指定条件”，以前按字面空格检索得到 0 件）；条件值去掉首尾空白（`" 東 "` 与 `"東"` 结果相同）。
- **Web 结果页**：只含未知参数（如 `?hakase=31`）的 URL 现在显示「検索条件が指定されていません」，以前返回全表；全文检索选择 1000 件/页时，在迁移执行前实际按 500 件/页显示，分页数按 500 计算，但下拉框仍显示「1000件表示」。
- 检索规则（字段、完全/部分一致、通配符、PGroonga 语法、字形）均未改变。

## 5. 未完成事项与需要您处理的事

1. **执行迁移**（由您执行）：`supabase/migrations/20261016000000_search_all_stable_order.sql`。执行后我需要做两处后续修改：把 `SEARCH_ALL_MAX_PER_PAGE` 改为 1000，并用新定义更新 `supabase/functions/search_all_fields_by_word.sql`。迁移与当前代码前后兼容，可以分开上线。
2. 回退时的警告还没有显示给 MCP 调用方（`meta.backend` 已有，按计划在 Phase 2 输出）。
3. 仍未测试：T17（数据库故障）、ChatGPT 客户端；RLS / anon 权限仍需数据库负责人确认（不在 D7 授权范围内，未查询）。
4. 既有问题未处理：`pnpm lint` 配置缺失、NEW-7 资料主表编号不一致。
