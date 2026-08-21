# Mock API 清单

正式后端状态列当前均为「未实现」。路径与 DTO 冻结后由 DVAdmin Django/DRF（`apps/backend`）按同契约实现；小程序走 `/api/v1/mini/*`，Portal 走 `/api/v1/admin/*`。

| Method | Path | 页面 | 请求参数 | 响应 DTO | Fixture | 正式后端 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/health` | 首页开发检查 | - | `HealthData` | - | 已有不同 payload | Mock 含 `service/mode/version` |
| GET | `/api/app/config` | 预留 | - | `AppConfig` | `fixtures/app/config.json` | 未实现 | feature flags |
| GET | `/api/home` | 首页 | - | `HomeData` | `fixtures/home/home.json` + 已发布新闻筛选 | 未实现 | `latestNews` 由公开新闻映射，最多 3 条 |
| GET | `/api/news/categories` | 新闻 | - | `{ items: NewsCategory[] }` | `fixtures/news/categories.json` | 未实现 | `articleCount` 只统计公开文章；含动态 `all` |
| GET | `/api/news` | 新闻列表 | `page,pageSize,category,keyword,featured,pinned` | `PaginatedData<NewsSummary>` | `fixtures/news/articles/*.json` | 未实现 | 不含正文；由完整文章映射 |
| GET | `/api/news/:id` | 新闻详情 | `id` 或 `slug` | `NewsDetail` | 同上 | 未实现 | 含 `richContent`；draft/scheduled/archived 为 404 |
| GET | `/api/brand` | 品牌 | - | Brand overview | `fixtures/brand/overview.json` | 未实现 | |
| GET | `/api/brand/articles` | 预留 | 分页 | 文章摘要分页 | `fixtures/brand/articles/` | 未实现 | |
| GET | `/api/brand/articles/:id` | 预留 | `id` | `ArticleDetail` | 同上 | 未实现 | |
| GET | `/api/products/categories` | 产品列表 | - | `ProductCategoriesData` | `fixtures/products/categories.json` | 未实现 | 含 hero slides |
| GET | `/api/products` | 预留/筛选 | `page,pageSize,category,keyword` | `PaginatedData<ProductSummary>` | `fixtures/products/list.json` | 未实现 | |
| GET | `/api/products/:id` | 产品详情 | `id` | `ProductDetail` | `fixtures/products/details/` | 未实现 | |
| GET | `/api/cases/categories` | 预留 | - | `CaseCategory[]` | `fixtures/cases/categories.json` | 未实现 | |
| GET | `/api/cases` | 案例列表 | `page,pageSize,category,keyword` | `PaginatedData<CaseSummary>` | `fixtures/cases/list.json` | 未实现 | |
| GET | `/api/cases/:id` | 案例详情 | `id` | `CaseDetail` | `fixtures/cases/details/` | 未实现 | |
| GET | `/api/services` | 服务 Tab | - | `ServicesPageData` | `fixtures/services/services.json` | 未实现 | Digital CBM / FastPHM / Insights |
| GET | `/api/services/:id` | 预留 | `id` | `ServiceDetail` | 同上 `details` | 未实现 | |
| GET | `/api/kb-life/entries` | KB Life | - | `KbLifeEntriesData` | `fixtures/kb-life/entries.json` | 未实现 | |
| GET | `/api/kb-life/canteen` | 食堂 | - | `CanteenData` | `fixtures/kb-life/canteen.json` | 未实现 | |
| GET | `/api/kb-life/shuttle` | 班车 | - | `ShuttleData` | `fixtures/kb-life/shuttle.json` | 未实现 | |
| GET | `/api/kb-life/activities` | 活动入口 | - | `ActivitiesData` | `fixtures/kb-life/activities.json` | 未实现 | |
| GET | `/api/profile` | 我的 | `loggedIn=true` 可选（Mock-only） | `ProfileData` | `guest.json` / `logged-in.json` | 未实现 | 默认访客；`loggedIn` 不得进入正式后端 |

开发场景参数 `__scenario` / `X-Mock-Scenario` 以及 `GET /api/profile?loggedIn=true` 均为 Mock-only，不进入生产契约。正式后端不实现 `__scenario`；小程序 trial/release 不得发送 `X-Mock-Scenario`。
