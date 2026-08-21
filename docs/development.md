# 开发流程

## 日常开发流程

1. 在 Cursor 中修改代码
2. 根目录执行 `pnpm install`（依赖变更时）
3. 启动 Mock API：`pnpm dev:mock`（当前小程序默认联调）
4. 用微信开发者工具导入 `apps/miniprogram` 并编译预览
5. 提交前执行：`pnpm typecheck`、`pnpm lint`；涉及 Mock 时再跑 `pnpm validate:mock`、`pnpm test:mock`

> 旧 NestJS 骨架可用 `pnpm dev:server` 做兼容验证，**不要**在 `apps/server` 继续开发业务。正式业务后端为未来的 `apps/backend`（DVAdmin Django/DRF）。

## Git 分支建议

| 分支 | 用途 |
| --- | --- |
| `main` | 稳定主分支 |
| `develop` | 日常集成（可选） |
| `feature/*` | 新功能 |
| `fix/*` | 缺陷修复 |
| `chore/*` | 工程与依赖调整 |

## Commit message 建议

采用简要约定式提交：

```text
feat: 新增健康检查联调页
fix: 修复请求非 2xx 未拒绝的问题
docs: 补充真机调试说明
chore: 调整 ESLint 配置
refactor: 抽取 request 封装
```

## 环境变量管理

- Mock 示例：`apps/mock-server/.env.example`
- 旧 NestJS 骨架示例：`apps/server/.env.example`（兼容/参考，不提交真实 `.env`）
- 小程序 API 地址：`apps/miniprogram/miniprogram/config/env.ts`
- 未来 Django 配置落在 `apps/backend`（接入 DVAdmin 时再建立）
- 禁止把密钥、AppSecret 写入仓库

## 新增小程序页面流程

1. 创建 `miniprogram/pages/<name>/` 四件套
2. 在 `app.json` 的 `pages` 中注册
3. 如需接口，在对应 `services/*.service.ts` 与 `endpoints.ts` 增加方法
4. 微信开发者工具中编译验证

## 新增业务 API（正式路径）

正式后端尚未接入。计划步骤：

1. 在未来的 `apps/backend`（Django/DRF）实现业务，小程序走 `/api/v1/mini/*`，Portal 走 `/api/v1/admin/*`
2. 公开 DTO 与 Mock / `packages/shared` 契约对齐；类型逐步改为 OpenAPI 生成
3. 管理端能力在未来的 `apps/portal`（DVAdmin Vue）实现
4. **不要**在 `apps/server` 新增 NestJS 业务模块

开发阶段可先在 `apps/mock-server` 增加 fixture 与路由，供小程序联调，再在 Django 侧按同契约实现。

## 旧 NestJS 骨架（兼容命令）

仅用于本地对照或健康检查验证：

1. `pnpm typecheck:server` / `pnpm build:server` / `pnpm dev:server`
2. 遵循现有 `/api` 前缀与统一响应格式（历史约定）
3. 不作为正式业务扩展点

## 开发者工具预览流程

1. 导入目录：`apps/miniprogram`
2. 确认 AppID（测试号或个人/企业 AppID）
3. 等待 TypeScript 编译
4. 开发阶段可临时关闭合法域名校验
5. 在模拟器中切换 Tab，确认首页 Banner / 快捷入口 / 最新资讯等展示正常
6. 开发环境首页底部「开发调试」区域可点击「检查后端服务」验证联调（仅 `develop` 显示）

## 真机调试流程

1. 确认 Mock（或未来正式后端）监听 `0.0.0.0` 且端口可达（Mock 默认 `3100`）
2. 将小程序 `develop` 环境 API 改为电脑局域网 IP
3. 手机与电脑同一可达网络，防火墙放行端口
4. 微信开发者工具开启真机调试
5. 正式环境必须换 HTTPS 合法域名，不可沿用跳过校验的方式
