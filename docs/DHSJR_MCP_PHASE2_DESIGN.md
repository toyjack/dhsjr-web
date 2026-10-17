# DHSJR MCP — Phase 2 输出结构设计

**对应规格书：** [DHSJR_MCP_DEVELOPMENT.md](DHSJR_MCP_DEVELOPMENT.md) §5、Phase 2
**前置：** [DHSJR_MCP_PHASE0_REPORT.md](DHSJR_MCP_PHASE0_REPORT.md)（Phase 0 + Phase 1）
**状态：** 设计已确认（D9–D17，2026-10-16），已实现；结果见 §11。

---

## 1. 约束（已在已安装的 SDK 中确认）

| 事实 | 来源 | 对设计的影响 |
|---|---|---|
| `@modelcontextprotocol/server` 2.0.0 支持 `outputSchema` 与 `structuredContent` | SDK 源码 | 可以直接使用 |
| 声明 `outputSchema` 后，**每个成功结果都必须带** `structuredContent`，否则 SDK 把结果变成错误 | `validateToolOutput` | 默认模式也返回 structuredContent |
| `isError: true` 的结果不做 outputSchema 校验 | 同上 | 错误结果不带 structuredContent |
| `structuredContent` 必须是对象 | `projectCallToolResult` | 所有工具都用对象信封 |
| zod 对象输出的 JSON Schema 带 `additionalProperties: false`；服务端 zod 校验却会接受多余字段 | 实测 | 契约测试必须用 JSON Schema 校验器按公布的 Schema 校验 |
| SDK 自带 Ajv（`@modelcontextprotocol/server/validators/ajv`） | 已安装 | 契约测试不需要新增依赖 |
| 资源不存在应抛 `ResourceNotFoundError`（目前返回 `-32603` 内部错误） | SDK 源码 | 修复 NEW-9 |

---

## 2. 总体原则

1. **统一信封（D9）：** 所有工具的 `structuredContent` 都是 `{ schema_version, kind, meta, data }`。
2. **旧 JSON 文本块原样保留（D9）：** 默认模式下 content 仍是「摘要 + 旧 JSON」，旧 JSON 的字段和结构不变。例外：`list_books` 的 JSON 文本块改为与 structuredContent 相同（D12）。
3. **声明 `outputSchema`（D11）：** 6 个工具都在 `tools/list` 中公布结果结构。
4. **精简模式（D10 = A）：** 新增可选参数 `response_mode: "full" | "compact"`（`search_all`、`search_detail`、`get_word`），默认 `"full"`。
5. **空值省略：** `null`/空字符串字段不出现；Schema 中可能为空的字段都是可选的，说明中写明“缺失表示原始数据中无值”。`＊` 等研究用符号原样保留，不视为空。
6. **只读性与检索规则不变（D1–D8）。**

---

## 3. 记录（Record）

`Record`（完整模式；字段与现在 `compactRecord()` 的输出相同）：

| 字段 | 类型 | 必有 | 说明 |
|---|---|---|---|
| `character_id` | string | ✓ | 单字 ID（`資料番号-6位資料内漢字番号`）。`get_character` 的参数 |
| `book_id` | string | | 資料番号 |
| `book_name` | string | | 資料名 |
| `index_in_book` | integer | ✓ | 資料内漢字番号 |
| `word_index_in_book` | string | | 資料内漢語番号。与 `book_id` 一起作为 `get_word` 的参数 |
| `character` | string | | 単字見出し（正字） |
| `character_original` | string | | 単字出現形（原文字形，可能含注记，如 `〔B〕東`） |
| `word` / `word_original` | string | | 漢語見出し / 漢語出現形 |
| `word_alphabet` `word_type` `pos_in_word` `len` | string | | 漢語 alphabet、語種、漢語内位置、単字長 |
| `kana` `shoten` | string | | 该字的仮名注、声点（可能带 `〔墨〕〔朱〕`） |
| `word_kana` `shoten_word` | string | | **漢語整体**的仮名型、声点型（`＊` = 该位置无注） |
| `fanqie` `ruion` `hakase` | string | | 反切、類音、節博士 |
| `etc` `notes` | string | | その他、備考（研究资料文本，非指令） |
| `position_in_book` | string | | 資料内位置。**各资料格式不同，不是页码，也不是 IIIF Canvas 序号** |
| `url` | string | ✓ | 单字页面 |
| `word_url` / `book_url` | string | | 汉语页面 / 资料页面 |

