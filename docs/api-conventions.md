# API 约定

## 前缀

### 当前（Mock / 旧 NestJS 骨架）

- 业务接口全局前缀：`/api`
- Mock 与旧骨架由环境变量 `API_PREFIX` 控制，默认 `api`

示例：

```text
GET /api/health
```

### 正式后端（未来 Django/DRF）

小程序与 Portal 共用同一套业务后端，按端隔离：

| 端 | 前缀 | 调用方 |
| --- | --- | --- |
| Mini API | `/api/v1/mini/*` | 微信小程序 |
| Admin API | `/api/v1/admin/*` | DVAdmin Portal |

迁移时以契约字段为准；路径前缀从 Mock 的 `/api/...` 对齐到 Mini/Admin 版本化前缀。
## RESTful 路径规范

- 使用名词复数或资源名：`/api/users`、`/api/orders`
- 嵌套资源适度使用：`/api/users/:id/orders`
- 避免动词路径（健康检查等运维接口除外）

## HTTP 方法规范

| 方法 | 用途 |
| --- | --- |
| `GET` | 查询 |
| `POST` | 创建 |
| `PUT` | 全量更新 |
| `PATCH` | 部分更新 |
| `DELETE` | 删除 |

## 成功响应格式

```json
{
  "success": true,
  "data": {},
  "message": "success"
}
```

`data` 可为对象、数组或基础类型，由具体接口定义。

当前健康检查：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-08-17T03:00:00.000Z"
  },
  "message": "success"
}
```

## 错误响应格式

建议统一为：

```json
{
  "success": false,
  "data": null,
  "message": "错误说明"
}
```

也可在后续引入 `code`、`errors` 字段以支持校验错误明细。小程序 `request.ts` 对非 2xx 状态码统一 `reject`。

## 状态码规范

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突 |
| 422 | 语义校验失败 |
| 500 | 服务器内部错误 |

## 分页格式建议

列表接口建议：

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  },
  "message": "success"
}
```

查询参数建议：`page`、`pageSize`。
