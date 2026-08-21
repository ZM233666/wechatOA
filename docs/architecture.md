# 架构说明

## Cursor 与微信开发者工具的职责划分

| 工具 | 职责 |
| --- | --- |
| Cursor | 编写代码；终端安装依赖、启动 Mock / 兼容骨架、执行类型检查 / Lint / 构建 |
| 微信开发者工具 | 导入小程序项目、编译 TypeScript、模拟器预览、真机调试、上传 |

小程序**不是**普通 Web 项目：不要用浏览器预览，不要为小程序创建 Web Dev Server。

## 目标前后端分离结构

```text
微信开发者工具（小程序）          DVAdmin Vue Portal（未来）
        │  wx.request                      │  HTTP
        ▼                                  ▼
              Django/DRF（apps/backend，未来）
              ├── /api/v1/mini/*   ← 小程序
              └── /api/v1/admin/*  ← Portal
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   PostgreSQL         Redis      对象存储 / CDN
                        │
                   Celery + RabbitMQ
```

开发阶段（当前）：

```text
微信开发者工具（小程序）
        │  wx.request
        ▼
本机 Mock Server（apps/mock-server，端口 3100）
```

- 前端小程序：`apps/miniprogram`
- 开发 Mock：`apps/mock-server`（当前默认联调）
- 正式后端（未来）：`apps/backend`（DVAdmin Django/DRF）
- 管理端（未来）：`apps/portal`（DVAdmin Vue Portal）
- 旧骨架（停扩）：`apps/server`（NestJS，仅兼容/参考）

小程序与 Portal **共用同一套 Django 业务后端**，不单独建设小程序后端。

## Monorepo 结构

使用 pnpm workspace：

- `apps/*`：可运行应用
- `packages/*`：共享库

当前共享包 `packages/shared` 提供 API 响应类型（DTO）。后端与 Mock 可通过 workspace 依赖引用；小程序因开发者工具对 npm / workspace 包有额外约束，暂用本地类型声明。未来类型将逐步改为 OpenAPI 生成。

## API 请求链路（当前：Mock）

1. 页面调用 `services/*.service.ts` 中的方法
2. `services/request.ts` 基于 `wx.request` 发起请求
3. 自动拼接 `config/env.ts` 中的 API 基础地址（开发默认 Mock `3100`）
4. Mock Server 返回统一 `ApiResponse<T>` 结构

正式后端接入后，小程序改为请求 `/api/v1/mini/*`；Portal 使用 `/api/v1/admin/*`。切换时主要改 Base URL，不改页面路径约定。

## 环境配置边界

| 位置 | 内容 |
| --- | --- |
| 小程序 `config/env.ts` | 按 `envVersion`（develop / trial / release）选择 API Base URL |
| Mock `.env` / `.env.example` | `MOCK_PORT`、延迟、公共资源基址等 |
| 旧 NestJS `.env` / `.env.example` | 仅兼容骨架：`PORT`、`API_PREFIX`、`CORS_ORIGINS` 等 |
| 未来 `apps/backend` | Django settings、数据库、Redis、对象存储、Celery |
| 微信开发者工具本地设置 | 开发阶段可临时关闭合法域名校验（仅本地） |

## 基础设施职责（正式环境）

| 组件 | 职责 |
| --- | --- |
| PostgreSQL | 正式主数据库（业务与内容） |
| Redis | 缓存、限流、分布式锁 |
| 对象存储 + CDN | 图片与附件；URL 进入 API，二进制不进 JSONB |
| Celery + RabbitMQ | 异步任务（发布、通知、导入导出等） |

## 内容模型要点（正式后端）

- 新闻采用 **Revision + PublishedSnapshot + JSONB** 存储结构化正文
- 图片进入对象存储，**不**把二进制写入 JSONB
- 公开 Mini API 只暴露已发布快照，与当前 Mock 公开 DTO 对齐

更完整的目标图与退役原则见 [target-architecture.md](./target-architecture.md)。

## `apps/server`（旧 NestJS）说明

- 历史可运行骨架（健康检查等），**已停止新增业务模块**
- 根目录 `pnpm dev:server` / `pnpm build:server` 仅保留兼容与参考
- 数据库与业务实现以未来 `apps/backend` 为准，不以 `apps/server/src/database` 为正式接入点
