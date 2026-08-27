# 目标架构基线

本文记录正式架构对齐结论。当前仓库**尚未**创建 `apps/backend` / `apps/portal`，待正式接入 DVAdmin 时再建目录。

## 总体架构

```text
┌─────────────────────┐     ┌──────────────────────┐
│  微信小程序          │     │  DVAdmin Vue Portal  │
│  apps/miniprogram   │     │  apps/portal（未来）  │
└─────────┬───────────┘     └──────────┬───────────┘
          │ /api/v1/mini/*              │ /api/v1/admin/*
          └────────────┬───────────────┘
                       ▼
          ┌────────────────────────────┐
          │  Django / DRF              │
          │  apps/backend（未来）       │
          │  同一套业务域，分端 API     │
          └────────────┬───────────────┘
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
PostgreSQL           Redis         对象存储 + CDN
（主库）          缓存/限流/锁      图片与附件
                       │
                Celery + RabbitMQ
                  （异步任务）
```

开发阶段另有独立 Mock：

```text
小程序 ──► apps/mock-server（/api/*，端口 3100）
```

## `apps/backend` 与 `apps/portal` 的未来职责

| 目录 | 职责 |
| --- | --- |
| `apps/backend` | DVAdmin Django/DRF：业务模型、权限、Admin/Mini API、与 PG/Redis/存储/Celery 集成 |
| `apps/portal` | DVAdmin Vue 管理端：运营配置、内容编辑与发布、后台权限操作 |

二者与小程序共用业务域；**不**为小程序再起一套独立后端。

## Admin API 与 Mini API 隔离

| API | 前缀 | 调用方 | 典型能力 |
| --- | --- | --- | --- |
| Admin | `/api/v1/admin/*` | Portal | 草稿、修订、发布、账号与权限 |
| Mini | `/api/v1/mini/*` | 小程序 | 已发布公开内容、只读聚合、用户侧接口 |

鉴权、限流与字段暴露按端分别配置；公开 Mini 响应与当前 Mock DTO 对齐。

## 新闻内容模型

- **Revision**：编辑过程中的修订版本
- **PublishedSnapshot**：对外发布快照
- **JSONB**：结构化 `richContent`（Block），不是任意 HTML 字符串
- **图片**：上传对象存储，API 只携带 URL / `ImageResource`；**二进制不进入 JSONB**

## Mock Server → Django 迁移路径

1. 冻结 `packages/shared` + 文档契约（页面与 Service 不重写）
2. 在 `apps/backend` 按契约实现 Mini/Admin API（路径见迁移文档映射表）
3. 落地 PostgreSQL、Redis、对象存储、Celery/RabbitMQ
4. 小程序通过环境配置切换 `apiBaseUrl` → `/api/v1/mini/*`；Portal 对接 Admin API
5. **保留** `apps/mock-server`：前端独立开发、异常场景与自动化测试；正式小程序不打包 Mock
6. 生产回滚走网关 / 后端版本 / PublishedSnapshot，**禁止**正式包切回本机 Mock

分阶段方案、对比测试、上线清单与禁止事项见 [mock-to-real-backend.md](./mock-to-real-backend.md)。

## `apps/server` 退役原则

- 定位：历史 NestJS 原型骨架，**不再新增业务**
- 保留：根目录兼容脚本（`dev:server`、`build:server`、`typecheck:server`）与 README 客观说明
- 禁止：把 NestJS 当作正式后端、在 `apps/server` 继续开发业务、文档写「迁移到 NestJS」
- 最终：正式 Django 稳定后，可归档或删除该目录，不影响小程序与 Mock 契约

## 当前仓库状态（基线）

| 组件 | 状态 |
| --- | --- |
| `apps/miniprogram` | 已实现并持续开发 |
| `apps/mock-server` | 已实现，开发默认联调 |
| `apps/server` | 已实现骨架，停扩 |
| `apps/backend` / `apps/portal` | 未创建（接入 DVAdmin 时再建） |
| `packages/shared` | TypeScript DTO；未来 OpenAPI 生成 |
