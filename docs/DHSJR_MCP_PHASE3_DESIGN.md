# DHSJR MCP — Phase 3 书目与 IIIF 追溯设计（待确认）

**对应规格书：** [DHSJR_MCP_DEVELOPMENT.md](DHSJR_MCP_DEVELOPMENT.md) §4.5–4.6、§6、Phase 3
**前置：** [Phase 0/1 报告](DHSJR_MCP_PHASE0_REPORT.md)、[Phase 2 设计与结果](DHSJR_MCP_PHASE2_DESIGN.md)
**状态：** 设计已确认（D18–D22，2026-10-16），已实现；结果见 §8。

---

## 1. 调查结果（2026-10-16，全部只读）

### 1.1 链接

| 检查 | 结果 |
|---|---|
| 生产 MCP 返回的链接 | 相对路径（`/character/…`），生产未设置 `NEXT_PUBLIC_SITE_URL`（ISSUE-004） |
| `https://dhsjr.kojisho.com/character/20-043-01-000005`、`/word/20-043-01_5`、`/book/20-043-01` | 200 |
| `/en/book/…`、`/ja/book/…` | 307 → `/book/…`，因此链接继续使用不带语言前缀的路径 |
| 不存在的单字、汉语、资料页面（如 `/book/30-026-05`、`/character/NO_SUCH`） | **200**，页面显示「…が見つかりません」（软 404） |
| `mcp-handler` | 导出 `getPublicOrigin(req)`：按 `x-forwarded-host` / `x-forwarded-proto` / `Forwarded` 推导公开 origin |

### 1.2 书目表 `dhsjr-books`（73 条）

| 检查 | 结果 |
|---|---|
| `raw_markdown` 的「資料名」与 `title` 列 | 73 条全部一致 → Resource 与 Tool 的书名一致 |
| `period`、`holding_institution` | 全部有值 |
| 含换行的 `title` | 2 条：`30-026-04`（「四座講式\n四座講式」）、`60-028-01`（两行文献名） |
| `parse_status` | `ok` 32、`warning` 41（全部是参考文献列数不符） |
| `references_parsed` | 226 条中 **69 条字段错位**（如 `publisher` 为日期、`issn` 为出版社名），分布在 38 种资料中。`references_raw` 是原文，无此问题 |
| `input_notes` 中说明「出現位置」书式的资料 | **51/73**。例：`20-002-01`「0101a8 は第1巻、第1ページ、表、8行目」；`20-045-01`「頁数・行数・上から数えた文字数」 |
| 记录的 `book_name` 与书目 `title` | 不同：`book_name` 更具体（如「医心方_半井家旧蔵」/「医心方」） |
| 有记录无书目 / 有书目无记录 | `30-026-05`、`50-035-03` / `50-035-02`（NEW-7，未变） |

### 1.3 IIIF Manifest（`contents/manifest.ts`，19 条）

| 检查 | 结果 |
|---|---|
| 可访问且为合法 Manifest | 19/19（Presentation v2：16，v3：3），`id` 与 URL 一致 |
| Manifest 覆盖范围 | **多条只对应资料的一部分**，例：`20-002-01`→「医心方 巻二 忌鍼炙部」、`20-002-02`→「医心方 巻第1」、`30-017-01`→「色葉字類抄. 上」、`50-007-04`→「本朝文粹. 巻6」 |
| 同一 Manifest 对应两个资料 | `30-038-02`/`30-039-02`（魚山私鈔）、`30-038-03`/`30-039-03`（魚山六巻帖）：五悔与九方便收在同一册中，合理 |
| `50-035-02` 的 Manifest | 龍谷大学「論語集解」，但该编号没有记录；龍谷大学本的记录在 `50-035-03`。**不推测对应关系**，交数据负责人确认（NEW-7） |
| 资料内位置 → Canvas | **没有任何对应数据**。`出現位置` 是各资料自定的书式，不能换算为 Canvas。按规格书 §6.3，不提供页面定位 |

---

## 2. 设计：绝对链接

**做法（推荐，D18-A）：** 链接的 origin 按以下顺序决定：

1. 环境变量 `NEXT_PUBLIC_SITE_URL`（已设置时，与现在相同）；
2. 否则取请求的公开 origin（`getPublicOrigin(req)`：Vercel 等代理设置的 `x-forwarded-host` / `x-forwarded-proto`，或请求 URL 本身）；
3. 不在 HTTP 请求中（单元测试等）时保持相对路径。

实现：`route.ts` 用 `AsyncLocalStorage` 在处理每个请求时保存 origin，`format.ts` 的 `siteLink()` 读取它。不修改部署配置，也不在代码中写死域名。生产仍建议设置 `NEXT_PUBLIC_SITE_URL=https://dhsjr.kojisho.com`，使链接不受代理头的影响（由您在部署中设置）。

本地 `/mcp` 连接时链接为 `http://localhost:3000/...`，预览部署时为预览域名，可以直接点开验证。

链接继续不带语言前缀（默认日语）。

