# 从 Mock Server 迁移到 NestJS

## 第一步：冻结 API 契约

以 `packages/shared`、`docs/api-contracts.md`、`docs/mock-api-inventory.md` 为准，不要在迁移时随意改字段名。

## 第二步：NestJS 按同一路径实现

在 `apps/server/src/modules` 实现 `/api/home`、`/api/news` 等，前缀仍为 `/api`。  
正式后端暂未实现的字段应保持兼容（可选或默认值），不要让小程序分支判断“是不是 Mock”。

## 第三步：契约测试

对比 Mock 与真实后端的：

- HTTP 状态码
- `ApiResponse` 外壳
- 列表分页结构
- 详情 `richContent` block 集合
- `ImageResource` 形态（绝对 URL）

`__scenario`、`X-Mock-Scenario`、`GET /api/profile?loggedIn=true` 等 Mock 特有能力**不得**进入生产响应，也不得作为正式 NestJS API 的一部分实现。

## Mock-only 能力隔离

正式后端和小程序生产包必须遵守：

- Mock-only 参数不得进入正式 NestJS API：`X-Mock-Scenario`、`__scenario`、`GET /api/profile?loggedIn=true`
- 小程序 trial / release 不得自动或手动附加 `X-Mock-Scenario`
- 正式后端不实现 `__scenario`，不根据 Mock 场景头切换 empty / error / unauthorized

生产环境用真实 401/403/404，而不是 Mock 场景参数。

## 第四步：修改小程序 Base URL

`apps/miniprogram/miniprogram/config/env.ts`：

```ts
{
  apiBaseUrl: 'https://正式接口域名',
  dataSource: 'real-server',
}
```

不要改 `services/endpoints.ts` 和页面。

## 第五步：分别验证

- normal：首页、新闻列表/详情、图片
- empty：空列表 + empty-state
- error：HTTP 错误 + 页面 error 态
- unauthorized：401 提示

生产环境用真实 401/403/404，而不是 Mock 场景参数。

## 第六步：停止 Mock Server

停止 `pnpm dev:mock`。可保留 `apps/mock-server` 作为契约样例，或在正式接口稳定后删除。删除时不要动小程序包内 `assets/`。

## 约束

- 页面不能感知后端是真是假
- services 层不能因切换真实后端而重写
- DTO 字段不要在迁移时改名
- Mock 特有字段和场景功能不能进入生产响应
- `X-Mock-Scenario`、`__scenario`、`profile?loggedIn=true` 保持 Mock-only
