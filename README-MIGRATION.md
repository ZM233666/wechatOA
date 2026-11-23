# Mock → Django Mini API 迁移指导

把开发阶段独立运行的 `apps/mock-server`（默认 `http://127.0.0.1:3100/api`）**嵌入正式 Django/DRF**，小程序改为请求 `/api/v1/mini/*`。页面与 `services/*.service.ts` **不重写**，主要以环境配置切换。

> 仓库总览与本地启动见根目录 [README.md](./README.md)。本文只讲迁移。

---

## 1. 目标一句话

```text
现在：小程序 → Mock(:3100/api) →（可选）Django 管理端 / MinIO / fixture
目标：小程序 → Django(/api/v1/mini) → DB / 对象存储 / Redis
```

- **Admin**（Portal）：`/api/v1/admin/*`，继续写内容  
- **Mini**（小程序）：`/api/v1/mini/*`，只读已发布数据  
- **生产不跑**独立 Mock 进程；Mock 仅保留到切换完成，用于对照与前端独立开发  

---

## 2. 必读文档

| 文档 | 用途 |
| --- | --- |
| [docs/miniprogram-backend-prep.md](./docs/miniprogram-backend-prep.md) | 准备工作清单、可移植模块、Admin→Mini 映射、优先级 |
| [docs/mock-to-real-backend.md](./docs/mock-to-real-backend.md) | 完整分阶段方案、契约兼容、上线与回滚 |
| [docs/mock-api-inventory.md](./docs/mock-api-inventory.md) | 当前 Mock 接口清单 |
| [docs/api-contracts.md](./docs/api-contracts.md) | 公开响应约定 |
| [packages/shared/src/constants/mini-api-routes.ts](./packages/shared/src/constants/mini-api-routes.ts) | 冻结的路径登记表 |

改路径或 DTO 时，须同步：**shared 路由表**、**小程序 `endpoints.ts`**、**Mock 路由**、**本文档相关链接**。

---

## 3. 小程序侧（已具备，切配置即可）

| 项 | 位置 |
| --- | --- |
| 环境分轨 | `apps/miniprogram/miniprogram/config/env.ts` |
| 路径前缀 | develop=`/api`；trial/release=`/api/v1/mini` |
| 请求入口 | `services/request.ts` + `services/endpoints.ts` |
| JWT 占位 | `setAccessToken()` → `Authorization` |
| develop 游客放行 | 仅本地；**trial/release 必须关闭** |

切换正式后端示例：

```ts
// trial / release
{
  apiBaseUrl: 'https://api.example.com', // 换成真实 HTTPS
  miniApiPathPrefix: '/api/v1/mini',
  dataSource: 'real-server',
}
```

**禁止**：页面硬编码 URL；生产使用 `127.0.0.1` / 局域网 / `example.com` 占位域名。

---

## 4. 迁移原则

1. **迁契约，不迁 Mock 进程。** Django 输出与现有 Mini DTO 兼容的 JSON。  
2. **小程序不直连管理端。** 不要把 Admin JWT、代拉 `/api/article-content/` 等做法搬进生产 Mini。  
3. **公开 ID 稳定。** 如 `article-{cmsId}`、`job-{cmsId}`；不暴露数据库自增主键。  
4. **媒体只返回 HTTPS URL。** 存 `object_key` / `media_id`，不存 Base64；微信配置 request / downloadFile 合法域名。  
5. **Mock-only 禁止进 Django Mini：**  
   `X-Mock-Scenario`、`__scenario`、人工延迟、fixture 兜底、本地 `runtime/` 镜像、`IDENTITY_GUARD_DISABLED=true`。

---

## 5. 分阶段落地

