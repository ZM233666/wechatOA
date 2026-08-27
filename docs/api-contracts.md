# API 契约

本文件描述 Mock Server 与未来 Django/DRF（DVAdmin）共用的响应约定。类型定义在 `packages/shared`（未来逐步改为 OpenAPI 生成）。

迁移路径、Mini 路径映射、分阶段方案与回滚原则见 [mock-to-real-backend.md](./mock-to-real-backend.md)。正式小程序请求前缀为 `/api/v1/mini/*`；Portal 为 `/api/v1/admin/*`。

## 迁移期冻结规则（摘要）

下列项在 Mock → Django 迁移中不得随意改动：

- `ApiResponse<T>` / 错误外壳与 `error.code`
- 分页结构；空列表为 `[]` 而非 `null`
- 日期 ISO 8601；稳定公开 ID（不暴露自增主键）
- `ImageResource`；`richContent` Block 字段
- 列表不含完整 `richContent`；详情才含；列表与详情 ID 一致

## ApiResponse

```json
{
  "success": true,
  "data": {},
  "message": "success",
  "requestId": "mock_xxx",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

`requestId`、`timestamp` 为可选扩展字段。旧 NestJS 骨架的 health 接口可以暂不返回它们；正式 Mini/Admin API 建议齐全。

## ErrorResponse

```json
{
  "success": false,
  "data": null,
  "message": "Resource not found",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "details": null
  },
  "requestId": "mock_xxx",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

业务错误不得一律返回 HTTP 200。

## KB Life 路径

接口文档必须使用完整路径，禁止省略业务前缀。

当前 Mock：

- `/api/kb-life/entries`
- `/api/kb-life/canteen`
- `/api/kb-life/shuttle`
- `/api/kb-life/activities`

正式 Mini API：

- `/api/v1/mini/kb-life/entries`
- `/api/v1/mini/kb-life/canteen`
- `/api/v1/mini/kb-life/shuttle`
- `/api/v1/mini/kb-life/activities`

## Mock-only 能力边界

以下能力仅属于独立 Mock API Server，用于本地联调和页面状态演示：

- 请求头 `X-Mock-Scenario`
- 查询参数 `__scenario`
- `GET /api/profile?loggedIn=true`（切换登录夹具）

约束：

- Mock-only 参数不得进入正式 Django API（`/api/v1/mini/*`、`/api/v1/admin/*`）
- 小程序生产环境（trial / release）不得发送 `X-Mock-Scenario`
- 正式后端不实现 `__scenario`，也不根据 `loggedIn` 切换夹具

## Pagination

列表 `data`：

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 30,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

查询参数：`page`（默认 1）、`pageSize`（默认 10，最大 50）。非法值返回 HTTP 400。

## ImageResource

```json
{
  "url": "/mock-assets/news/news-001-cover.png",
  "alt": "新闻封面",
  "width": 1200,
  "height": 675,
  "aspectRatio": 1.7778
}
```

服务端返回前将 `url` 转为绝对地址。禁止 Base64、本机绝对路径、硬编码 `127.0.0.1`。

正式环境：`url` 应为 CDN / 对象存储公网 HTTPS（如 `https://static.example.com/...`）；库内存 `object_key` / `media_id`，小程序不拼接存储内部路径。详见迁移文档「图片迁移规则」。

## 列表与详情

- 列表返回摘要，不含完整 `richContent`
- 详情返回完整结构化正文
- 列表 ID 必须能打开对应详情
- 新闻公开契约详见 `docs/news-content-contract.md`
- Mini API 只读已发布快照；草稿 / 未到发布时间 / 归档不对小程序暴露

## 空值规范

- 空列表返回 `[]`，不返回 `null`
- 可选字符串缺失时保持一致，不要时而 `""` 时而 `null`
- Profile 未登录时 `user` 可为访客占位对象或 `null`，字段集合用 `[]`

## 日期规范

统一 ISO 8601 字符串，例如 `2024-05-20T08:00:00.000Z`。

## ID 规范

稳定字符串：`news-001`、`product-001`、`case-001`。禁止启动时随机生成。

## HTTP 状态码

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 参数错误 `VALIDATION_ERROR` |
| 401 | 未授权 `UNAUTHORIZED` |
| 404 | 不存在 `RESOURCE_NOT_FOUND` |
| 500 | 内部错误 `INTERNAL_ERROR` / Mock `MOCK_INTERNAL_ERROR` |
