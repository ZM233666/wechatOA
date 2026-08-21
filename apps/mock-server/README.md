# Mock API Server

开发阶段独立 Mock API 服务，**不是**正式后端，也**不是**旧 NestJS `apps/server` 的一部分。正式后端目标为 DVAdmin Django/DRF（未来 `apps/backend`）。

## 定位

在真实后端尚未完成时，为微信小程序提供：

- 稳定的 JSON 业务数据
- 可通过 URL 访问的图片资源
- 公众号式结构化文章（`richContent`）
- 列表分页 / 筛选 / 详情
- empty / error / slow / unauthorized / not-found 等测试场景

小程序通过 `wx.request` 访问本服务。未来 Django Mini API（`/api/v1/mini/*`）实现同一契约后，只需改 `apiBaseUrl`（及必要的前缀对齐）。

## 为什么独立于正式后端 / 旧 NestJS

- 避免污染正式 Django 模块、权限与基础设施接入
- 避免污染已停扩的 NestJS 骨架（`apps/server`）
- Mock 场景、随机延迟、fixture 热数据不应进入生产代码路径
- 删除 Mock Server 时不应改动 `apps/server`；正式实现落在 `apps/backend`

## 安装和启动

在仓库根目录：

```bash
pnpm install
pnpm dev:mock
```

- 监听：`0.0.0.0:3100`
- 健康检查：`http://127.0.0.1:3100/api/health`
- 静态资源：`http://127.0.0.1:3100/mock-assets/...`

其他命令：

```bash
pnpm build:mock
pnpm start:mock
pnpm typecheck:mock
pnpm validate:mock
pnpm test:mock
```

## 环境变量

复制 `apps/mock-server/.env.example` 为 `.env`（可选）。`MOCK_PUBLIC_BASE_URL` 为空时，根据当前请求的 `protocol + host` 生成图片绝对地址。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `MOCK_HOST` | `0.0.0.0` | 监听地址 |
| `MOCK_PORT` | `3100` | 端口，非法值会在启动时报错 |
| `API_PREFIX` | `/api` | API 前缀 |
| `MOCK_DELAY_MIN` / `MAX` | `100` / `350` | 模拟延迟，MAX < MIN 时启动失败 |
| `MOCK_DEFAULT_SCENARIO` | `normal` | 默认场景 |
| `CORS_ORIGINS` | `*` | CORS |

Fixture JSON **禁止**硬编码 `http://127.0.0.1:3100`，只保存 `/mock-assets/...` 相对路径。

## API 示例

```bash
curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/api/home
curl 'http://127.0.0.1:3100/api/news?page=1&pageSize=3'
curl http://127.0.0.1:3100/api/news/news-001
curl 'http://127.0.0.1:3100/api/news?__scenario=empty'
```

完整清单见 `docs/mock-api-inventory.md`。

## 图片目录

静态文件位于 `public/mock-assets/`，与小程序包内 `miniprogram/assets` 相互独立，删除 Mock Server 不会带走小程序本地图标。

## 修改 Fixture

1. 编辑 `fixtures/` 下 JSON
2. 图片放到 `public/mock-assets/` 对应分类
3. 运行 `pnpm validate:mock`
4. 重启 `pnpm dev:mock`

## 场景切换

优先级：请求头 `X-Mock-Scenario` > Query `__scenario` > 环境变量 > `normal`。

| 场景 | 行为 |
| --- | --- |
| `normal` | 返回 fixture |
| `empty` | 列表 `items: []`，`total: 0` |
| `error` | HTTP 500，`MOCK_INTERNAL_ERROR` |
| `slow` | 额外延迟约 1.5–3s |
| `unauthorized` | HTTP 401 |
| `not-found` | HTTP 404 |

仅用于开发，正式后端不得实现这些参数。

## 微信开发者工具访问

1. 启动 `pnpm dev:mock`
2. 导入 `apps/miniprogram`
3. 详情 → 本地设置：勾选「不校验合法域名」
4. 开发版默认 `http://127.0.0.1:3100`

## 真机访问

- 手机上的 `127.0.0.1` 不是你的电脑
- 把小程序 `apiBaseUrl` 临时改为电脑局域网 IP，例如 `http://192.168.1.8:3100`
- **不要**把某台电脑的固定局域网 IP 提交进仓库
- Mock Server 已监听 `0.0.0.0`，防火墙需放行 3100
- 生产必须使用已配置的 HTTPS 合法域名

## 常见错误

| 现象 | 处理 |
| --- | --- |
| 启动失败，fixture 报错 | 看终端中的文件路径与字段，运行 `pnpm validate:mock` |
| 图片 404 | 确认 `public/mock-assets` 中存在对应文件 |
| 小程序 `url not in domain list` | 开发者工具关闭合法域名校验 |
| 真机请求失败 | 改局域网 IP，确认电脑与手机同一网络 |
| 端口/延迟配置报错 | 检查 `MOCK_PORT`、`MOCK_DELAY_MIN/MAX` |

## 停止使用 Mock Server

1. Django/DRF（`apps/backend`）按同一契约实现 Mini API（`/api/v1/mini/*`）
2. 将小程序 `apiBaseUrl` 改为正式 HTTPS 地址，`dataSource: 'real-server'`
3. 停止 `pnpm dev:mock`
4. 不要改页面业务逻辑；路径约定仅做前缀对齐
5. **不要**把迁移目标写成 NestJS / `apps/server`