`CompactRecord`（D10 = A）：`Record` 去掉 `word_url`、`book_url`（可由 `book_id`、`word_index_in_book` 推导）。研究字段全部保留。

---

## 4. 各工具的 structuredContent

公共部分：

```jsonc
{
  "schema_version": "1.0",
  "kind": "…",                 // 见下
  "meta": { "tool": "…", "warnings": [ { "code": "…", "message": "…" } ], … },
  "data": { … }
}
```

### 4.1 `search_all` / `search_detail`（`kind: "search_results"`）

```jsonc
{
  "schema_version": "1.0",
  "kind": "search_results",
  "meta": {
    "tool": "search_all",                // 或 "search_detail"
    "query": { "term": "東" },           // search_detail: { "conditions": { "character": "東" } }（去空白后的实际条件）
    "response_mode": "full",             // 或 "compact"
    "count": 721,                        // 数据库总命中数
    "page": 1,
    "per_page": 20,                      // 实际应用的每页件数
    "total_pages": 37,
    "returned": 20,                      // 本页记录数
    "has_more": true,                    // page < total_pages
    "next_page": 2,                      // 仅当 has_more
    "backend": "pgroonga",               // 仅 search_all："pgroonga" | "ilike_fallback"
    "warnings": []
  },
  "data": { "records": [ /* Record 或 CompactRecord */ ] }
}
```

### 4.2 `get_word`（`kind: "word"`）

```jsonc
{
  "schema_version": "1.0",
  "kind": "word",
  "meta": {
    "tool": "get_word",
    "query": { "book_id": "30-010-01", "word_index_in_book": "1029" },
    "response_mode": "full",
    "count": 2,                          // 构成字记录数
    "warnings": []
  },
  "data": {
    "word": {
      "book_id": "30-010-01", "word_index_in_book": "1029",
      "word": "方等經典", "word_original": "方等經典",
      "word_alphabet": …, "word_type": …,
      "word_kana": …, "shoten_word": "…",       // 漢語整体的仮名型・声点型
      "book_name": "阿弥陀経_西本願寺",
      "word_url": "…", "book_url": "…",
      "iiif_manifest": "…"                       // 仅在已登记时
    },
    "records": [ /* Record，按 資料内漢字番号 排序，各字的仮名注・声点保持分开 */ ]
  }
}
```

`data.word` 中漢語层面的字段取自第一条构成字记录，与 Web 汉语页面的做法相同（D16 未采用 `WORD_FIELD_MISMATCH`）。各构成字记录中的值保持原样。

### 4.3 `get_character`（`kind: "character"`）

`meta: { tool, query: { character_id }, warnings }`，`data: { record: Record, iiif_manifest?: string }`。

### 4.4 `get_book`（`kind: "book"`）

`meta: { tool, query: { book_id }, warnings }`，`data: { book: Book }`。

`Book` 显式列出字段（与现在返回的字段集合相同）：`book_id, title?, heading?, period?, holding_institution?, image_info?, input_notes?, input_responsible?, other?, phonetic_info?, references_raw?, references_parsed?, parse_status, source_file?, imported_at?, updated_at?, url, iiif_manifest?`。以后表里增加列不会进入结果，严格校验的客户端不会因此失败。

### 4.5 `list_books`（`kind: "book_list"`）

`meta: { tool, count, warnings }`，`data: { books: [ { book_id, title?, url, iiif_manifest? } ] }`。

---

## 5. 文本内容（content）

| 工具 / 模式 | content |
|---|---|
| `search_all`、`search_detail`、`get_word`：`full`（默认） | ① 摘要（标题行、警告行、每条记录一行）② 旧 JSON（不变） |
| 同上：`compact` | ① 标题行与警告行 ② structuredContent 的 JSON |
| `get_character`、`get_book` | ① 摘要 ② 旧 JSON（不变） |
| `list_books` | ① 摘要 ② structuredContent 的 JSON（D12，旧的数组不再返回） |