---

## 3. 设计：出处信息

### 3.1 `get_character` / `get_word`：新增 `data.source`

```jsonc
"source": {
  "book_id": "20-002-01",
  "book_name": "医心方_半井家旧蔵",          // 记录上的资料名
  "bibliography": "registered",             // 或 "missing"（有记录但无书目，NEW-7）
  "title": "医心方",                         // 以下来自书目，仅 registered 时
  "period": "平安,字音点は1145年頃か",
  "holding_institution": "国立東京博物館,半井家旧蔵,巻22は成簣堂文庫",
  "position_note": ["出現位置は、「巻、裏表、行数」で示した。…"],  // input_notes 中提到「出現位置」的条目，原文照录，不解释
  "book_url": "https://…/book/20-002-01",   // 始终返回（D19）；missing 时该页面显示「未找到」
  "iiif_manifest": "https://…/manifest.json"  // 仅 manifest.ts 已登记时
}
```

`position_note` 只引用书目原文；没有说明的资料（22 种）不出现该字段。不把 `position_in_book` 换算成页码或 Canvas。

### 3.2 检索结果：新增 `data.sources`（见 D20）

本页记录涉及的资料，按 `book_id` 汇总一次（不在每条记录中重复）：

```jsonc
"sources": {
  "20-002-01": { "bibliography": "registered", "title": "医心方", "period": "…", "holding_institution": "…", "book_url": "…", "iiif_manifest": "…" }
}
```

不含 `position_note`（较长），需要时用 `get_character` / `get_book`。每次检索多一次书目查询（约 40 ms）。

### 3.3 `get_book`

- 去掉结构化结果中的 `references_parsed`（见 D21），保留原文 `references_raw` 与 `parse_status`。
- 新增 `position_note`（同 3.1）。
- 有记录无书目时，仍返回 `[NOT_FOUND]` 及提示（Phase 2 已实现）。

### 3.4 `list_books`

不新增字段（D22 暂缓）。是否把“有记录但无书目”的资料也列出：**不列出**（列表是书目表的内容；`get_book` 的提示已覆盖），不作为选项。

### 3.5 Schema 版本

以上都是新增字段（D21 删除一个可选字段），`schema_version` 升为 `"1.1"`。

---

## 4. IIIF

- 不提供 Canvas 定位（没有可靠对应关系）。
- Manifest 只在 `contents/manifest.ts` 已登记时返回；不根据书名推测。
- 新增可选的外部检查：`DHSJR_IIIF_TESTS=1` 时校验 19 个 Manifest 可访问、为合法 Manifest、`id` 与 URL 一致（访问第三方服务器，所以与数据库的线上测试分开开关）。
- Manifest 只覆盖部分卷册的问题（如 `20-002-01`→「医心方 巻二」）：**暂缓（D22）**，由您修正 Manifest 数据后再处理；本阶段只返回 URL。
- `50-035-02` / `50-035-03`：不改代码，列入数据负责人待办。

---

## 5. Web 侧待修复（追加到 Phase 2 §7 的清单）

- 不存在的单字、汉语、资料页面返回 HTTP 200（软 404）。应使用 `notFound()` 返回 404，便于链接检查和搜索引擎。
- `title` 含换行的 2 条书目在页面上会显示为两行（`30-026-04` 似为重复）——数据问题。

---

## 6. 实现计划（确认后执行）

| 文件 | 改动 |
|---|---|
| `src/app/api/mcp/route.ts` | 每个请求在 `AsyncLocalStorage` 中保存 `getPublicOrigin(req)` |
| `src/lib/mcp/request-context.ts`（新） | `AsyncLocalStorage` 与读取函数 |
| `src/lib/mcp/format.ts` | `siteLink()` 使用请求 origin；`source` / `sources`；`position_note` |
| `src/lib/books.ts` | 按多个 `book_id` 一次读取书目（`fetchBooksByIds`） |
| `src/lib/mcp/register.ts`、`schemas.ts` | 新字段与 `schema_version: "1.1"`；`get_book` 去掉 `references_parsed` |
| `tests/unit/*`、`tests/live/mcp-contract.test.ts` | 绝对链接（有/无代理头、有/无环境变量）、出处字段、Schema 校验 |
| `tests/iiif/manifests.test.ts`（新，`DHSJR_IIIF_TESTS=1`） | 外部 Manifest 检查 |

验收：契约测试与 Phase 1/2 测试全部通过；本地 `/mcp` 实测链接为可直接打开的绝对 URL；`tsc`、`build` 通过。

---

## 7. 决定记录（2026-10-16 确认）

