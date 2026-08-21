# 从 Mock Server 迁移到 DVAdmin Django/DRF

正式业务后端为 **DVAdmin + Django/DRF**（未来目录 `apps/backend`），管理端为 **DVAdmin Vue Portal**（未来目录 `apps/portal`）。小程序与 Portal **共用同一套 Django 业务后端**，不单独建设小程序后端。

旧 NestJS 应用 `apps/server` **已停止扩展**，不是迁移目标。

## 第一步：冻结 API 契约

以 `packages/shared`、`docs/api-contracts.md`、`docs/mock-api-inventory.md` 为准，不要在迁移时随意改字段名。  
未来类型将逐步改为 OpenAPI 生成，但公开字段语义应与现有 Mock DTO 对齐。

## 第二步：Django/DRF 按契约实现（分端隔离）

在未来的 `apps/backend` 中实现业务，并按端隔离路由：

| 端 | 前缀 | 调用方 |
| --- | --- | --- |
| Mini API | `/api/v1/mini/*` | 微信小程序 |
| Admin API | `/api/v1/admin/*` | DVAdmin Portal |

公开列表 / 详情等字段应与当前 Mock 契约兼容（可选或默认值），不要让小程序分支判断“是不是 Mock”。

当前 Mock 仍使用 `/api/...` 路径；切换到正式后端时，小程序 Base URL + Mini 前缀对齐即可，页面与 services 层路径约定保持稳定。

## 第三步：契约测试

对比 Mock 与真实后端的：

- HTTP 状态码
- `ApiResponse` 外壳
- 列表分页结构
- 详情 `richContent` block 集合
- `ImageResource` 形态（绝对 URL / CDN URL）

`__scenario`、`X-Mock-Scenario`、`GET /api/profile?loggedIn=true` 等 Mock 特有能力**不得**进入生产响应，也不得作为正式 Django API 的一部分实现。

## Mock-only 能力隔离

正式后端和小程序生产包必须遵守：

- Mock-only 参数不得进入正式后端 API：`X-Mock-Scenario`、`__scenario`、`GET /api/profile?loggedIn=true`
- 小程序 trial / release 不得自动或手动附加 `X-Mock-Scenario`
- 正式后端不实现 `__scenario`，不根据 Mock 场景头切换 empty / error / unauthorized

生产环境用真实 401/403/404，而不是 Mock 场景参数。

## 第四步：基础设施落地

| 组件 | 职责 |
| --- | --- |
| PostgreSQL | 正式主数据库 |
| Redis | 缓存、限流、锁 |
| 对象存储 + CDN | 图片与附件；URL 进入 API，二进制不进 JSONB |
| Celery + RabbitMQ | 异步任务 |

新闻内容建议：**Revision + PublishedSnapshot + JSONB**；图片走对象存储。

## 第五步：修改小程序 Base URL

`apps/miniprogram/miniprogram/config/env.ts`：

```ts
{
  apiBaseUrl: 'https://正式接口域名',
  dataSource: 'real-server',
}
```

请求应落到 Mini API（`/api/v1/mini/*`）。不要改页面；services / endpoints 仅按前缀约定做最小对齐。

## 第六步：分别验证

- normal：首页、新闻列表/详情、图片
- empty：空列表 + empty-state
- error：HTTP 错误 + 页面 error 态
- unauthorized：401 提示

生产环境用真实 401/403/404，而不是 Mock 场景参数。

## 第七步：停止 Mock Server / 退役 NestJS 骨架

1. 停止 `pnpm dev:mock`。可保留 `apps/mock-server` 作为契约样例，或在正式接口稳定后删除。删除时不要动小程序包内 `assets/`。
2. `apps/server` 不承接迁移；保留兼容命令即可，最终可按需归档或删除。

## 约束

- 页面不能感知后端是真是假
- services 层不能因切换真实后端而重写业务逻辑
- DTO 字段不要在迁移时改名
- Mock 特有字段和场景功能不能进入生产响应
- `X-Mock-Scenario`、`__scenario`、`profile?loggedIn=true` 保持 Mock-only
- **不要**把迁移目标写成 NestJS / `apps/server`