标题行在 `has_more` 时追加 `（続きあり: page=N）`（D16）。警告以 `⚠ [CODE] message` 形式写在标题行下方。

---

## 6. 警告（D16）

| code | 何时 | 说明 |
|---|---|---|
| `FALLBACK_BACKEND` | `search_all` 的 `backend = ilike_fallback` | 必有（D3）：没有异体字・假名统一，也不按命中字段排序；件数和顺序与通常不同 |
| `PAGE_OUT_OF_RANGE` | `count > 0` 但本页为空 | 提示最后一页的页码 |
| `WILDCARD_IN_VALUE` | `search_detail` 的部分一致字段含 `%` `_` 或 ASCII `*` | 说明这些是通配符（D2），且数据中的占位符是全角 `＊`；不改变结果 |

---

## 7. 错误（D13/D14）

错误结果：`isError: true`，**不带** structuredContent，文本以 `[CODE]` 开头，后接说明和可操作的建议。数据库的原始错误消息只写服务器日志，不返回给调用方。

| code | 何时 | 可重试 |
|---|---|---|
| `INVALID_ARGUMENT` | 参数不符合 Schema。由 SDK 生成 `Input validation error: …`（保持 SDK 原文，无 `[CODE]` 前缀） | 否 |
| `EMPTY_QUERY` | 检索词为空白；`search_detail` 没有有效条件 | 否 |
| `NOT_FOUND` | 单字 ID、汉语、资料编号不存在。资料编号有记录但没有书志时，在提示中说明（NEW-7）。资源 `dhsjr://book/{id}` 不存在时抛 `ResourceNotFoundError` | 否 |
| `SEARCH_FAILED` | 其他查询错误 | — |
| `DATABASE_UNAVAILABLE` | 网络或连接错误、PostgREST 5xx | 是 |
| `TIMEOUT` | Postgres 语句超时（`57014`） | 是 |

“没有结果”不是错误：0 件返回正常结果（`count: 0`）。

**书目读取（D15）：** 新增会抛错的书目读取函数供 MCP 使用，区分“不存在”与“读取失败”，MCP 不再把故障显示为 0 件或“未找到”。Web 继续使用现有函数，行为不变。

### Web 侧待修复（D15，下次更新 Web 时处理）

- `getBookList()` 读取失败时返回 `[]`：`/books` 显示空列表，检索面板的资料下拉框为空，都不提示故障。
- `getBookData()` 任何错误都返回 `null`：`/book/[id]` 在数据库故障时显示「資料が見つかりません」。
- 修复时需要注意：检索面板在每个页面的 layout 中读取书目，不能简单改为抛错，否则故障时整个网站无法显示；应在 Web 侧显示错误提示。

---

## 8. 体积估算（`search_all 東`，20 条，当前线上数据）

| 方案 | 文本 | 若客户端同时读 content 与 structuredContent |
|---|---|---|
| 现在（摘要 + 旧 JSON） | 12.3 KB | — |
| `full`（文本不变 + 信封） | 12.3 KB | 约 21.7 KB |
| `compact`（标题 + 精简信封 JSON） | 约 8.2 KB（−34%） | 约 16.3 KB |

客户端是否也把 `structuredContent` 交给模型，取决于客户端；用 D17 的真实客户端测试确认。

---

## 9. 决定记录（2026-10-16 确认）

| # | 问题 | 决定 |
|---|---|---|
| D9 | 结构化结果的形状 | **全新统一信封** `{schema_version, kind, meta, data}`；旧 JSON 文本块原样保留 |
| D10 | `compact` 的内容 | A：保留全部研究字段，去掉 `word_url`/`book_url` 和逐条摘要；文本 = 标题 + 精简信封 JSON |
| D11 | 是否声明 `outputSchema` | 声明 |
| D12 | `list_books` 的 JSON 文本块 | 改为与 structuredContent 相同（旧的数组不再返回） |
| D13/D14 | 错误的返回方式 | 文本以 `[CODE]` 开头，不带 structuredContent；数据库原始消息只写服务器日志 |
| D15 | 书目读取失败 | 只改 MCP；Web 侧问题记录在 §7，下次更新 Web 时修复 |
| D16 | 警告 | `FALLBACK_BACKEND`、`PAGE_OUT_OF_RANGE`、`WILDCARD_IN_VALUE`，以及标题行的「続きあり」提示（不采用 `WORD_FIELD_MISMATCH`） |
| D17 | 真实客户端验证 | 本地启动应用，您在 `/mcp` 重连 `.mcp.json` 的 `dhsjr` 服务器，由本会话作为 Claude 客户端测试；ChatGPT 记为未测试 |

