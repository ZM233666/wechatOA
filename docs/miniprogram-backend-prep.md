# 小程序正式后端切换准备（无域名阶段可做事项）

正式 Mini API 域名确定前，本仓库已具备以下能力；域名到位后主要改 `config/env.ts` 中的 `apiBaseUrl`。

## 已落地

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 环境分轨 | `apps/miniprogram/miniprogram/config/env.ts` | `develop` → Mock；`trial`/`release` → `real-server` + HTTPS 校验 |
| API 路径前缀 | `miniApiPathPrefix` | develop：`/api`；trial/release：`/api/v1/mini` |
| 路径集中 | `services/endpoints.ts` + `api-path.ts` | 页面禁止硬编码 URL |
| JWT 占位 | `services/auth-session.ts` + `request.ts` | `setAccessToken()` 后自动带 `Authorization: JWT …`；401 清 token |
| 路由契约清单 | `packages/shared/src/constants/mini-api-routes.ts` | 与 Mock 静态 GET 对齐 |
| 契约测试 | `apps/mock-server/tests/mini-api-routes.test.ts` | CI 可跑 `pnpm test:mock` |

## 有域名后必做

1. 将 `trial` / `release` 的 `apiBaseUrl` 改为真实 HTTPS 域名（替换 `example.com` 占位）。
2. 微信公众平台配置 **request / downloadFile** 合法域名。
3. 实现 Django `/api/v1/mini/*`，响应形状对齐 `packages/shared` 与 [mock-to-real-backend.md](./mock-to-real-backend.md)。
4. 登录流程写入 `setAccessToken()`（微信 code 换 JWT）。
5. trial 全量回归后发布 release。

## develop 临时直连 Django（局域网）

仅本地调试时可改 develop：

```ts
apiBaseUrl: 'http://192.168.x.x:8000',
miniApiPathPrefix: '/api/v1/mini', // 若 Django 已按 Mini 前缀实现
dataSource: 'real-server',
```

勿将局域网 IP 提交进仓库。

## Mock 与正式并存

- 生产小程序 **不** 依赖 Mock Server（3100）。
- Mock 保留用于前端独立开发、异常场景与自动化测试。
