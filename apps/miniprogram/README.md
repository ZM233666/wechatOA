# 微信小程序前端

原生微信小程序（TypeScript + WXML + WXSS）。

## 必须使用微信开发者工具预览

- **不要**在浏览器中预览
- **不要**为小程序启动 Vite / Webpack Dev Server
- 编译、预览、真机调试均由微信开发者工具完成

## 导入目录

请导入：

```text
apps/miniprogram
```

不要导入：

```text
apps/miniprogram/miniprogram
```

也不要导入整个 Monorepo 根目录。

`project.config.json` 已设置：

```json
{
  "miniprogramRoot": "miniprogram/"
}
```

开发者工具会识别 `miniprogram/app.ts`、`app.json`、页面与样式文件。

## 如何填写 AppID

- `project.config.json` 中默认使用占位 AppID：`touristappid`
- 若当前微信开发者工具版本不支持该占位值，导入时请填写你自己的 AppID 或使用测试号
- **不要**在仓库中写入 AppSecret

## 本地配置不要提交

`project.private.config.json` 属于开发者工具本地配置：

- 已加入 `.gitignore`
- 不要创建或提交带有个人机器信息的版本
- 可由微信开发者工具自动生成

## 如何修改环境 API 地址

编辑：

```text
miniprogram/config/env.ts
```

根据 `wx.getAccountInfoSync().miniProgram.envVersion` 选择：

| 环境 | 默认地址 |
| --- | --- |
| `develop` | `http://127.0.0.1:3100`（Mock API Server） |
| `trial` | `https://api-trial.example.com`（TODO 占位） |
| `release` | `https://api.example.com`（TODO 占位） |

所有 API 地址集中在此文件配置，不要散落在页面代码中。

## 如何新增页面

1. 在 `miniprogram/pages/` 下新建页面目录（含 `.ts` / `.json` / `.wxml` / `.wxss`）
2. 在 `miniprogram/app.json` 的 `pages` 数组中注册路径
3. 使用微信开发者工具重新编译

## 如何调用后端接口

1. 在 `miniprogram/services/api.ts` 中新增接口方法
2. 底层请求走 `miniprogram/services/request.ts`（基于 `wx.request`）
3. 页面中导入并调用对应方法

示例（已实现）：

```ts
import { getHealth } from '../../services/api';

const result = await getHealth(); // GET /api/health
```

## 当前页面（第一阶段）

四个一级 Tab：

- `pages/index/index` — 首页（Banner / 快捷入口 / 最新资讯）
- `pages/services/index` — 服务骨架
- `pages/kb-life/index` — KB 生活骨架
- `pages/profile/index` — 我的骨架

设计说明见仓库根目录 `docs/frontend-demo-analysis.md`。素材状态见 `miniprogram/assets/README.md`。

## 类型检查

在仓库根目录：

```bash
pnpm typecheck:miniprogram
```

或：

```bash
pnpm --filter @app/miniprogram typecheck
```

## 共享类型说明

当前阶段小程序维护本地类型（`miniprogram/types/api.ts`），不强行接入 workspace 包，以避免微信开发者工具 npm 构建复杂度。后续可通过构建、代码生成或复制声明文件与 `packages/shared` 对齐。