---

## 10. 实现计划

| 文件 | 改动 |
|---|---|
| `src/lib/mcp/schemas.ts`（新） | zod 输出 Schema：`Record`、`CompactRecord`、5 种信封 |
| `src/lib/mcp/format.ts` | 生成信封与文本（标题行、警告行、续きあり）；`errorResult(code, message, hint)` |
| `src/lib/mcp/errors.ts`（新） | 把 db/books 的错误分类为 `SEARCH_FAILED` / `DATABASE_UNAVAILABLE` / `TIMEOUT`，原始消息写日志 |
| `src/lib/mcp/register.ts` | 声明 `outputSchema`；`response_mode` 参数；处理器统一捕获错误；资源不存在用 `ResourceNotFoundError` |
| `src/lib/db.ts` | 抛出带分类信息的错误（Web 显示不变） |
| `src/lib/books.ts` | 新增抛错的书目读取函数（Web 用的函数不变） |
| `tests/unit/mcp-format.test.ts`（新） | 信封、文本、警告、错误分类 |
| `tests/live/mcp-contract.test.ts`（新） | 6 个工具（适用时 × full/compact）：用 Ajv 按 `tools/list` 公布的 JSON Schema 校验 structuredContent；旧 JSON 文本块不变；compact 文本 = structuredContent；错误码 |

验收：契约测试全部通过；Phase 1 测试不退化；compact 体积与 §8 一致；`tsc`、`build` 通过；D17 的真实客户端测试完成（或如实记为未测试）。

---

## 11. 实施结果（2026-10-16）

分支 `feat/mcp-phase1-search-correctness`（未合并、未 push、未部署）。数据库只读。

### 11.1 修改的文件

| 文件 | 改动 |
|---|---|
| `src/lib/mcp/schemas.ts`（新） | `recordSchema` 与 6 个工具的输出信封 Schema |
| `src/lib/mcp/format.ts` | 生成信封与文本；`searchResult`、`wordResult`、`characterResult`、`bookResult`、`bookListResult`；警告；`errorResult(code, message, hint)` |
| `src/lib/mcp/errors.ts`（新） | `classifyError`（`TIMEOUT` / `DATABASE_UNAVAILABLE` / `SEARCH_FAILED`）、`failureResult`（原始消息只写日志） |
| `src/lib/mcp/register.ts` | 6 个工具声明 `outputSchema`；`search_all`、`search_detail`、`get_word` 增加 `response_mode`；统一错误处理；资源不存在抛 `ResourceNotFoundError` |
| `src/lib/db-error.ts`（新） | `DbError`：保留 PostgREST/Postgres 错误码与 HTTP 状态 |
| `src/lib/db.ts` | 抛出 `DbError`（消息文本与 Phase 1 相同）；新增 `getCharacterRecord`、`countBookRecords` |
| `src/lib/books.ts` | 新增会抛错的 `fetchBookData` / `fetchBookList` 供 MCP 使用；Web 用的 `getBookData` / `getBookList` 返回值不变（内部改为调用新函数并捕获错误） |
| `tests/unit/mcp-format.test.ts`（新）、`tests/live/mcp-contract.test.ts`（新）、`tests/live/helpers.ts` | 见 §11.2 |

工具名称、输入参数、工具说明均未改变（只新增可选参数 `response_mode`）。

### 11.2 自动化测试

