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
- 正式后端完成后**仍保留**本目录（独立开发 / 异常场景 / 自动化测试）；正式实现落在 `apps/backend`

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
| `MINIO_ENABLED` | `false` | 是否从 MinIO 拉取 Insights / WeTalk / 苏州地图与班车 PDF |
| `MINIO_ENDPOINT` / `PORT` | `127.0.0.1` / `9000` | S3 API 地址（控制台多为 9001，API 用 9000） |
| `MINIO_ACCESS_KEY` / `SECRET_KEY` | - | MinIO 账号 |
| `MINIO_BUCKET` | `wechat-official-account` | Bucket |
| `MINIO_INSIGHTS_PREFIX` | `kb-insights/` | Insights PDF 前缀 |
| `MINIO_WETALK_PREFIX` | `wetalk/` | WeTalk PDF 前缀 |
| `MINIO_SUZHOU_CAMPUS_MAP_PREFIX` | `suzhou/campus-map/` | 苏州园区地图 PDF 前缀 |
| `MINIO_SUZHOU_SHUTTLE_BUS_PREFIX` | `suzhou/shuttle-bus/` | 苏州班车时刻 PDF 前缀 |
| `NEWS_ARTICLE_ENABLED` | `false` | 新闻中心改从管理端 `article-content` 拉取 |
| `NEWS_ARTICLE_API_BASE_URL` | `http://127.0.0.1:8000` | 管理端 API |
| `NEWS_ARTICLE_INCLUDE_DRAFTS` | `false` | 为 true 时联调包含 draft；默认只显示 published |

Fixture JSON **禁止**硬编码 `http://127.0.0.1:3100`，只保存 `/mock-assets/...` 相对路径。

## API 示例

```bash
curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/api/home
curl 'http://127.0.0.1:3100/api/news?page=1&pageSize=3'
# 开启 NEWS_ARTICLE_ENABLED 后，id 形如 article-2（管理端主键）
curl http://127.0.0.1:3100/api/news/article-2
curl 'http://127.0.0.1:3100/api/news?__scenario=empty'
```

完整清单见 `docs/mock-api-inventory.md`。

## 图片目录

静态文件位于 `public/mock-assets/`，与小程序包内 `miniprogram/assets` 相互独立；正式小程序不打包本服务，本地图标不受影响。

## KB Insights / WeTalk / Shuttle PDF

| 模块 | 来源 |
| --- | --- |
| KB Insights | **MinIO** `wechat-official-account/kb-insights/`（同步到 `runtime/minio/kb-insights/`）；本地 `fixtures/services/insights/files/` 作兜底 |
| WeTalk | **MinIO** `wechat-official-account/wetalk/`（同步到 `runtime/minio/wetalk/`）；本地 `fixtures/kb-life/wetalk/files/` 作兜底 |
| 园区地图（苏州） | **MinIO** `wechat-official-account/suzhou/campus-map/`（`runtime/minio/suzhou/campus-map/`）；其他地点仍用本地 `locations/{Location}/Map/` |
| 班车时刻（苏州） | **MinIO** `wechat-official-account/suzhou/shuttle-bus/`（`runtime/minio/suzhou/shuttle-bus/`）；本地 `fixtures/kb-life/Shuttlebus/` 作兜底 |

开启 `MINIO_ENABLED=true` 后，启动时会从 MinIO 拉取 `kb-insights/`、`wetalk/`、`suzhou/campus-map/`、`suzhou/shuttle-bus/`；列表/详情接口也会按 TTL 后台刷新。其他地点园区资源仍读本地 fixtures。

```text
/mock-assets/services/insights/files/{filename}.pdf
/mock-assets/kb-life/wetalk/files/{filename}.pdf
```

对外提供下载；详情接口中的 `pdfUrl` 会转为绝对地址。阅读统一走小程序内翻页阅读器；打开详情时用 PyMuPDF 渲页。未配置 `pdfFile` 且仅有 JSON `pages` 时仍走 JSON 翻页。详见各目录下 `README.md`。


## 新闻中心（article-content）

开启 `NEWS_ARTICLE_ENABLED=true` 后，`/api/news*` 与首页 `latestNews` 优先读管理端：

- 登录：`POST /api/token/`（默认 `superadmin`）
- 列表：`GET /api/article-content/content/?content_type=article`
- 正文 `content_html` 会转成小程序 `richContent`；base64 图片落到 `runtime/news/media/`

关闭或同步失败时回退本地 `fixtures/news/`（迁移后该目录默认空壳，列表为空）。

本地已不再提交 news 文章 JSON、Insights/WeTalk/苏州地图/班车 PDF；这些一律以远程源为准，fixtures 目录仅保留空壳与 README。

## 修改 Fixture

1. 编辑仍在本地维护的 `fixtures/` JSON（产品/案例/品牌/食堂等）
2. 图片放到 `public/mock-assets/` 对应分类；PDF 上传到 MinIO 对应前缀（Insights / WeTalk / 苏州地图 / 苏州班车），或临时放入本地 `files/` / `Map/` / `Shuttlebus/` 兜底
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

## 切换到正式后端后如何使用本服务

1. Django/DRF（`apps/backend`）按同一契约实现 Mini API（`/api/v1/mini/*`）
2. trial / release 将小程序 `apiBaseUrl` 改为正式 HTTPS，`dataSource: 'real-server'`
3. 日常正式联调可停止 `pnpm dev:mock`；**本仓库仍保留** `apps/mock-server` 供独立开发、场景演示与自动化测试
4. 不要改页面业务逻辑；路径约定仅做 `/api/v1/mini` 前缀对齐
5. **不要**把迁移目标写成 NestJS / `apps/server`；详见 `docs/mock-to-real-backend.md`