| 阶段 | 做什么 | 完成标准 |
| --- | --- | --- |
| **Phase 0** | 冻结路径与 DTO（本仓库大部分已完成） | shared 路由表与 Mock/小程序一致 |
| **Phase 1** | Django 骨架 + `/api/v1/mini/health` + 统一 `ApiResponse` | develop 可改 baseUrl 打通 |
| **Phase 2** | `news` + `home` | 与 Mock 对照；封面为 CMS/CDN 图 |
| **Phase 3** | `brand` / `products` / `cases` / `services` / Insights | 列表、详情、空态、404 对齐 |
| **Phase 4** | `kb-life/*`、班车规划、假日、care、岗位 | 身份门禁按正式规则 |
| **Phase 5** | `/wetalk/*`、PDF reader | 异步渲页 + 对象存储 |
| **Phase 6** | `profile` + identity-binding | `wx.login` → openid → 邮箱绑定 |
| **灰度** | trial 指正式 HTTPS | 回归通过后再 release；停用生产对 Mock 的依赖 |

更细的可移植代码对照（HTML→`richContent`、PDF、假日等）见 [miniprogram-backend-prep.md §4–§6](./docs/miniprogram-backend-prep.md)。

---

## 6. 建议实现顺序（Django Mini）

```text
P0  health + 统一响应 + 鉴权骨架
P1  news / home
P2  brand / products / cases / services / insights
P3  kb-life（食堂、班车、地图、手册、关怀、岗位、精彩瞬间）
P4  wetalk（news / emagazines / reader）
P5  profile / identity-binding（关闭游客全开）
```

路径映射表（Mock `/api/...` → Django `/api/v1/mini/...`）见 [mock-to-real-backend.md §3](./docs/mock-to-real-backend.md#3-接口路径映射)。

---

## 7. 每迁一个模块的验收

分别请求后对比：

| 端 | 示例 |
| --- | --- |
| Mock | `GET http://127.0.0.1:3100/api/home` |
| Django | `GET https://<host>/api/v1/mini/home` |

至少核对：

- HTTP 状态码与 `ApiResponse`（`success` / `data` / `message`）  
- 分页字段；空列表为 `[]` 不是 `null`  
- 无效 id / 未发布 → 404  
- 图片为**绝对**可访问 URL（正式环境 HTTPS）  
- 详情才有完整 `richContent`（列表不要带全文）  

契约测试入口：`pnpm test:mock`（含 `mini-api-routes` 路径登记校验）。

---

## 8. 上线前清单（摘要）

- [ ] Django Mini 与 Mock 关键模块对照通过  
- [ ] 公开 ID / slug 稳定；媒体走 CDN HTTPS  
- [ ] 微信合法域名已配置  
- [ ] trial `apiBaseUrl` 为真实 HTTPS；无 Mock Header  
- [ ] 正式鉴权启用；**未**开启游客全开  
- [ ] 日志 / 监控 / 备份 / 回滚预案就绪  
- [ ] 正式小程序包**不依赖** `apps/mock-server`  

回滚：**不要**把正式包指回 `127.0.0.1:3100`；用网关/版本回滚或发布快照恢复。细节见 [mock-to-real-backend.md §12–§13](./docs/mock-to-real-backend.md)。

---

## 9. 禁止事项

- 不为迁移重写小程序页面  
- 不在 `apps/server`（旧 NestJS）上继续做正式业务  
- 不让小程序直连 PostgreSQL、Redis、对象存储私有地址  
- 不把草稿 / 审核流水暴露给 Mini  
- 不把 develop 的身份放行策略带到 trial/release  

---

## 10. 当前仓库状态

| 组件 | 状态 |
| --- | --- |
| `apps/miniprogram` | 已按 Mini 前缀可切换 |
| `apps/mock-server` | 开发联调 BFF（仍在用） |
| `packages/shared` | DTO + 路径登记 |
| `apps/backend` | **尚未接入**（Django 正式后端） |
| `apps/portal` | **尚未接入**（DVAdmin 管理端） |

下一步：在 Django 侧创建 Mini 应用层，从 **P0 health** 与 **P1 news/home** 开始，对照 Mock 逐接口嵌入。
