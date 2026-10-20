# Mock API 清单

正式后端状态列当前均为「未实现」。路径与 DTO 冻结后由 DVAdmin Django/DRF（`apps/backend`）按同契约实现；小程序走 `/api/v1/mini/*`，Portal 走 `/api/v1/admin/*`。完整迁移映射、分阶段方案与回滚原则见 [mock-to-real-backend.md](./mock-to-real-backend.md)。

| Method | Path | 页面 | 请求参数 | 响应 DTO | Fixture | 正式后端 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/health` | 首页开发检查 | - | `HealthData` | - | 已有不同 payload | Mock 含 `service/mode/version` |
| GET | `/api/app/config` | 预留 | - | `AppConfig` | `fixtures/app/config.json` | 未实现 | feature flags |
| GET | `/api/home` | 首页 | - | `HomeData` | `fixtures/home/home.json` + 已发布新闻筛选 | 未实现 | `latestNews` 由公开新闻映射，最多 3 条 |
| GET | `/api/news/categories` | 新闻 | - | `{ items: NewsCategory[] }` | `article-content`（优先）/ `fixtures/news/categories.json` | 未实现 | `NEWS_ARTICLE_ENABLED` 时从管理端同步；含动态 `all` |
| GET | `/api/news` | 新闻列表 | `page,pageSize,category,keyword,featured,pinned` | `PaginatedData<NewsSummary>` | `article-content` / fixtures | 未实现 | 管理端列表无 `content_html`；摘要来自 `summary`/标题 |
| GET | `/api/news/:id` | 新闻详情 | `id` 或 `slug` | `NewsDetail` | 同上 | 未实现 | 按需 `GET .../content/:id/` 拉正文；`content_html`→`contentHtml`/`richContent`；支持 `article-{id}` |
| GET | `/api/brand` | 品牌 | - | Brand overview | `fixtures/brand/overview.json` | 未实现 | |
| GET | `/api/brand/articles` | 预留 | 分页 | 文章摘要分页 | `fixtures/brand/articles/` | 未实现 | |
| GET | `/api/brand/articles/:id` | 预留 | `id` | `ArticleDetail` | 同上 | 未实现 | |
| GET | `/api/products/categories` | 产品列表 | - | `ProductCategoriesData` | `fixtures/products/categories.json` | 未实现 | 含 hero slides |
| GET | `/api/products` | 预留/筛选 | `page,pageSize,category,keyword` | `PaginatedData<ProductSummary>` | `fixtures/products/list.json` | 未实现 | |
| GET | `/api/products/:id` | 产品详情 | `id` | `ProductDetail` | `fixtures/products/details/` | 未实现 | |
| GET | `/api/cases/categories` | 预留 | - | `CaseCategory[]` | `fixtures/cases/categories.json` | 未实现 | |
| GET | `/api/cases` | 案例列表 | `page,pageSize,category,keyword` | `PaginatedData<CaseSummary>` | `fixtures/cases/list.json` | 未实现 | |
| GET | `/api/cases/:id` | 案例详情 | `id` | `CaseDetail` | `fixtures/cases/details/` | 未实现 | |
| GET | `/api/services` | 服务 Tab | - | `ServicesPageData` | `fixtures/services/services.json` | 未实现 | Digital CBM / My Dashboard / Insights |
| GET | `/api/services/my-dashboard/modules` | My Dashboard 二级 | - | `{ items: MyDashboardModule[] }` | `services.json` → `myDashboardModules` | 未实现 | 首期模块：Fast PHM、FTQ System；点击业务功能待下一阶段 |
| GET | `/api/services/insights` | KB Insights 列表 | - | `{ items: InsightReportSummary[] }` | `fixtures/services/insights/*.json` + MinIO `kb-insights/`（缓存 `runtime/minio/kb-insights/`）/ 可选本地 `files/*.pdf` | 未实现 | 有 `pdfFile` 时返回绝对化 `pdfUrl` |
| GET | `/api/services/insights/:id` | KB Insights 详情 | `id` | `InsightReport` | 同上 | 未实现 | PDF 渲成 `sheet` 页走页内阅读器；无 PDF 时回退 JSON `pages` |
| GET | `/api/services/:id` | 预留 | `id` | `ServiceDetail` | 同上 `details` | 未实现 | |
| GET | `/api/kb-life/entries` | KB Life | - | `KbLifeEntriesData` | `fixtures/kb-life/entries.json` | 未实现 | |
| GET | `/api/kb-life/canteen` | 食堂 | `location` | `CanteenData` | `fixtures/kb-life/locations/*/canteen.json` | 未实现 | |
| GET | `/api/kb-life/shuttle` | 班车 | `location` | `ShuttleData` | `MinIO `suzhou/shuttle-bus/` / 本地 Shuttlebus/*.pdf`（Suzhou）或 `locations/*/shuttle.json` | 未实现 | 苏州优先解析 PDF |
| GET | `/api/kb-life/activities` | 活动入口 | - | `ActivitiesData` | `fixtures/kb-life/activities.json` | 未实现 | |
| GET | `/api/kb-life/wetalk` | WeTalk 列表 | - | `{ items: WetalkIssueSummary[] }` | `fixtures/kb-life/wetalk/*.json` + MinIO `wetalk/`（缓存 `runtime/minio/wetalk/`）/ 可选本地 `files/*.pdf` | 未实现 | 有 `pdfFile` 时返回绝对化 `pdfUrl` |
| GET | `/api/kb-life/wetalk/:id` | WeTalk 详情 | `id` | `WetalkIssue` | 同上 | 未实现 | PDF 渲成 `sheet` 页走页内阅读器；无 PDF 时回退 JSON `pages` |
| GET | `/api/kb-life/campus-map` | 园区地图 | `location` | `CampusMapData` | `CAMPUS_MAP_ENABLED` 时 `GET /api/campus-map/files/` + fixture 标题/封面；否则 `locations/*/campus-map.json` + PDF | 未实现 | 有 PDF 时返回 sheet pages + pdfUrl，前端走页内阅读器 |
| GET | `/api/kb-life/holiday-calendar` | 假日日历 | `location` | `HolidayCalendarData` | `fixtures/kb-life/locations/*/holiday.json` | 未实现 | |
| GET | `/api/kb-life/guidance-documents` | 指导文件入口列表 | — | `GuidanceDocumentsData` | `fixtures/kb-life/guidance-documents.json` | 未实现 | **访客可读** |
| GET | `/api/kb-life/handbook` | 员工手册 | `loginCode` | `EmployeeHandbookData` | `fixtures/kb-life/handbook.json` + MinIO/本地 PDF | 未实现 | 须 Employee 身份 |
| GET | `/api/kb-life/financial-handbook` | 财务指导手册（注意事项 + 使用手册） | 否（访客可读） | `FinancialGuidanceHandbookData` | `fixtures/kb-life/financial-handbook.json` + MinIO `finance-handbook/` 多 PDF + 可选 `FINANCIAL_HANDBOOK_*` | Mock 已接 | `sections[]`：`notes` / `manual`；管理端 API 暂映射至 `manual` |
| GET | `/api/kb-life/care` | 员工关怀 | `loginCode` | `EmployeeCareData` | `LOCAL_GLOBAL_CARE_ENABLED` 时 `GET /api/local-global-care/care/current/` 映射；否则 `fixtures/kb-life/care.json` | 未实现 | 须已绑定（Employee 或 Customer） |
| GET | `/api/kb-life/open-positions` | 在聘岗位列表 | — | `OpenPositionsListData` | `JOB_OPENINGS_ENABLED` 时 `article-content?content_type=job_openings`；否则 `fixtures/kb-life/open-positions.json` | 未实现 | **访客可读**（已发布岗位） |
| GET | `/api/kb-life/open-positions/:id` | 在聘岗位详情 | — | `OpenPositionDetail` | 同上 + 详情拉取 `content/{id}/` | 未实现 | 公开 id 形如 `job-{cmsId}` |
| GET | `/api/profile` | 我的 | `loginCode`（wx.login，与身份绑定同一 openid） | `ProfileData` | 按绑定 `roleLabel` 选 guest / customer / logged-in 夹具 | 未实现 | 未绑定为访客；禁止 `loggedIn` / `role` query |
| GET | `/api/profile/identity-binding` | 身份绑定状态 | `loginCode`（wx.login） | `IdentityBindingStatus` | 内存 + `identity-bind-registry.json` | 未实现 | 按 openid 查是否已绑定 |
| POST | `/api/profile/identity-binding` | 身份绑定提交 | Body: `companyEmail`, `loginCode` | `{ bound, binding }` | 同上 | 未实现 | 完整邮箱或域名后缀匹配；成功写 openid↔邮箱 |

开发场景参数 `__scenario` / `X-Mock-Scenario` 均为 Mock-only，不进入生产契约。正式后端不实现 `__scenario`；小程序 trial/release 不得发送 `X-Mock-Scenario`。
