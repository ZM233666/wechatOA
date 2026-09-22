# Project Case 管理端读接口（Mock Server 对接说明）

本文档描述 Mock Server 如何从 Django **project-case** 模块拉取项目案例，并映射为小程序现有 `/api/cases` 契约。**小程序页面与 UI 无需改动**。

## Django 接口

### 2.1 案例列表

```
GET {API_HOST}/api/project-case/cases/
Authorization: JWT {token}
```

| Query | 类型 | 说明 |
|-------|------|------|
| `page` | int | 页码，默认 1 |
| `limit` | int | 每页条数，默认 10 |
| `status` | string | Mock 固定传 `published` |
| `category` | string | 分类模糊匹配（可选） |
| `search` | string | 搜标题/作者/摘要/分类（可选） |

列表 **不含** `content_html`，详情需再调单条接口。

### 2.2 案例详情

```
GET {API_HOST}/api/project-case/cases/{id}/
Authorization: JWT {token}
```

详情含 `content_html` 富文本（`<img>` 路径可能为 `/media/...` 或完整 URL）。

## Mock Server 环境变量

```env
PROJECT_CASE_ENABLED=true
PROJECT_CASE_API_BASE_URL=http://127.0.0.1:8000
PROJECT_CASE_MEDIA_BASE_URL=http://127.0.0.1:8000
PROJECT_CASE_USERNAME=superadmin
PROJECT_CASE_PASSWORD=admin123456
PROJECT_CASE_LIMIT=100
```

- 登录：`POST /api/token/`（与其它模块相同）
- 启动时会 sync 列表；详情按需拉取并缓存
- 远程失败时回退本地 `fixtures/cases/*`

## 字段映射（Django → 小程序契约）

| Django 字段 | Mock `/api/cases` 字段 | 小程序展示 |
|-------------|------------------------|------------|
| `id` | `id`（字符串） | 列表/详情 id |
| `title_zh` / `title_en` | `title` | 标题 |
| `summary` | `summary` → `desc` | 摘要 |
| `cover_url` | `coverImage` | 封面 |
| `category` | `category.name` + `industry` | 分类 |
| `author` | `region` | 列表 meta 的 Region |
| `content_html` | `richContent` | 详情正文（`article-renderer`） |
| `publish_time` | `publishedAt` | 发布时间 |
| `author` | `region` → 详情 `meta` | `Writer: {author}`（无作者时不展示） |
| — | `background` / `solution` | 契约保留，详情页不再展示 |

## 可见性规则

Mock 仅向小程序暴露：

- `status = published`
- `visible_range = all`

## 小程序调用（不变）

| 方法 | 路径 |
|------|------|
| GET | `/api/cases?page=1&pageSize=20` |
| GET | `/api/cases/:id` |
| GET | `/api/cases/categories` |

## 实现文件

| 文件 | 职责 |
|------|------|
| `project-case.client.ts` | JWT 登录、列表/详情 fetch |
| `project-case.mapper.ts` | Django row → legacy CaseSummary/CaseDetail |
| `project-case.service.ts` | TTL 缓存、sync、fixture 回退 |
| `case-source.service.ts` | controller 薄封装 |
| `cases.controller.ts` | async，调用 source service |
