# 开发流程

## 日常开发流程

1. 在 Cursor 中修改代码
2. 根目录执行 `pnpm install`（依赖变更时）
3. 启动后端：`pnpm dev:server`
4. 用微信开发者工具导入 `apps/miniprogram` 并编译预览
5. 提交前执行：`pnpm typecheck`、`pnpm lint`

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

- 后端示例：`apps/server/.env.example`
- 本地真实配置：`apps/server/.env`（不提交）
- 小程序 API 地址：`apps/miniprogram/miniprogram/config/env.ts`
- 禁止把密钥、AppSecret 写入仓库

## 新增小程序页面流程

1. 创建 `miniprogram/pages/<name>/` 四件套
2. 在 `app.json` 的 `pages` 中注册
3. 如需接口，在 `services/api.ts` 增加方法
4. 微信开发者工具中编译验证

## 新增后端模块流程

1. 在 `apps/server/src/modules/<name>/` 创建 module / controller / service
2. 在 `app.module.ts` 注册
3. 遵循 `/api` 前缀与统一响应格式
4. 执行 `pnpm typecheck:server` 与 `pnpm build:server`

## 开发者工具预览流程

1. 导入目录：`apps/miniprogram`
2. 确认 AppID（测试号或个人/企业 AppID）
3. 等待 TypeScript 编译
4. 开发阶段可临时关闭合法域名校验
5. 在模拟器中切换四个 Tab，确认首页 Banner / 快捷入口 / 最新资讯展示正常
6. 开发环境首页底部「开发调试」区域可点击「检查后端服务」验证联调（仅 `develop` 显示）

## 真机调试流程

1. 确认后端监听 `0.0.0.0:3000`
2. 将小程序 `develop` 环境 API 改为电脑局域网 IP
3. 手机与电脑同一可达网络，防火墙放行端口
4. 微信开发者工具开启真机调试
5. 正式环境必须换 HTTPS 合法域名，不可沿用跳过校验的方式
