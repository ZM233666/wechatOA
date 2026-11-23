# 小程序正式后端切换准备

目标：把 Mock（`apps/mock-server`）里的 **Mini 契约与适配逻辑嵌入 Django**，小程序只改环境配置即可切到 `/api/v1/mini/*`。页面与 `services/*.service.ts` 不重写。

正式迁移总方案见 [mock-to-real-backend.md](./mock-to-real-backend.md)。

---

## 1. 已落地（小程序侧）

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 环境分轨 | `apps/miniprogram/miniprogram/config/env.ts` | `develop` → Mock；`trial`/`release` → `real-server` + HTTPS 校验 |
| API 路径前缀 | `miniApiPathPrefix` | develop：`/api`；trial/release：`/api/v1/mini` |
| 路径集中 | `services/endpoints.ts` + `api-path.ts` | 页面禁止硬编码 URL |
| JWT 占位 | `services/auth-session.ts` + `request.ts` | `setAccessToken()` 后自动带 `Authorization`；401 清 token |
| 路由契约清单 | `packages/shared/src/constants/mini-api-routes.ts` | 与 Mock 静态 GET / 动态模板对齐 |
| 契约测试 | `apps/mock-server/tests/mini-api-routes.test.ts` | `pnpm test:mock` |
| develop 身份放行 | `IDENTITY_GUARD_DISABLED` + `isIdentityGuardBypassEnabled()` | **仅开发**；trial/release 必须关 |

---

## 2. 嵌入策略（一句话）

```text
现在：小程序 → Mock(:3100/api) →（可选）Django 管理端 / MinIO / fixture
目标：小程序 → Django(/api/v1/mini) → DB / 对象存储 / Redis
```

在 Django 内实现 **Mini 只读层**，按现有 DTO 吐数；管理端继续写内容。Mock 在切换完成前保留作对照与前端独立开发，**不**再作为生产后端。

---

## 3. Phase 0 冻结清单（本仓库可先做完）

- [x] 公开路径登记：`MINI_API_RESOURCE_PATHS` + `MINI_API_DYNAMIC_ROUTE_TEMPLATES`
- [x] 小程序 endpoints 集中、前缀可切换
- [ ] Django 实现侧按下方「模块优先级」建 Mini ViewSet（仓库内尚无 `apps/backend`）
- [ ] 固定样例 ID 对照表（CMS id ↔ 公开 id，如 `article-{id}`、`job-{id}`）
- [ ] 媒体公网域名策略（API 只返回 HTTPS `ImageResource.url`）
- [ ] 正式鉴权设计：`wx.login` → code2Session → 绑定邮箱 → 角色；关闭游客放行
- [ ] 双后端对比脚本或手工 checklist（Mock `/api/...` vs Django `/api/v1/mini/...`）

---

## 4. 可移植逻辑（应从 Mock 搬进 Django，而非再 HTTP 转发管理端）

| 能力 | Mock 参考位置 | Django 建议 |
| --- | --- | --- |
| 统一响应壳 | `utils/response.ts` | DRF 统一 `success` / `data` / `message` / `requestId` |
| HTML → `richContent` | `html-to-rich-content.ts`、`article-html.service.ts` | 发布时或读详情时转 Block；列表不返正文 |
| 新闻/首页聚合 | `article-news.mapper.ts`、`home.controller.ts`、`news.service.ts` | Mini `home` + `news`；仅已发布 |
| 封面/媒体 URL | `asset-url.service.ts`、`article-media-mirror.service.ts` | 存 object_key；输出 CDN HTTPS；勿镜像到本地 runtime |
| PDF → 阅读页 | `pdf-sheet.service.ts`、`minio-pdf.service.ts`、WeTalk reader | Celery/异步渲页；Mini 返回 `pages` / reader URL |
| 法定假日 | `china-statutory-holiday.service.ts` | 同规则 Provider；按园区只改 `location` |
| 班车行程规划 | `shuttle-trip-plan.service.ts` + 腾讯地图 | Key 仅服务端；Mini 代理规划结果 |
| 身份门禁 | `identity-guard.service.ts` | 真实会话；**禁止**移植 `IDENTITY_GUARD_DISABLED=true` 到生产 |

