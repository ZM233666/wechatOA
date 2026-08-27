# 从 Mock Server 迁移到 DVAdmin Django/DRF

正式业务后端为 **DVAdmin + Django/DRF**（未来目录 `apps/backend`），管理端为 **DVAdmin Vue Portal**（未来目录 `apps/portal`）。小程序与 Portal **共用同一套 Django 业务后端**，不单独建设小程序后端。

旧 NestJS 应用 `apps/server` 是历史原型骨架，**已停止扩展**，**不是**迁移目标。

相关文档：[API 契约](./api-contracts.md)、[Mock API 清单](./mock-api-inventory.md)、[目标架构](./target-architecture.md)、[新闻内容契约](./news-content-contract.md)。

---

## 1. 迁移目标

| 目标 | 说明 |
| --- | --- |
| 页面与 Service 不重写 | 小程序页面与 `services/*.service.ts` 业务逻辑保持不变；迁移不借机重写 UI |
| 配置切换为主 | 正式上线主要通过环境配置，将 `apiBaseUrl` 从 Mock Server 切到 Django Mini API |
| 响应兼容 | Mock 与 Django 的**公开**接口响应保持字段与行为兼容（见第 4 节） |
| Mock 长期保留 | `apps/mock-server` 在正式后端完成后**仍保留**，用于前端独立开发、异常场景演示与自动化测试 |
| 单一业务后端 | Mini / Admin 共用 Django；禁止再为小程序单独建一套后端 |
| NestJS 不承接 | 禁止在 `apps/server` 实现正式业务 |

正式路径统一前缀：`/api/v1/mini/*`（小程序）与 `/api/v1/admin/*`（Portal）。

---

## 2. 当前与目标请求链路

### 当前（开发默认）

```text
WeChat Miniprogram
  → services/*.service.ts
  → services/request.ts
  → http://127.0.0.1:3100/api/*
  → apps/mock-server
```

- Base URL 来自 `config/env.ts`（develop 默认 Mock `3100`）
- 路径仍为 Mock 约定的 `/api/...`（无 `/v1/mini` 前缀）
- 图片多为 `/mock-assets/...` 经服务端拼成绝对 URL

### 目标（正式）

```text
WeChat Miniprogram
  → services/*.service.ts
  → services/request.ts
  → https://api.example.com/api/v1/mini/*
  → Django/DRF（apps/backend）
  → Redis（缓存 / 限流 / 锁）
  → PostgreSQL / Object Storage（+ CDN）
```

- Portal 另走 `https://api.example.com/api/v1/admin/*`（不经过小程序）
- 小程序**不**直连 PostgreSQL、Redis 或对象存储私有地址
- 切换时改环境配置与 endpoints 前缀对齐；**不**改页面业务逻辑

---

## 3. 接口路径映射

下列映射以当前 [Mock API 清单](./mock-api-inventory.md) 为准。正式 Mini API 统一挂在 `/api/v1/mini/*`。  
「当前迁移状态」在接入 Django 前均为 **未实现**（`health` 仅有旧 NestJS 骨架不同 payload，不算正式 Mini API）。

