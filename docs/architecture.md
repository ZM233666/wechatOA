# 架构说明

## Cursor 与微信开发者工具的职责划分

| 工具 | 职责 |
| --- | --- |
| Cursor | 编写前后端代码；终端安装依赖、启动后端、执行类型检查 / Lint / 构建 |
| 微信开发者工具 | 导入小程序项目、编译 TypeScript、模拟器预览、真机调试、上传 |

小程序**不是**普通 Web 项目：不要用浏览器预览，不要为小程序创建 Web Dev Server。

## 前后端分离结构

```text
微信开发者工具（小程序）
        │  wx.request
        ▼
本机 / 局域网 NestJS（apps/server）
        │
        ▼
（未来）数据库等基础设施
```

- 前端：`apps/miniprogram`
- 后端：`apps/server`
- 通过 HTTP REST 通信，默认前缀 `/api`

## Monorepo 结构

使用 pnpm workspace：

- `apps/*`：可运行应用
- `packages/*`：共享库

当前共享包 `packages/shared` 提供 API 响应类型。后端可通过 workspace 依赖引用；小程序因开发者工具对 npm / workspace 包有额外约束，暂用本地类型声明，避免引入复杂打包器。

## API 请求链路

1. 页面调用 `services/api.ts` 中的方法（如 `getHealth()`）
2. `services/request.ts` 基于 `wx.request` 发起请求
3. 自动拼接 `config/env.ts` 中的 API 基础地址
4. 后端全局前缀 `API_PREFIX`（默认 `api`）匹配路径
5. 控制器返回统一 `ApiResponse<T>` 结构

## 环境配置边界

| 位置 | 内容 |
| --- | --- |
| 小程序 `config/env.ts` | 按 `envVersion`（develop / trial / release）选择 API Base URL |
| 后端 `.env` / `.env.example` | `PORT`、`API_PREFIX`、`CORS_ORIGINS` 等 |
| 微信开发者工具本地设置 | 开发阶段可临时关闭合法域名校验（仅本地） |

## 未来数据库接入位置

预留目录：`apps/server/src/database/`

接入时建议：

1. 在此目录放置数据源配置、实体 / schema 注册
2. 通过 NestJS Module 注入到业务模块
3. 健康检查如需探测数据库，再扩展 `/api/health`（当前不做）