---

## 5. Admin 上游 → Mini 映射（当前 Mock 代理关系）

Mock 开启对应 `*_ENABLED` 时，会用管理员账号拉 Django 管理端再映射成 Mini DTO。嵌入后应 **取消这层转发**，改为 Django 内部读模型。

| Mini 路径（无前缀） | 当前 Mock 上游（示意） | 嵌入后 |
| --- | --- | --- |
| `/news`、`/news/:id`、`/home` | `/api/article-content/content/` | Mini 直接读已发布文章 |
| `/brand` | `/api/brand-intro/...` | Mini brand overview |
| `/products*` | `/api/product-intro/...` | Mini products |
| `/cases*` | `/api/project-case/cases/` | Mini cases |
| `/kb-life/canteen` | `/api/lunch-menu/...` | Mini canteen |
| `/kb-life/shuttle*` | `/api/shuttle-schedule/...` + 腾讯地图 | Mini shuttle |
| `/kb-life/campus-map` | `/api/campus-map/files/` | Mini campus-map |
| `/kb-life/care*` | `/api/v1/mini/kb-life/local-global-care/...`（已有雏形）或管理端 | 统一到 Mini care |
| `/kb-life/open-positions*` | `article-content?content_type=job_openings` | Mini open-positions |
| `/kb-life/activities`、相册 | Mini activities / highlight-moments | 已有部分 Mini，对齐 DTO |
| `/kb-life/financial-handbook` | `/api/financial-handbook/...` | Mini financial-handbook |
| `/wetalk/*` | WeTalk 管理端 + PDF | Mini `/wetalk/news`、`/emagazines`、reader |
| Insights / handbook PDF | MinIO 前缀 + 本地渲页 | 对象存储 + 服务端渲页 |

---

## 6. 模块落地优先级

| 优先级 | 模块 | 原因 |
| --- | --- | --- |
| P0 | `health`、统一响应、鉴权骨架 | 打通 develop 直连 |
| P1 | `news`、`home` | 首页与资讯主路径；封面已依赖 CMS |
| P2 | `brand`、`products`、`cases`、`services`、Insights | 内容 Tab |
| P3 | `kb-life/*`、班车规划、假日 | 员工服务 |
| P4 | `/wetalk/*`、PDF reader | 依赖异步渲页与存储 |
| P5 | `profile`、identity-binding | 正式鉴权与角色门禁 |

---

## 7. Mock-only（禁止进入 Django Mini）

| 项 | 说明 |
| --- | --- |
| `X-Mock-Scenario` / `__scenario` | 空态/错误演示 |
| 人工延迟 | `MOCK_DELAY_*` |
| 管理员 JWT 代拉管理端 | 生产 Mini 用业务会话 |
| fixture / `runtime/news/media` 本地镜像 | 改 CDN |
| `IDENTITY_GUARD_DISABLED` 默认游客全开 | 仅 develop |
| `profile?loggedIn=` / `?role=` | 已废弃 |

---

## 8. 有域名后必做

1. 将 `trial` / `release` 的 `apiBaseUrl` 改为真实 HTTPS（替换 `example.com`）。
2. 微信公众平台配置 **request / downloadFile** 合法域名。
3. 实现 Django `/api/v1/mini/*`，形状对齐 `packages/shared`。
4. 登录写入 `setAccessToken()`；关闭 develop 游客放行后再验 trial。
5. trial 全量回归后发 release；生产不依赖 `:3100`。

## develop 临时直连 Django（局域网）

```ts
apiBaseUrl: 'http://192.168.x.x:8000',
miniApiPathPrefix: '/api/v1/mini',
dataSource: 'real-server',
```

勿将局域网 IP 提交进仓库。

---

## 9. 对照验收（每迁一个模块）

对同一业务语义分别请求：

- Mock：`http://127.0.0.1:3100/api/<path>`
- Django：`http(s)://<host>/api/v1/mini/<path>`

至少核对：HTTP 状态、`ApiResponse`、分页、空列表 `[]`、404、图片为绝对 URL、详情 `richContent`（若有）。