| 当前 Mock 路径 | 正式 Mini API 路径 | HTTP 方法 | 是否需要认证 | Django 模块（建议） | 当前迁移状态 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/health` | `/api/v1/mini/health` | GET | 否 | `health` / 运维探针 | 未实现 | 正式字段对齐 `HealthData`；可不含 Mock 的 `mode` |
| `/api/app/config` | `/api/v1/mini/app/config` | GET | 否 | `app_config` | 未实现 | feature flags；预留 |
| `/api/home` | `/api/v1/mini/home` | GET | 否 | `home` | 未实现 | `latestNews` 仅已发布快照，最多 3 条 |
| `/api/news/categories` | `/api/v1/mini/news/categories` | GET | 否 | `news` | 未实现 | `articleCount` 只统计公开文章 |
| `/api/news` | `/api/v1/mini/news` | GET | 否 | `news` | 未实现 | 列表无完整 `richContent` |
| `/api/news/:id` | `/api/v1/mini/news/:id` | GET | 否 | `news` | 未实现 | 支持公开 `id` 或 `slug`；草稿/未到点/归档 → 404 |
| `/api/brand` | `/api/v1/mini/brand` | GET | 否 | `brand` | 未实现 | overview |
| `/api/brand/articles` | `/api/v1/mini/brand/articles` | GET | 否 | `brand` | 未实现 | 分页；预留 |
| `/api/brand/articles/:id` | `/api/v1/mini/brand/articles/:id` | GET | 否 | `brand` | 未实现 | 预留 |
| `/api/products/categories` | `/api/v1/mini/products/categories` | GET | 否 | `products` | 未实现 | 含 hero slides |
| `/api/products` | `/api/v1/mini/products` | GET | 否 | `products` | 未实现 | 分页筛选 |
| `/api/products/:id` | `/api/v1/mini/products/:id` | GET | 否 | `products` | 未实现 | |
| `/api/cases/categories` | `/api/v1/mini/cases/categories` | GET | 否 | `cases` | 未实现 | 预留 |
| `/api/cases` | `/api/v1/mini/cases` | GET | 否 | `cases` | 未实现 | |
| `/api/cases/:id` | `/api/v1/mini/cases/:id` | GET | 否 | `cases` | 未实现 | |
| `/api/services` | `/api/v1/mini/services` | GET | 否 | `services` | 未实现 | Digital CBM / FastPHM / Insights |
| `/api/services/:id` | `/api/v1/mini/services/:id` | GET | 否 | `services` | 未实现 | 预留 |
| `/api/kb-life/entries` | `/api/v1/mini/kb-life/entries` | GET | 否 | `kb_life` | 未实现 | |
| `/api/kb-life/canteen` | `/api/v1/mini/kb-life/canteen` | GET | 否 | `kb_life` | 未实现 | |
| `/api/kb-life/shuttle` | `/api/v1/mini/kb-life/shuttle` | GET | 否 | `kb_life` | 未实现 | |
| `/api/kb-life/activities` | `/api/v1/mini/kb-life/activities` | GET | 否 | `kb_life` | 未实现 | |
| `/api/profile` | `/api/v1/mini/profile` | GET | 可选 / 登录后需要 | `profile` / `accounts` | 未实现 | **禁止**移植 `?loggedIn=true`；真实会话鉴权 |

说明：

- Admin 写操作（草稿、发布、媒体上传等）走 `/api/v1/admin/*`，不进入上表 Mini 列。
- endpoints 前缀对齐可在 `services/endpoints.ts`（或等价配置）一次性完成，页面不改。

---

## 4. API 契约兼容要求

迁移过程中下列约定**不得随意变化**（细则以 `docs/api-contracts.md`、`packages/shared` 为准）：

| 项 | 要求 |
| --- | --- |
| `ApiResponse<T>` | 保留 `success` / `data` / `message`；建议带 `requestId`、`timestamp` |
| 分页结构 | `items` + `pagination.{page,pageSize,total,totalPages,hasNext,hasPrevious}` |
| 错误结构 | `success: false` + `error.code`（及可选 `details`）；业务错误不得一律 HTTP 200 |
| 日期 | ISO 8601 字符串（如 `2024-05-20T08:00:00.000Z`） |
| ID | 稳定公开 ID（如 `news-001`）；**不**暴露数据库自增主键 |
| `ImageResource` | 至少含可访问的 `url`；禁止 Base64、本机路径、硬编码 `127.0.0.1` |
| `richContent` | Block 字段集合与 Mock / `rich-content-schema` 对齐；非任意 HTML |
| 列表与详情 ID | 列表项 `id` 必须能打开对应详情 |
| 空列表 | 返回 `[]`，不返回 `null` |
| 列表正文 | 列表接口**不**返回完整 `richContent` |
| 详情正文 | 仅详情接口返回完整 `richContent` |

公开 Mini API **只**暴露已发布内容；草稿、审核流水、未到 `publishedAt` 的内容对小程序不可见（404 或不出现在列表）。

---

## 5. 新闻中心迁移示例

端到端链路（从 Fixture 到渲染）：

```text
Mock Fixture JSON
  fixtures/news/articles/*.json
        │  （内容迁移 / CMS 录入）
        ▼
Django NewsArticle（文章主实体，公开 id/slug 稳定）
        │
        ├── NewsRevision.content_json   ← 编辑中的 Block JSON（JSONB）
        │         │ 发布动作
        │         ▼
        └── NewsPublishedSnapshot.payload  ← 对外快照（与公开 DTO 对齐）
                    │
                    ├── Redis 缓存（列表/详情键；发布或下架时失效）
                    │
                    ▼
           GET /api/v1/mini/news
           GET /api/v1/mini/news/:id
                    │
                    ▼
           小程序 services/news.service.ts
                    │
                    ▼
           article-renderer（按 Block 渲染，不解析任意 HTML）
```

要点：

| 环节 | 规则 |
| --- | --- |
| Fixture | 模拟的是**发布完成后的公开内容**，不是草稿库 |
| `NewsRevision` | 仅 Admin / 内部；含 `content_json`（JSONB Block） |
| `NewsPublishedSnapshot` | Mini 只读此快照；字段对齐 `NewsSummary` / `NewsDetail` |
| Redis | 缓存已发布列表与详情；发布、改排、下架时主动失效 |
| 列表 | `/api/v1/mini/news` → `PaginatedData<NewsSummary>`，无完整正文 |
| 详情 | `/api/v1/mini/news/:id` → `NewsDetail` + `richContent` |
| 小程序 | 只能读已发布快照；**不能**读草稿、审核记录、未到发布时间的内容 |
| 状态 | `draft` / `scheduled`（未到点）/ `archived` 等对 Mini 表现为不存在（404）或不入列表 |

图片字段（封面、正文图）在快照中只存 `ImageResource` URL，不存二进制。

---

## 6. 图片迁移规则

| 阶段 | URL 形态 |
| --- | --- |
| 当前 Mock | `/mock-assets/...`（服务端拼绝对地址，如 `http://127.0.0.1:3100/mock-assets/...`） |
| 正式 | `https://static.example.com/...`（CDN / 对象存储公网域名） |

要求：

1. **库内存储**：保存 `object_key` / `media_id`（及必要元数据），**不**存 Base64，**不**把二进制写入 JSONB。
2. **API 输出**：返回可公开访问的完整 **HTTPS** URL（填入 `ImageResource.url`）。
3. **小程序**：直接使用 API 返回的 `url`；**不**拼接对象存储内部路径或 bucket 私有地址。
4. **替换与缓存**：图片更新使用**版本化文件名**（或带 content hash），避免 CDN 长期命中旧对象。
5. **微信合法域名**（正式环境必须配置）：

| 能力 | 域名用途 |
| --- | --- |
| `request` 合法域名 | API 主机，如 `api.example.com` |
| `downloadFile` 合法域名 | 静态资源 / CDN，如 `static.example.com` |
| `uploadFile` 合法域名 | 若小程序直传，则为实际上传网关域名；通常上传走 Admin，小程序仅读 |

开发阶段可用 Mock 静态资源；trial / release **禁止**依赖 `127.0.0.1` 或局域网图片地址。

---

## 7. Mock-only 功能隔离

下列能力**不得**迁移到正式 Django Mini API：

| Mock-only | 说明 |
| --- | --- |
| 请求头 `X-Mock-Scenario` | 场景切换 |
| 查询参数 `__scenario` | 同上 |
| `GET /api/profile?loggedIn=true` | 夹具切换登录态 |
| `normal` / `empty` / `error` / `slow` / `unauthorized` / `not-found` | 场景控制本身 |

约束：

- `trial` / `release` **不得**发送 Mock Header 或 `__scenario` 等参数
- 正式环境用真实 HTTP 401 / 403 / 404 / 500 与正式 `error.code`
- Mock 场景能力继续留在 `apps/mock-server`，供本地与自动化测试使用

---

## 8. 迁移分阶段方案

### Phase 0：冻结契约

| | |
| --- | --- |
| **输入** | 现有 Mock、`packages/shared`、本仓库文档 |
| **产出** | 冻结的公开 DTO / 路径映射表 / Mock-only 边界 |
| **验收** | 清单与契约文档一致；任意字段改名需评审 |
| **回滚** | 文档回退即可；无运行时依赖 |

### Phase 1：初始化 DVAdmin Django/DRF

| | |
| --- | --- |
| **输入** | Phase 0 契约；基础设施规划 |
| **产出** | `apps/backend`、`apps/portal` 骨架；PG / Redis / 存储 / Celery 连通；`/api/v1/mini/health` |
| **验收** | 健康检查与 Admin 登录可用；与旧 NestJS 无关 |
| **回滚** | 停用新目录部署；开发继续用 Mock |

### Phase 2：实现新闻中心

| | |
| --- | --- |
| **输入** | 新闻 Fixture、Revision / Snapshot 模型设计 |
| **产出** | Admin 发布流 + Mini `news` / `home` 相关接口；对象存储图片 |
| **验收** | 双后端对比测试通过；小程序新闻 Tab 可切 Django |
| **回滚** | 网关切回上一后端版本；或 develop 改回 Mock Base URL |

### Phase 3：实现产品、案例、服务

| | |
| --- | --- |
| **输入** | 对应 Fixture 与契约 |
| **产出** | Mini `products` / `cases` / `services`（及 brand 公开读） |
| **验收** | 列表/详情/空态/404 与 Mock 行为对齐 |
| **回滚** | 按模块关闭路由或回滚发布；前端仍可 Mock |

### Phase 4：实现 KB Life、班车和互动功能

| | |
| --- | --- |
| **输入** | kb-life Fixture；互动需求（如有） |
| **产出** | Mini `kb-life/*`、`profile` 真实鉴权 |
| **验收** | 班车/食堂等只读数据正确；profile 无 Mock-only 参数 |
| **回滚** | 同 Phase 3 |

### Phase 5：灰度联调

| | |
| --- | --- |
| **输入** | Phase 2–4 接口；trial 包 |
| **产出** | trial `apiBaseUrl` 指向正式 HTTPS；回归报告 |
| **验收** | 上线切换清单（第 11 节）中 trial 项全部勾选 |
| **回滚** | trial 改回上一 API 版本或暂缓提审；**不**把正式包指到本机 Mock |

### Phase 6：正式切换与回滚准备

| | |
| --- | --- |
| **输入** | Phase 5 通过；备份与监控就绪 |
| **产出** | release 指向正式 Mini API；回滚开关与上一镜像保留 |
| **验收** | 第 11 节清单全部完成；线上冒烟通过 |
| **回滚** | 见第 12 节（网关 / 镜像 / Snapshot），禁止生产切 Mock |

---

## 9. 双后端对比测试

对**相同业务语义**的接口，分别请求 Mock 与 Django，比较：

| 对比项 | 说明 |
| --- | --- |
| HTTP 状态码 | 成功 / 校验失败 / 未授权 / 不存在 |
| `ApiResponse` 结构 | `success`、`data`、`message`、错误外壳 |
| 必填字段 | DTO 必填键齐全 |
| 字段类型 | 字符串 / 数字 / 布尔 / 数组 / 对象 |
| 分页行为 | `page` / `pageSize` / `total` / 边界页 |
| 错误码 | `error.code` 与 HTTP 语义一致 |
| `richContent` | Block 类型集合与必填子字段 |
| 图片 URL | 绝对 HTTPS（正式）；可访问；非 Base64 |
| 空态 | 空列表为 `[]` |
| 404 | 无效 id、未发布、已归档等 |

建议流程：

1. 固定一组样例 ID（与 Fixture 公开 id 对齐或建立映射表）
2. Mock：`http://127.0.0.1:3100/api/...`
3. Django：`https://<host>/api/v1/mini/...`
4. 记录差异；仅允许文档已声明的差异（如 health 扩展字段）

**建议未来**增加自动化 contract test（对比 Mock fixture 与 Django OpenAPI / 响应）。**本次只补文档，不实现测试代码。**

---

## 10. 环境切换

配置入口：`apps/miniprogram/miniprogram/config/env.ts`（按 `envVersion` 选择）。**所有请求继续经过** `services/request.ts`。

| 环境 | `apiBaseUrl` 原则 | `dataSource` |
| --- | --- | --- |
| `develop` | 可用 `http://127.0.0.1:3100` 或电脑局域网 IP（真机） | 多为 `mock-server`；灰度时可临时指向 Django |
| `trial` | **必须** HTTPS 正式/预发域名 | `real-server` |
| `release` | **必须** HTTPS 正式域名 | `real-server` |

硬性约束：

- `trial` / `release` **禁止** `localhost`、`127.0.0.1`、局域网 IP、以及未替换的 `example.com` 占位地址
- **不允许**在页面代码中硬编码 API 地址
- 切换正式后端时主要改配置（及 endpoints 的 `/api/v1/mini` 前缀对齐），不改页面

示例（示意，域名以实际为准）：

```ts
// develop → Mock
{ apiBaseUrl: 'http://127.0.0.1:3100', dataSource: 'mock-server' }

// trial / release → Django Mini API
{ apiBaseUrl: 'https://api.example.com', dataSource: 'real-server' }
```

---

## 11. 上线切换清单

发布前逐项确认：

- [ ] Django 接口契约测试（含双后端对比）通过
- [ ] 数据迁移完成（含公开 ID / slug 稳定）
- [ ] Redis 缓存策略确认（键空间、TTL、发布失效）
- [ ] 对象存储 / CDN 域名可访问；图片为 HTTPS
- [ ] 微信合法域名配置完成（`request` / `downloadFile` / 如需 `uploadFile`）
- [ ] trial 环境回归完成（首页、新闻、产品、案例、服务、KB Life、我的）
- [ ] 鉴权与权限验证完成（Mini 公开读 + 需登录接口；Admin 写隔离）
- [ ] 日志、监控、告警可用
- [ ] 数据库备份完成
- [ ] 回滚开关可用（网关 / 版本 / Snapshot）
- [ ] **Mock Server 不被打包进正式小程序**（小程序包不含 `apps/mock-server`）

---

## 12. 回滚方案

正式 API 出现问题时：

1. **不要**让正式小程序切回本地 Mock Server（`127.0.0.1:3100` 对用户不可达，也不符合合规域名）。
2. 优先通过**网关 / 负载均衡**切流量、**后端版本回滚**，或从 **PublishedSnapshot** / 上一发布快照恢复读服务。
3. 保留：上一版本后端镜像、数据库迁移回滚预案、内容发布快照。
4. **禁止**将 `localhost`、局域网地址或 Mock 场景参数（`X-Mock-Scenario` / `__scenario`）用于生产回滚。

develop 本地仍可随时切回 `pnpm dev:mock`，与生产回滚路径分离。

---

## 13. 禁止事项

- 不让小程序直接访问 PostgreSQL、Redis 或对象存储**私有**地址
- 不在页面中直接导入 Fixture JSON
- 不让正式 Mini API 返回草稿、审核流水或未到发布时间的内容
- 不暴露数据库自增主键、AppSecret、存储密钥
- 不为迁移而重写已有页面
- **不删除** `apps/mock-server`（正式后端完成后仍保留）
- **不继续**在 `apps/server` 中实现正式业务
- 不把「迁移到 NestJS」写回文档或当作目标

---

## 附录：与旧文档步骤的对应关系

| 旧「第 N 步」表述 | 现位置 |
| --- | --- |
| 冻结契约 | Phase 0 + 第 4 节 |
| 按路径实现 | 第 3 节映射 + Phase 1–4 |
| 契约 / 对比测试 | 第 9 节 |
| Mock-only 隔离 | 第 7 节 |
| 改 Base URL | 第 10 节 |
| 上线与退役 NestJS | 第 11–13 节；`apps/server` 仅兼容参考 |
