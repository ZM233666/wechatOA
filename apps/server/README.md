# NestJS 后端服务

最小可运行的 NestJS RESTful 服务，用于与微信小程序本地联调。

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

## 启动方式

在仓库根目录：

```bash
pnpm dev:server
```

或在本目录：

```bash
pnpm start:dev
```

- 监听地址：`0.0.0.0`（便于后续局域网真机调试，不代表对公网开放）
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

## 后续新增 NestJS 模块

1. 在 `src/modules/<name>/` 下创建 module / controller / service
2. 在 `src/app.module.ts` 中 `imports` 注册该模块
3. 控制器路径会自动带上全局前缀 `api`
4. 共享响应类型可从 `@app/shared` 以 `import type` 方式引用
5. 数据库相关代码放在 `src/database/`（当前未接入）

当前**未实现**：用户系统、JWT、微信登录、支付、订单、文件上传、Redis、消息队列、Docker。
