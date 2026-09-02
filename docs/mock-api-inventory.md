# Mock API 清单

正式后端状态列当前均为「未实现」。路径与 DTO 冻结后由 DVAdmin Django/DRF（`apps/backend`）按同契约实现；小程序走 `/api/v1/mini/*`，Portal 走 `/api/v1/admin/*`。完整迁移映射、分阶段方案与回滚原则见 [mock-to-real-backend.md](./mock-to-real-backend.md)。

| Method | Path | 页面 | 请求参数 | 响应 DTO | Fixture | 正式后端 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/health` | 首页开发检查 | - | `HealthData` | - | 已有不同 payload | Mock 含 `service/mode/version` |
| GET | `/api/app/config` | 预留 | - | `AppConfig` | `fixtures/app/config.json` | 未实现 | feature flags |
| GET | `/api/home` | 首页 | - | `HomeData` | `fixtures/home/home.json` + 已发布新闻筛选 | 未实现 | `latestNews` 由公开新闻映射，最多 3 条 |
| GET | `/api/news/categories` | 新闻 | - | `{ items: NewsCategory[] }` | `article-content`（优先）/ `fixtures/news/categories.json` | 未实现 | `NEWS_ARTICLE_ENABLED` 时从管理端同步；含动态 `all` |
| GET | `/api/news` | 新闻列表 | `page,pageSize,category,keyword,featured,pinned` | `PaginatedData<NewsSummary>` | `article-content` / fixtures | 未实现 | 不含正文；HTML 转 `richContent` 后映射摘要 |
| GET | `/api/news/:id` | 新闻详情 | `id` 或 `slug` | `NewsDetail` | 同上 | 未实现 | `content_html`→`richContent`；支持 `article-{id}` |
| GET | `/api/brand` | 品牌 | - | Brand overview | `fixtures/brand/overview.json` | 未实现 | |
| GET | `/api/brand/articles` | 预留 | 分页 | 文章摘要分页 | `fixtures/brand/articles/` | 未实现 | |
| GET | `/api/brand/articles/:id` | 预留 | `id` | `ArticleDetail` | 同上 | 未实现 | |
| GET | `/api/products/categories` | 产品列表 | - | `ProductCategoriesData` | `fixtures/products/categories.json` | 未实现 | 含 hero slides |
| GET | `/api/products` | 预留/筛选 | `page,pageSize,category,keyword` | `PaginatedData<ProductSummary>` | `fixtures/products/list.json` | 未实现 | |
| GET | `/api/products/:id` | 产品详情 | `id` | `ProductDetail` | `fixtures/products/details/` | 未实现 | |
| GET | `/api/cases/categories` | 预留 | - | `CaseCategory[]` | `fixtures/cases/categories.json` | 未实现 | |
| GET | `/api/cases` | 案例列表 | `page,pageSize,category,keyword` | `PaginatedData<CaseSummary>` | `fixtures/cases/list.json` | 未实现 | |
| GET | `/api/cases/:id` | 案例详情 | `id` | `CaseDetail` | `fixtures/cases/details/` | 未实现 | |
| GET | `/api/services` | 服务 Tab | - | `ServicesPageData` | `fixtures/services/services.json` | 未实现 | Digital CBM / MyDashboard / Insights |
| GET | `/api/services/insights` | KB Insights 列表 | - | `{ items: InsightReportSummary[] }` | `fixtures/services/insights/*.json` + MinIO `kb-insights/`（缓存 `runtime/minio/kb-insights/`）/ 可选本地 `files/*.pdf` | 未实现 | 有 `pdfFile` 时返回绝对化 `pdfUrl` |
| GET | `/api/services/insights/:id` | KB Insights 详情 | `id` | `InsightReport` | 同上 | 未实现 | PDF 渲成 `sheet` 页走页内阅读器；无 PDF 时回退 JSON `pages` |
| GET | `/api/services/:id` | 预留 | `id` | `ServiceDetail` | 同上 `details` | 未实现 | |
| GET | `/api/kb-life/entries` | KB Life | - | `KbLifeEntriesData` | `fixtures/kb-life/entries.json` | 未实现 | |
| GET | `/api/kb-life/canteen` | 食堂 | `location` | `CanteenData` | `fixtures/kb-life/locations/*/canteen.json` | 未实现 | |
| GET | `/api/kb-life/shuttle` | 班车 | `location` | `ShuttleData` | `MinIO `suzhou/shuttle-bus/` / 本地 Shuttlebus/*.pdf`（Suzhou）或 `locations/*/shuttle.json` | 未实现 | 苏州优先解析 PDF |
| GET | `/api/kb-life/activities` | 活动入口 | - | `ActivitiesData` | `fixtures/kb-life/activities.json` | 未实现 | |
| GET | `/api/kb-life/wetalk` | WeTalk 列表 | - | `{ items: WetalkIssueSummary[] }` | `fixtures/kb-life/wetalk/*.json` + MinIO `wetalk/`（缓存 `runtime/minio/wetalk/`）/ 可选本地 `files/*.pdf` | 未实现 | 有 `pdfFile` 时返回绝对化 `pdfUrl` |
| GET | `/api/kb-life/wetalk/:id` | WeTalk 详情 | `id` | `WetalkIssue` | 同上 | 未实现 | PDF 渲成 `sheet` 页走页内阅读器；无 PDF 时回退 JSON `pages` |
| GET | `/api/kb-life/campus-map` | 园区地图 | `location` | `CampusMapData` | `locations/*/campus-map.json` + 可选 `Map/*.pdf` | 未实现 | 有 PDF 时返回 sheet pages + pdfUrl，前端走页内阅读器 |
| GET | `/api/kb-life/holiday-calendar` | 假日日历 | `location` | `HolidayCalendarData` | `fixtures/kb-life/locations/*/holiday.json` | 未实现 | |
| GET | `/api/profile` | 我的 | `loggedIn=true` 可选（Mock-only） | `ProfileData` | `guest.json` / `logged-in.json` | 未实现 | 默认访客；`loggedIn` 不得进入正式后端 |

开发场景参数 `__scenario` / `X-Mock-Scenario` 以及 `GET /api/profile?loggedIn=true` 均为 Mock-only，不进入生产契约。正式后端不实现 `__scenario`；小程序 trial/release 不得发送 `X-Mock-Scenario`。
