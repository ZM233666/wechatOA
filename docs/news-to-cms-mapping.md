# 新闻 JSON 与未来 CMS 映射

当前 `apps/mock-server/fixtures/news/articles/*.json` 模拟的是 **CMS 发布完成后的公开内容**，不是编辑器草稿库。

小程序只消费公开 DTO，不感知数据来自 JSON、数据库还是 CMS。

## 字段映射

| 未来 CMS 字段 | 当前 JSON 字段 |
| --- | --- |
| 文章标题 | `title` |
| 副标题 | `subtitle` |
| 摘要 | `summary` |
| 分类 | `category` |
| 作者 | `author` |
| 来源 | `source` |
| 封面 | `coverImage` |
| 缩略图 | `thumbnailImage` |
| 标签 | `tags` |
| 正文编辑器输出 | `richContent` |
| 发布状态 | `status` |
| 创建时间 | `createdAt` |
| 更新时间 | `updatedAt` |
| 发布时间 | `publishedAt` |
| 定时发布时间 | `scheduledAt` |
| 首页推荐 | `placement.showOnHome` |
| 首页滚动 Banner | `placement.showOnBanner` |
| 精选 | `placement.featured` |
| 置顶 | `placement.pinned` |
| 排序权重 | `placement.sortOrder` |
| 相关文章 | `relatedArticleIds` |
| 分享设置 | `share` |
| 稳定别名 | `slug` |

## 发布结果

正式后端（Django/DRF Mini API）应输出与现有公开契约相同的 JSON：

- 列表：NewsSummary，无正文
- 详情：NewsDetail，含 `richContent` 与 `relatedArticles`
- 首页：`latestNews` 仍走 `/api/home` 聚合

内部状态（`draft` / `scheduled` / `archived`）不得出现在公开接口。

## 编辑器约束

未来 CMS **不应直接输出任意 HTML**。

正式后端要把编辑器内容转换成相同的结构化 Block：

- heading / paragraph / image / quote / list / divider / callout / link
- 只允许枚举后的 `align`、`layout`、`variant`、`marks`

这样小程序 `article-renderer` 无需因 CMS 上线而重写。
