# 新闻 fixtures（回退源）

联调默认优先管理端 `article-content`（`NEWS_ARTICLE_ENABLED=true`）。

本目录保留完整 JSON，在以下情况作为回退：

- 管理端 `127.0.0.1:8000` 未启动
- Mock 启动时 article 同步失败
- 关闭 `NEWS_ARTICLE_ENABLED` 做纯离线演示

开启远程源且同步成功时，接口返回 `article-*` ID；回退本地时使用 `news-001` 等 fixture ID。