| # | 问题 | 决定 |
|---|---|---|
| D18 | 绝对链接的 origin | 环境变量 `NEXT_PUBLIC_SITE_URL` 优先，否则取请求的公开 origin（`getPublicOrigin`）；不在请求中时保持相对路径 |
| D19 | 有记录但无书目的资料的 `book_url` | **保留 `book_url`**（未采纳“省略”建议）。`source` / `sources` 中仍以 `bibliography: "missing"` 标明无书目 |
| D20 | 出处信息放在哪里 | `get_character` / `get_word` 加 `source`（含 `position_note`）；检索结果加精简的 `sources` |
| D21 | `references_parsed` | 从结构化结果中去掉，旧 JSON 文本块不变 |
| D22 | Manifest 只覆盖部分卷册 | **暂缓**：由您修正 Manifest 数据后再处理；本阶段只返回 URL |

数据负责人待办（不在代码范围内）：NEW-7（`30-026-05`、`50-035-03` 无书目，`50-035-02` 无记录）；Manifest 覆盖范围（D22）；`30-026-04`、`60-028-01` 的 `title` 含换行。

---

## 8. 实施结果（2026-10-16）

分支 `feat/mcp-phase1-search-correctness`（未合并、未 push、未部署）。数据库只读。

### 8.1 修改的文件

| 文件 | 改动 |
|---|---|
| `src/lib/mcp/request-context.ts`（新） | `AsyncLocalStorage` 保存当前请求的公开 origin |
| `src/app/api/mcp/route.ts` | 每个请求用 `getPublicOrigin(req)` 包裹处理器 |
| `src/lib/mcp/format.ts` | `siteLink()`：`NEXT_PUBLIC_SITE_URL` → 请求 origin → 相对路径；`positionNote`、`recordSource`、`pageSources`；结构化 `get_book` 去掉 `references_parsed`、加 `position_note` |
| `src/lib/mcp/schemas.ts` | `schema_version: "1.1"`；`sourceSchema`、检索结果的 `sources`；`get_word` / `get_character` 的 `source`；`bookSchema` 去掉 `references_parsed`、加 `position_note` |
| `src/lib/mcp/register.ts` | 检索与 `get_*` 一次读取所涉资料的书目（`fetchBooksByIds`） |
| `src/lib/books.ts` | `fetchBooksByIds`、`BookSource` |
| `tests/unit/mcp-format.test.ts` | 链接（无请求 / 请求 origin / 环境变量优先）、`positionNote`、`recordSource`、`pageSources` |
| `tests/live/mcp-contract.test.ts`、`helpers.ts` | 绝对链接（含代理头）、`sources`、`bibliography: "missing"`、`position_note`、`references_parsed` 仅从结构化结果中去掉 |
| `tests/iiif/manifests.test.ts`（新）、`package.json` | `DHSJR_IIIF_TESTS=1 pnpm test:iiif` |

工具名称、输入参数、工具说明不变。默认模式的文本摘要和旧 JSON 块的结构不变；其中的链接现在是绝对 URL。

### 8.2 自动化测试

| 测试 | 结果 |
|---|---|
| `pnpm test` | **28/28 通过**（新增 6 项） |
| `DHSJR_LIVE_TESTS=1 pnpm test:live` | **42/42 通过**（新增 5 项 Phase 3 契约测试；Phase 1/2 的 37 项未退化） |
| `DHSJR_IIIF_TESTS=1 pnpm test:iiif` | **19/19 通过**（可访问、Presentation v2/v3、`id` 与 URL 一致） |
| `tsc --noEmit`、`pnpm build` | 通过 |
| Biome（MCP 相关文件与测试） | 通过 |

### 8.3 真实客户端测试（Claude Code，本地 `/mcp`）

| 项目 | 结果 |
|---|---|
| `schema_version` | `1.1` |
| 链接 | `http://localhost:3000/character/…`、`/word/…`、`/book/…`，在本地应用中均返回 200 |
| `search_detail`（`character=東`，第 12 页，compact） | `data.sources` 只含本页涉及的 `90-046-01`，`bibliography: "registered"`，含书名、年代、所藏、`book_url` |
| `get_character 30-026-05-000663` | `source.bibliography: "missing"`，无书名；`book_url` 保留（D19） |
| `get_word 20-002-01 / 19` | `source` 含书名、年代、所藏、IIIF Manifest，`position_note` 原文引用「0101a8 は第1巻、第1ページ、表、8行目」 |
| `get_book 20-002-01` | 结构化结果中无 `references_parsed`，有 `references_raw`、`position_note` |
| 代理头下的链接 | 契约测试：`x-forwarded-host: dhsjr.example.org` + `x-forwarded-proto: https` → `https://dhsjr.example.org/…` |
| ChatGPT、claude.ai 网页版 connector | **未测试**（需要部署） |

### 8.4 遗留事项

1. 生产部署后，链接的 origin 来自生产环境的请求（或您设置的 `NEXT_PUBLIC_SITE_URL`）；部署后需要再确认一次。`NEXT_PUBLIC_*` 变量在构建时写入，设置后需要重新构建。
2. D22（Manifest 只覆盖部分卷册）暂缓，等您修正 Manifest 数据。
3. Web 侧待修复：软 404（§5）、书目读取失败（Phase 2 §7）。
4. 数据负责人待办：NEW-7、两条含换行的 `title`。
