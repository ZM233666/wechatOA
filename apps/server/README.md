# 旧 NestJS 骨架（已停扩）

历史可运行的 NestJS RESTful 骨架，曾用于与微信小程序本地联调。

> **定位**：兼容 / 参考专用。**不要**在此目录继续开发业务。正式后端目标为未来的 `apps/backend`（DVAdmin Django/DRF）；开发联调默认使用 `apps/mock-server`。

## 环境变量

复制示例文件（按需）：

```bash
cp .env.example .env
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 运行环境 |
| `PORT` | `3000` | 监听端口 |
| `API_PREFIX` | `api` | 全局路由前缀 |
| `CORS_ORIGINS` | `*` | CORS 来源，多个用逗号分隔 |

不要提交真实 `.env`。仓库已忽略 `.env`、`.env.local`、`.env.*.local`，但保留 `.env.example`。

## 启动方式（兼容命令）

在仓库根目录：

```bash
pnpm dev:server
```

或在本目录：

```bash
pnpm start:dev
```

- 监听地址：`0.0.0.0`（便于局域网访问，不代表对公网开放）
- 本地访问：`http://127.0.0.1:3000`

## 构建方式

```bash
pnpm build:server
```

生产启动：

```bash
pnpm --filter @app/server start:prod
```

## 健康检查地址

```text
GET http://127.0.0.1:3000/api/health
```

响应示例：

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

## 退役原则

1. **禁止**新增业务 module / controller / service
2. 根目录 `dev:server` / `build:server` / `typecheck:server` 仅保留兼容验证
3. 数据库与正式业务接入以未来 `apps/backend` 为准
4. 正式 Django 稳定后，可按需归档或删除本目录

当前**未实现**：用户系统、JWT、微信登录、支付、订单、文件上传、Redis、消息队列、Docker。这些能力由未来 Django 栈承担，而非本 NestJS 骨架。
