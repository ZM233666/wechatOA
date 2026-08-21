# 微信小程序 + DVAdmin Portal + Django/DRF 后端

基于 pnpm workspace 的 Monorepo。目标架构为：**原生微信小程序** + **DVAdmin Vue Portal** + **Django/DRF 业务后端**；开发阶段由独立 Mock API 支撑小程序联调。

> **重要**：小程序前端必须使用「微信开发者工具」导入、编译和预览。不要在浏览器中预览，也不要为小程序启动 Vite / Webpack Dev Server。

## 当前实现 vs 目标架构

| 状态 | 目录 / 组件 | 说明 |
| --- | --- | --- |
| 已实现 | `apps/miniprogram` | 原生微信小程序（业务页面与联调中） |
| 已实现 | `apps/mock-server` | 开发阶段 Mock API（默认联调目标） |
| 已实现（停扩） | `apps/server` | 旧 NestJS 原型骨架，**不再新增业务**，仅保留兼容/参考 |
| 未来接入 | `apps/backend` | DVAdmin Django/DRF 正式后端（接入时再创建） |
| 未来接入 | `apps/portal` | DVAdmin Vue Portal 管理端（接入时再创建） |
| 共享类型 | `packages/shared` | 当前 TypeScript DTO；未来逐步改为 OpenAPI 生成类型 |

小程序与 Portal **共用同一套 Django 业务后端**，不单独建设小程序后端。正式 API 按端隔离：

- Admin API：`/api/v1/admin/*`
- Mini API：`/api/v1/mini/*`

## 技术栈

| 端 / 层 | 技术 |
| --- | --- |
| 小程序 | 原生微信小程序、TypeScript、WXML、WXSS |
| 管理端（未来） | DVAdmin Vue Portal |
| 正式后端（未来） | DVAdmin、Django、Django REST Framework |
| 开发 Mock | Node.js、Express（`apps/mock-server`） |
| 旧骨架（停扩） | NestJS（`apps/server`，仅兼容/参考） |
| 主库（未来） | PostgreSQL |
| 缓存 / 限流 / 锁（未来） | Redis |
| 图片与附件（未来） | 对象存储 + CDN |
| 异步任务（未来） | Celery + RabbitMQ |
| 工程 | pnpm workspace、ESLint、Prettier、EditorConfig |

## 目录结构

```text
.
├── apps/
│   ├── miniprogram/          # 微信小程序（开发者工具导入此目录）
│   ├── mock-server/          # 开发阶段 Mock API
│   └── server/               # 旧 NestJS 原型（停扩，兼容/参考）
│   # 未来接入 DVAdmin 时再创建：
│   # ├── backend/            # Django/DRF 正式后端
│   # └── portal/             # DVAdmin Vue Portal
├── packages/
│   └── shared/               # 共享 DTO（未来逐步 OpenAPI 生成）
├── docs/                     # 架构与开发文档
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 环境要求

- Node.js >= 20
- pnpm >= 9（推荐与根目录 `packageManager` 字段一致）
- 微信开发者工具（用于小程序编译与预览）

### 安装 pnpm

若尚未安装：

```bash
npm install -g pnpm
```

或使用 Corepack：

```bash
corepack enable
corepack prepare pnpm@10.26.2 --activate
```

## 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

## Cursor 中启动 Mock API（当前小程序默认）

开发阶段小程序默认请求独立 Mock Server，**不是** NestJS，也**不是**未来的 Django 后端：

```bash
pnpm dev:mock
```

- Mock 地址：`http://127.0.0.1:3100`
- 健康检查：`http://127.0.0.1:3100/api/health`
- 说明：`apps/mock-server/README.md`

## Cursor 中启动旧 NestJS 骨架（兼容/参考）

`apps/server` 为历史 NestJS 原型，**已停止扩展业务**。下列命令仅用于本地兼容验证或对照参考：

```bash
pnpm dev:server
```

- 地址：`http://127.0.0.1:3000`
- 健康检查：`http://127.0.0.1:3000/api/health`

新业务请等待 `apps/backend`（Django/DRF）接入，**不要**在 `apps/server` 继续开发业务。

## 微信开发者工具导入方式

