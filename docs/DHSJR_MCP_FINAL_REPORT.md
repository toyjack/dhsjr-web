# DHSJR MCP 改进项目 — 最终报告

**分支：** `feat/mcp-phase1-search-correctness`（基于 `main` @ `7ae849e`）
**日期：** 2026-10-17
**状态：** Phase 0–5 完成。未合并、未部署；SQL 迁移未执行。

相关文档：[规格书](DHSJR_MCP_DEVELOPMENT.md) · [Phase 0/1](DHSJR_MCP_PHASE0_REPORT.md) · [Phase 2](DHSJR_MCP_PHASE2_DESIGN.md) · [Phase 3](DHSJR_MCP_PHASE3_DESIGN.md) · [Phase 4](DHSJR_MCP_PHASE4_DESIGN.md) · [使用指南](DHSJR_MCP_GUIDE.md)

---

## 1. 架构与数据流

```
AI 客户端 ──Streamable HTTP──▶ src/app/api/mcp/route.ts
                                 ├ getPublicOrigin(req) → AsyncLocalStorage（绝对链接）
                                 └ mcp-handler → @modelcontextprotocol/server
                                      └ src/lib/mcp/register.ts（6 工具 + 1 资源，outputSchema）
                                           ├ src/lib/mcp/format.ts（信封、文本、警告、source/sources）
                                           ├ src/lib/mcp/errors.ts（错误分类，原始消息只写日志）
                                           ├ src/lib/db.ts ──────────────┐
                                           └ src/lib/books.ts ───────────┤
Web 页面（results / character / word / book）──┘                         │
                    src/lib/search-params.ts（分页、条件解析、引号）     ▼
                                                    Supabase（anon key）：dhsjr 表、dhsjr-books 表、
                                                    PGroonga RPC search_/count_dhsjr_all_fields_by_word
```

Web 与 MCP 共用 `db.ts`、`books.ts`、`search-params.ts`；契约测试比较两者的件数、ID 和顺序。

---

## 2. 各阶段成果

| 阶段 | commit | 内容 |
|---|---|---|
| 0 | `15fe049` | 审查、Web/MCP 对照、基线测试、问题清单（D1–D8） |
| 1 | `22340ff` | 详细检索确定性排序（修复分页重复/遗漏：`book_id=20-002-01` 2002/2917 → 2917/2917）；越界页返回空页；分页参数规范化；回退 `.or()` 加引号；SQL 迁移文件（未执行） |
| 2 | `d906367` | `outputSchema` + `structuredContent` 信封；`compact` 模式；警告；`[CODE]` 错误；MCP 侧书目读取故障不再显示为 0 件 |
| 3 | `f7d9e03` | 绝对链接；`source` / `sources` 出处；`position_note` 原文引用；结构化 `get_book` 去掉错位的 `references_parsed`；IIIF 检查 |
| 4 | `8fb877d` | 服务器说明与工具说明重写；Sonnet/Haiku 子代理 A/B 评估（36 + 8 次运行）；修正 R1–R4 |
| 5 | 本次 | ESLint 配置、README、本指南与报告、综合验收 |

---

## 3. Phase 5 综合验收结果（2026-10-17 实际执行）

| 测试 | 条件 | 期望 | 实际 | 结果 |
|---|---|---|---|---|
| 类型检查 | `tsc --noEmit` | 无错误 | 无错误 | 通过 |
| 构建 | `pnpm build` | 成功 | 成功 | 通过 |
| Lint | `pnpm lint` | 可运行 | 0 错误、15 警告（全部在本项目未修改的旧文件） | 通过（警告见 §5） |
| 单元测试 | `pnpm test` | 全部通过 | 28/28 | 通过 |
| 线上只读集成 / 契约测试 | `DHSJR_LIVE_TESTS=1 pnpm test:live` | 全部通过 | 45/45 | 通过 |
| IIIF 检查 | `DHSJR_IIIF_TESTS=1 pnpm test:iiif` | 19 个 Manifest 可用 | 19/19 | 通过 |
| MCP 协议（真实 HTTP，生产构建） | initialize、tools/list、6 工具、资源、错误、越界页、代理头下的绝对链接、未知工具 | 符合规格 | 20/20 | 通过 |
| Web：详细检索分页 | `character=東` 每页 50 取完 6 页 | 252 唯一、有序 | 252 行、252 唯一、按 ID 有序 | 通过 |
| Web：全文检索 1000 件/页 | `query=東&perPage=1000` | 不报错 | 721 件，显示 500 行（迁移前上限） | 通过 |
| Web：缺少分页参数 | `/results?character=東` | 显示结果 | 252 件，显示 100 行 | 通过 |
| Web：未知参数 | `/results?hakase=31` | 提示需要条件 | 「検索条件が指定されていません」 | 通过 |
| Web：资料全记录按钮场景 | `book_id=20-002-01&perPage=1000` | 正常 | 2917 件，1000 行 | 通过 |
| Web：详情页 | word / character / book / books / en/books | 正常显示 | 均正常（book 页截图确认） | 通过 |
| 日志 | 服务器日志 | 无密钥、无对外 DB 消息 | 无；另有既有的 book 页服务端 `document is not defined`（文件未改动，页面正常） | 通过（既有问题见 §5） |
| 真实客户端（Claude Code） | 本地 `/mcp` | — | Phase 5 重连未成功（会话中项目服务器仍为 failed，服务器本身正常）。自 Phase 4 commit 以来运行时代码未变（只加了 ESLint 配置），以 Phase 4 R1–R4 重跑结果（Sonnet/Haiku 共 8 次）和本次 20/20 协议检查代替 | 以 Phase 4 结果代替（如实说明） |
| ChatGPT、claude.ai 网页版 connector | — | — | 无法在本地连接 | **未测试** |