| 测试 | 结果 |
|---|---|
| `pnpm test`（单元测试） | **22/22 通过**（新增 9 项：错误分类、错误文本不含数据库消息、警告、信封用 Ajv 校验、full/compact 文本） |
| `DHSJR_LIVE_TESTS=1 pnpm test:live` | **37/37 通过**（新增 16 项契约测试 + Phase 1 的 21 项） |
| 契约测试内容 | 用 SDK 自带的 Ajv 按 `tools/list` 公布的 JSON Schema 校验 6 个工具（full/compact）的 structuredContent；默认模式下旧 JSON 文本块的键与内容不变；compact 的 JSON 文本 = structuredContent；`list_books` 文本 = structuredContent；`NOT_FOUND`（含 30-026-05 的提示）、`EMPTY_QUERY`、SDK 输入校验错误；资源不存在不再是 `-32603` |
| `tsc --noEmit`、`pnpm build` | 通过 |
| Biome（新增/修改的 MCP、db 文件与测试） | 通过 |

### 11.3 真实客户端测试（D17）

客户端：本会话（Claude Code 桌面版），通过 `/mcp` 连接本地 `pnpm start` 的 `http://localhost:3000/api/mcp`。

| 项目 | 结果 |
|---|---|
| 连接与工具发现 | 通过。6 个工具，`search_all` / `search_detail` / `get_word` 带 `response_mode` |
| 交给模型的工具定义 | **只有输入参数，不含 outputSchema**。`tools/list` 从 5.3 KB 增至 25.0 KB，但在 Claude Code 中不增加模型的 token |
| 工具说明的显示 | Claude Code 对说明做了规范化：全角 `＊` 显示为 `*`、`（` 显示为 `(`。证实 NEW-5 来自客户端 |
| 成功结果交给模型的内容 | **只有 structuredContent**（信封 JSON）；文本块（摘要行、「続きあり」、旧 JSON）不交给模型 |
| `search_all`（full / compact）、`search_detail`、`get_word`、`get_character`、`get_book`、`list_books` | 全部通过，内容与契约测试一致 |
| 警告 | `PAGE_OUT_OF_RANGE`（`character=東` 第 99 页）、`WILDCARD_IN_VALUE`（`word_kana="*ト"`，11,227 件）均出现在 `meta.warnings` |
| 错误 | `[NOT_FOUND]`（不存在的单字 ID；`30-026-05` 附带“有 1930 件记录”的提示）、`[EMPTY_QUERY]`（空白检索词、只有空白的条件）、SDK 的 `Input validation error`（`per_page=51`）均以工具错误显示 |
| 资源 | `dhsjr://book/50-029-01` 正常；`dhsjr://book/NOPE` 被客户端识别为 “Resource not found” |
| 连续调用 | 从检索结果的 `character_id`、`book_id` + `word_index_in_book` 调用 `get_character`、`get_word`，正常 |
| ChatGPT | **未测试**（本环境无法连接） |
| claude.ai 网页版 connector | **未测试**（需要部署后才能连接到新代码） |

### 11.4 体积（`search_all 東`，线上数据）

| | 20 条 | 50 条 |
|---|---|---|
| 修改前：文本（摘要 + JSON） | 12.3 KB | 30.3 KB |
| 默认模式：文本（不变） | 12.3 KB | 30.4 KB |
| 默认模式：structuredContent | 9.5 KB | 23.0 KB |
| compact：文本 | 8.4 KB | 20.0 KB |
| compact：structuredContent | 8.3 KB | 19.9 KB |
| **Claude Code 中模型实际收到的**（只有 structuredContent） | 默认 9.5 KB（−23%），compact 8.3 KB（−33%） | 默认 23.0 KB，compact 19.9 KB |

只读文本的客户端收到的内容与修改前相同（默认）或减少约 32%（compact）。若有客户端同时把文本和 structuredContent 交给模型，默认模式约为 21.8 KB / 20 条；本次没有发现这样的客户端，但 ChatGPT 未测试。

### 11.5 对后续阶段的影响

1. **Claude Code 看不到文本块。** 摘要行和「続きあり」提示对 Claude Code 无效，但 `meta.has_more` / `next_page` / `warnings` 可见。Phase 4 的工具说明应引导 AI 读取 `meta`，不要依赖文本摘要。
2. **outputSchema 的体积**（`tools/list` 25 KB）在 Claude Code 中不进入模型上下文；对其他客户端的影响未知。如需缩小，可在 Phase 4 去掉输出 Schema 中的字段说明。
3. 链接仍是相对路径（`/character/...`），Phase 3 处理。
4. Web 侧书目读取失败的问题仍待修复（§7「Web 侧待修复」）。
