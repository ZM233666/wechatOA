# 微信小程序 + NestJS 前后端分离项目

基于 pnpm workspace 的 Monorepo 框架，包含原生微信小程序前端与 NestJS 后端。

> **重要**：小程序前端必须使用「微信开发者工具」导入、编译和预览。不要在浏览器中预览，也不要为小程序启动 Vite / Webpack Dev Server。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | 原生微信小程序、TypeScript、WXML、WXSS |
| 后端 | Node.js、TypeScript、NestJS、RESTful API |
| 工程 | pnpm workspace、ESLint、Prettier、EditorConfig |

## 目录结构

```text
.
├── apps/
│   ├── miniprogram/          # 微信小程序（开发者工具导入此目录）
│   └── server/               # NestJS 后端
├── packages/
│   └── shared/               # 共享类型（后端可引用；小程序暂用本地类型）
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

开发阶段小程序默认请求独立 Mock Server，**不是** NestJS：

```bash
pnpm dev:mock
```

- Mock 地址：`http://127.0.0.1:3100`
- 健康检查：`http://127.0.0.1:3100/api/health`
- 说明：`apps/mock-server/README.md`

## Cursor 中启动 NestJS 正式后端骨架

```bash
pnpm dev:server
```

- 后端地址：`http://127.0.0.1:3000`
- 健康检查：`http://127.0.0.1:3000/api/health`

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
- 真机调试需将 API 地址改为电脑局域网 IP，例如 `http://192.168.x.x:3000`（修改 `apps/miniprogram/miniprogram/config/env.ts`）
- 真机与电脑需处于可互通网络，防火墙需放行后端端口
- 正式发布必须使用已备案、已配置为小程序 request 合法域名的 HTTPS 地址
- **不要**把开发环境跳过域名校验的方式当成生产方案

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm install` | 安装全部依赖 |
| `pnpm dev:mock` | 启动开发 Mock API（watch，端口 3100） |
| `pnpm validate:mock` | 校验 Mock fixture |
| `pnpm test:mock` | 运行 Mock Server 测试 |
| `pnpm dev:server` | 启动 NestJS 后端骨架（watch） |
| `pnpm build:server` | 构建后端 |
| `pnpm typecheck` | 全仓 TypeScript 检查 |
| `pnpm typecheck:miniprogram` | 仅小程序类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm format` | Prettier 格式化 |

> 没有 `dev:miniprogram` Web 服务。小程序编译与预览由微信开发者工具负责。

## 后续开发建议

1. 在 `apps/server/src/modules` 下按业务新增 NestJS 模块
2. 在 `apps/miniprogram/miniprogram/pages` 下新增页面，并在 `app.json` 注册
3. API 约定见 `docs/api-conventions.md`
4. 数据库接入位置预留在 `apps/server/src/database`
5. 登录、支付等能力待需求明确后再实现
6. 共享类型可通过构建、代码生成或复制声明文件同步到小程序，避免引入复杂打包器

## 相关文档

- [架构说明](docs/architecture.md)
- [API 约定](docs/api-conventions.md)
- [开发流程](docs/development.md)
- [Mock Server](apps/mock-server/README.md)
- [Mock API 清单](docs/mock-api-inventory.md)
- [API 契约](docs/api-contracts.md)
- [富文本模型](docs/rich-content-schema.md)
- [Mock 开发指南](docs/mock-server-development.md)
- [迁移到 NestJS](docs/mock-to-real-backend.md)