1. 打开微信开发者工具
2. 选择「导入项目」
3. **导入目录必须是**：`apps/miniprogram`（不要导入 `apps/miniprogram/miniprogram`，也不要导入整个 Monorepo 根目录）
4. AppID 可使用测试号；若 `touristappid` 不适用当前开发者工具版本，请填写你自己的 AppID
5. 等待开发者工具完成 TypeScript 编译

`project.config.json` 中已配置：

```json
{
  "miniprogramRoot": "miniprogram/"
}
```

## 本地开发者工具联调

1. 在 Cursor 终端执行 `pnpm install` 与 `pnpm dev:mock`
2. 用微信开发者工具导入 `apps/miniprogram`
3. 在「详情 → 本地设置」中，开发阶段可临时勾选：**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
4. 打开首页，点击「检查后端服务」，请求 `GET /api/health`

## 真机调试注意事项

- `127.0.0.1` / `localhost` 只适合开发者工具访问电脑本机服务
- 真机上的 `127.0.0.1` 指向手机自身，不是开发电脑
- 真机调试需将 API 地址改为电脑局域网 IP，例如 `http://192.168.x.x:3100`（修改 `apps/miniprogram/miniprogram/config/env.ts`）
- 真机与电脑需处于可互通网络，防火墙需放行 Mock / 后端端口
- 正式发布必须使用已备案、已配置为小程序 request 合法域名的 HTTPS 地址
- **不要**把开发环境跳过域名校验的方式当成生产方案

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm install` | 安装全部依赖 |
| `pnpm dev:mock` | 启动开发 Mock API（watch，端口 3100） |
| `pnpm build:mock` | 构建 Mock Server |
| `pnpm start:mock` | 启动已构建的 Mock Server |
| `pnpm validate:mock` | 校验 Mock fixture |
| `pnpm test:mock` | 运行 Mock Server 测试 |
| `pnpm dev:server` | 启动旧 NestJS 骨架（兼容/参考，停扩） |
| `pnpm build:server` | 构建旧 NestJS 骨架 |
| `pnpm typecheck` | 全仓 TypeScript 检查 |
| `pnpm typecheck:miniprogram` | 仅小程序类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm format` | Prettier 格式化 |

> 没有 `dev:miniprogram` Web 服务。小程序编译与预览由微信开发者工具负责。

## 迁移计划（摘要）

1. **现在**：小程序继续对接 `apps/mock-server`；冻结 `packages/shared` 与文档中的公开契约
2. **接入 DVAdmin**：创建 `apps/backend`（Django/DRF）与 `apps/portal`（Vue）；实现 `/api/v1/admin/*` 与 `/api/v1/mini/*`
3. **切换小程序**：将 `apiBaseUrl` 指向正式 Mini API，`dataSource: 'real-server'`；页面与 services 路径约定不变
4. **退役**：`apps/server` 仅作参考，不承接新业务；Mock 可在正式接口稳定后降级为契约样例

详见 [目标架构](docs/target-architecture.md) 与 [Mock 迁移到正式后端](docs/mock-to-real-backend.md)。

## 后续开发建议

1. **业务接口**：在未来的 `apps/backend`（Django/DRF）实现，不要在 `apps/server` 新增模块
2. **管理端**：在未来的 `apps/portal`（DVAdmin Vue）实现运营与内容管理
3. 在 `apps/miniprogram/miniprogram/pages` 下新增页面，并在 `app.json` 注册
4. API 约定见 `docs/api-conventions.md`；目标隔离见 `docs/target-architecture.md`
5. 基础设施（PostgreSQL / Redis / 对象存储 / Celery）在接入正式后端时落地
6. 共享类型当前维护于 `packages/shared`，后续逐步改为 OpenAPI 生成

## 相关文档

- [目标架构](docs/target-architecture.md)
- [架构说明](docs/architecture.md)
- [API 约定](docs/api-conventions.md)
- [开发流程](docs/development.md)
- [Mock Server](apps/mock-server/README.md)
- [Mock API 清单](docs/mock-api-inventory.md)
- [API 契约](docs/api-contracts.md)
- [富文本模型](docs/rich-content-schema.md)
- [Mock 开发指南](docs/mock-server-development.md)
- [迁移到 DVAdmin Django/DRF](docs/mock-to-real-backend.md)