---

## 4. 向后兼容性

| 变化 | 影响 |
|---|---|
| Web 详细检索顺序固定为 資料番号 → 資料内漢字番号 → ID | 显示顺序与以前（不稳定的扫描顺序）不同；这是修复本身 |
| MCP 工具名、输入参数 | 不变；新增可选参数 `response_mode` |
| MCP 默认文本 content | 摘要与旧 JSON 结构不变；增加警告行、「続きあり」，链接变为绝对 URL；`list_books` 的 JSON 文本改为信封（D12） |
| `structuredContent` / `outputSchema` | 新增；Claude Code 只把结构化结果交给模型 |
| 错误 | 文本加 `[CODE]` 前缀，不再透出数据库消息；越界页从错误改为空页 |
| 空白条件 | 视为未指定（以前按字面空格检索） |
| Web `getBookData` / `getBookList` | 行为不变（D15） |
| `next build` | 现在会运行 ESLint（已有错误降为警告，构建结果与以前相同） |

---

## 5. 未完成事项与已知问题

**需要您执行或决定**
1. 在 Supabase 执行 `supabase/migrations/20261016000000_search_all_stable_order.sql`（ID 最终键、NULL 分页报错、page_size 上限 1000）。执行后把 `SEARCH_ALL_MAX_PER_PAGE` 改为 1000，并同步 `supabase/functions/search_all_fields_by_word.sql`。
2. 生产环境建议设置 `NEXT_PUBLIC_SITE_URL=https://dhsjr.kojisho.com`（需重新构建）；不设置也会用请求 origin。
3. 部署后用 claude.ai connector / ChatGPT 实测，并提醒已连接的客户端重连（工具说明有缓存）。

**数据（需要数据负责人）**
- NEW-7：`30-026-05`、`50-035-03` 有记录无书目；`50-035-02` 有书目和 Manifest 无记录（疑似编号错位）。
- D22：部分 Manifest 只覆盖一部分卷册（如 20-002-01 → 巻二）。Phase 4 评估中 Sonnet 据此给出误导性建议。
- 2 条书目 `title` 含换行（`30-026-04`、`60-028-01`）；`references_parsed` 69/226 条字段错位。

**Web（下次更新 Web 时）**
- D15：书目读取失败时 `/books`、检索面板下拉框为空，`/book/[id]` 显示“未找到”。
- 不存在的单字・汉语・资料页面返回 HTTP 200（软 404）。
- book 页在服务端出现 `ReferenceError: document is not defined`（IIIF 查看器在服务端被加载；页面仍可显示）。
- ESLint 警告 15 条：`tify-viewer.tsx`、`uv-viewer.tsx` 的 `@ts-ignore`（5）、`tailwind.config.ts` 的 `require()`（2）、`ruby-cell.tsx` 在渲染中定义组件（2）、未使用变量（6）。

**MCP 能力与质量**
- 声点型・仮名型的完全一致检索是现有工具无法表达的能力（Phase 4 的 S8 每轮都受此限制），建议将来作为 `search_detail` 的可选参数。
- 较弱模型（Haiku）在大结果集上仍可能调用过多（S2：15 → 48 次）。
- `tools/list` 因 `outputSchema` 增至约 29 KB；Claude Code 不交给模型，其他客户端未知。

---

## 6. 最终验收标准（规格书 §12）

| 项目 | 状态 |
|---|---|
| 六个现有 MCP Tool 正常工作 | ✅ 契约测试、协议检查、Claude Code 实测 |
| 主要 Web 查询能力可通过 MCP 完成 | ✅ Phase 0 对照表；MCP 为超集 |
| 单字、汉语、书目查询路径完整 | ✅ |
| 多条件搜索符合既有业务规则 | ✅ 规则未改（D2、D4） |
| 新字体、旧字体规则得到验证和文档化 | ✅ |
| IIIF 信息按实际可用程度提供 | ✅（覆盖范围问题 D22 待数据修正） |
| 查询结果能与 Web 对照 | ✅ Web/MCP 一致性测试 |
| 分页在固定数据集上无重复遗漏 | ✅（线上数据；同一数据状态下） |
| 数据字段映射正确、原始音注和字形不被改写 | ✅ |
| 错误响应符合预期 | ✅ |
| 没有新增已知检索回归 | ✅ |
| Tool Description 准确 | ✅ 示例 ID 存在性等由测试守护 |
| AI 可自主选择工具、连续检索、取得详细记录、追溯来源 | ✅ Phase 4 评估（Sonnet、Haiku） |
| 结构化输出通过契约测试 | ✅ |
| 精简模式可用且兼容性已验证 | ✅ Claude Code；ChatGPT 未测试 |
| 自动化测试、类型检查、构建 | ✅ |
| Web 回归测试 | ✅ 浏览器检查（未自动化，D27） |
| MCP 协议测试 | ✅ |
| 文档更新 | ✅ README、本报告、使用指南、CLAUDE.md |
| 未修改未经授权的生产数据或配置 | ✅ 数据库只读；迁移未执行；部署配置未改 |
| 未完成测试和已知限制已如实记录 | ✅ 见 §3、§5 |
