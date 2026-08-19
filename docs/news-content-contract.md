# 新闻内容契约

本文件描述新闻中心**公开 API** 的数据契约。内部 Fixture 可以包含发布状态等 CMS 字段，但公开 DTO 不得原样返回完整 Fixture。

类型定义：`packages/shared/src/types/news.ts`、`packages/shared/src/types/article.ts`。

## NewsCategory

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定分类 ID。`all` 由服务动态生成，表示全部 |
| `name` | 分类名称 |
| `articleCount` | 仅统计当前可见的已发布文章 |

`GET /api/news/categories` 返回 `{ items: NewsCategory[] }`。

## NewsSummary

列表、首页 `latestNews`、详情 `relatedArticles` 使用该摘要，**不含** `richContent`。

| 字段 | 说明 |
| --- | --- |
| `id` / `slug` | 稳定 ID 与唯一 slug |
| `title` / `subtitle` / `summary` | 标题、副标题、列表摘要 |
| `category` | `{ id, name }`，必须存在于 `categories.json` |
| `coverImage` / `thumbnailImage` | 封面必填；缩略图可缺省，列表回退封面 |
| `publishedAt` | ISO 8601 |
| `featured` / `pinned` | 精选 / 置顶 |
| `tags` | `{ id, name }[]` |

公开摘要**不包含**：`status`、`createdAt`、`updatedAt`、`scheduledAt`、`placement`、`richContent`。

## NewsDetail

在 NewsSummary 基础上增加：

| 字段 | 说明 |
| --- | --- |
| `author` | `{ id, name, avatar }` |
| `source` | `{ name, url }` |
| `richContent` | 结构化 Block，不是 HTML |
| `relatedArticles` | 最多 3 条 NewsSummary，不含当前文章 |
| `share` | `{ title, summary, imageUrl }` |

## Publication status（仅 Fixture / CMS 内部）

```ts
type NewsPublicationStatus = 'draft' | 'scheduled' | 'published' | 'archived';
```

公开 API 不返回该字段。

## Placement（仅 Fixture / CMS 内部）

```ts
{
  showOnHome: boolean;
  showOnBanner: boolean;
  featured: boolean;
  pinned: boolean;
  sortOrder: number;
}
```

公开列表把 `featured`、`pinned` 展平到 NewsSummary。

## Share

`share.title`、`share.summary`、`share.imageUrl`。缺失时小程序回退到文章标题和封面。分享路径只带文章 `id`，不得带 `__scenario`。

## richContent

沿用 `ArticleContentBlock`：heading / paragraph / image / quote / list / divider / callout / link。

受控属性：

- `align`: `left` \| `center` \| `right`（缺省 left）
- `image.layout`: `normal` \| `wide` \| `full`（缺省 normal）
- `callout.variant`: `info` \| `warning` \| `success` \| `exclusive`
- `marks`: `bold` \| `italic` \| `underline`

禁止 style 字符串、className、script、iframe、事件属性和 `javascript:` URL。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/news/categories` | 分类 + 公开文章计数 |
| GET | `/api/news` | 公开列表分页 |
| GET | `/api/news/:id` | 详情，`:id` 可为稳定 id 或 slug |
| GET | `/api/home` | 聚合首页：`latestNews` 最多 3 条；`banners` 由 `showOnBanner` 新闻生成 |

列表查询：`page`、`pageSize`、`category`、`keyword`、`featured`、`pinned`、`sort=latest`。

`keyword` 只搜索 title、subtitle、summary、tags.name，不搜索正文。

不新增 `GET /api/news/featured`：首页新闻由 `/api/home` 提供。

## 排序

1. `pinned=true` 优先  
2. `sortOrder` 越大越靠前  
3. `publishedAt` 越新越靠前  
4. `id` 稳定兜底  

## 可见性

读取 Fixture 时过滤，无定时任务：

1. 仅 `status=published`
2. 必须有 `publishedAt`
3. `publishedAt` 不得晚于当前时间（可用 `MOCK_NOW` 固定测试时钟）
4. `draft` / 未到点的 `scheduled` / `archived` 不出现在首页、Banner、列表、搜索、分类统计
5. 上述文章详情统一 404，文案不泄露内部状态

## 404

ID 不存在、draft、未到点 scheduled、archived、`publishedAt` 晚于当前时间，均返回 `RESOURCE_NOT_FOUND` + `Resource not found`。
