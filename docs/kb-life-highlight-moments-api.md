# KB Life · 精彩瞬间（Highlights）接口约定

管理员在 **Portal / Admin** 创建相册、编辑标题与正文、上传照片并为**每张照片**配置是否允许下载；小程序通过 **Mini API** 只读拉取已发布数据。

类型定义：`packages/shared` → `HighlightMomentsDetail`、`HighlightMomentsAlbum`、`HighlightMomentsAlbumImage`。

---

## 1. 小程序读取（必做）

### `GET /api/v1/mini/kb-life/activities`

Mock 等价路径：`GET /api/kb-life/activities`

| 项 | 说明 |
|----|------|
| 方法 | GET |
| 鉴权 | 与现有 KB Life 活动一致（建议：**员工身份** + `loginCode` 查询参数；访客是否可见由产品定，当前 Mock 未强制） |
| 响应 | 标准 `ApiResponse<ActivitiesData>`，见 [api-contracts.md](./api-contracts.md) |

`ActivitiesData` 中与精彩瞬间相关的字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `highlightMoments` | `HighlightMomentsDetail \| null` | `null` 表示未配置或未发布，小程序展示「暂无已发布的相册」 |
| `highlightMoments.title` | string | 列表页 Hero 标题，如 `精彩瞬间` |
| `highlightMoments.subtitle` | string | 列表页 Hero 副标题；可为空字符串，小程序可不展示 |
| `highlightMoments.albums` | `HighlightMomentsAlbum[]` | **仅已发布**相册，按后台排序（如 `sort` / `publishedAt` 降序） |

### 单本相册 `HighlightMomentsAlbum`

| 字段 | 类型 | 必填 | 管理员配置 | 小程序用途 |
|------|------|------|------------|------------|
| `id` | string | 是 | 系统稳定 ID（UUID/slug，勿用自增主键） | 列表跳转 `album?id=` |
| `title` | string | 是 | 相册标题 | Album 页 Hero 主标题 |
| `subtitle` | string | 是 | 副标题（可为 `""`） | Album 页 Hero 英文/补充标题 |
| `content` | string | 是 | 正文（纯文本，可含 `\n`） | Album 页正文区 |
| `dateLabel` | string | 否 | 发布日期展示，如 `2025-12` | Album 页「发布日期 xxx」 |
| `coverImage` | `ImageResource` | 是 | 封面图 | 列表卡片缩略图 |
| `images` | `HighlightMomentsAlbumImage[]` | 是，≥1 | 相册内照片列表（有序） | Album 页网格 + 预览 |

### 单张照片 `HighlightMomentsAlbumImage`

继承 [ImageResource](./api-contracts.md)（`url`, `alt`, `width`, `height`, `aspectRatio`），并增加：

| 字段 | 类型 | 必填 | 管理员配置 | 小程序行为 |
|------|------|------|------------|------------|
| `allowDownload` | boolean | 是 | 是否允许用户通过长按/预览菜单保存 | `true`：网格 `show-menu-by-longpress`；点击预览时 `showmenu: true`，且预览 `urls` 仅包含其它 `allowDownload: true` 的图。`false`：禁止长按菜单；预览单张且 `showmenu: false` |

**缺省策略**：后端必须显式返回 `allowDownload`，不要依赖小程序默认值；新建照片建议默认 `false`（涉密更安全），由管理员主动勾选「可下载」。

### 响应示例（节选）

```json
{
  "success": true,
  "data": {
    "live": true,
    "items": [],
    "outingsMeta": { "title": "...", "subtitle": "..." },
    "annualDinner": null,
    "outings": [],
    "health": null,
    "highlightMoments": {
      "title": "精彩瞬间",
      "subtitle": "",
      "albums": [
        {
          "id": "album-annual-2025",
          "title": "2025 年会",
          "subtitle": "Annual Dinner 2025",
          "content": "回顾 2025 年度表彰与晚宴精彩现场……",
          "dateLabel": "2025-12",
          "coverImage": {
            "url": "https://cdn.example.com/cover.png",
            "alt": "2025 年会封面",
            "width": 1200,
            "height": 540,
            "aspectRatio": 2.2222
          },
          "images": [
            {
              "url": "https://cdn.example.com/a.png",
              "alt": "现场 1",
              "width": 1200,
              "height": 540,
              "aspectRatio": 2.2222,
              "allowDownload": true
            },
            {
              "url": "https://cdn.example.com/b.png",
              "alt": "现场 2",
              "width": 1200,
              "height": 540,
              "aspectRatio": 2.2222,
              "allowDownload": false
            }
          ]
        }
      ]
    }
  }
}
```

### 列表页与详情页数据范围

- **v1（当前小程序）**：详情页不单独请求接口，从同一次 `activities` 响应中按 `album.id` 取完整相册（含全部 `images`）。
- **可选优化（相册很大时）**：增加 `GET /api/v1/mini/kb-life/highlight-moments/albums/:id`，响应体为单个 `HighlightMomentsAlbum`；列表接口的 `albums` 可只返回摘要（无 `images` 或仅 `coverImage`）。与后端对齐前，小程序仍按「全量嵌在 activities」实现。

---

## 2. 管理端写入（后端 / Portal 实现）

本仓库 Mock **不实现** Admin CRUD；建议 Django 提供例如：

| 能力 | 建议 |
|------|------|
| 相册 CRUD | `POST/PATCH/DELETE /api/v1/admin/kb-life/highlight-moments/albums` |
| 相册内图片 | 上传 OSS/CDN 后写入 `images[]`，每条含 `allowDownload` |
| 发布状态 | `draft` / `published`；Mini 只返回 `published` |
| 排序 | `sort` 或 `publishedAt` |

Admin 表单字段与 Mini 字段 **同名同型**，避免额外映射。

---

## 3. 安全与合规（给后端 & 产品）

- `allowDownload: false` 仅关闭微信内**长按/预览保存菜单**，无法防止截屏、录屏或 URL 外传。
- 涉密图建议：员工鉴权、短时签名 URL、审计日志；必要时水印或独立存储域。
- `url` 应为 HTTPS；与现有 `ImageResource` 及 CDN 镜像策略一致。

---

## 4. Mock 联调 vs 真实后端

### 为什么页面还是 fixture？

本地 **develop** 小程序默认请求 **`http://127.0.0.1:3100`**（mock-server），不是 Django。Mock 在未开启 live 时会把 `highlightMoments` 合并自 `fixtures/kb-life/highlight-moments-albums.json`，因此会看到「2025 年会」等模拟数据。

### 方式 A：mock-server 转发 Django（推荐本地联调）

在 `apps/mock-server/.env` 中：

```env
HIGHLIGHT_MOMENTS_ENABLED=true
HIGHLIGHT_MOMENTS_API_BASE_URL=http://127.0.0.1:8000
HIGHLIGHT_MOMENTS_USERNAME=superadmin
HIGHLIGHT_MOMENTS_PASSWORD=admin123456
```

Mock 会用 JWT 请求 **`GET {BASE}/api/v1/mini/kb-life/activities`**，取响应里的 `highlightMoments` 覆盖 fixture。开启后拉取失败则返回 `null`，**不再** silently 回退 fixture。

修改后 **重启 mock-server**。可看 mock 日志 `Loaded highlight moments from Django Mini API` 或 `Highlight moments live load failed`。

若后端已有数据但页面仍「暂无已发布的相册」，且日志含 `must start with "/mock-assets/"`，说明 Mock 曾用 fixture 规则校验 Django 的 MinIO/CDN 链接；现网代码已改用 `highlightMomentsDetailLiveSchema` 接受 `http(s)` 图片 URL。

### 方式 B：小程序直连 Django

修改 `apps/miniprogram/miniprogram/config/env.ts` 的 `develop`：`apiBaseUrl` 指向 Django 域名/IP，`miniApiPathPrefix: '/api/v1/mini'`，`dataSource: 'real-server'`。真机需 HTTPS 与合法域名。

### Fixture（仅 HIGHLIGHT_MOMENTS_ENABLED=false）

- `apps/mock-server/fixtures/kb-life/highlight-moments-albums.json`
- 修改 fixture 后需 **重启 mock-server**

相关页面：`subpackages/kb-life/events/highlight-moments/index`、`.../album/index`。

### 后端改了封面，小程序为什么不更新？

常见有三层缓存，按顺序排查：

1. **mock-server 内存缓存（方式 A）**  
   默认约 **60s**（`HIGHLIGHT_MOMENTS_SYNC_TTL_MS`）内不会再次请求 Django。  
   联调可设 `HIGHLIGHT_MOMENTS_SYNC_TTL_MS=0` 或 **重启 mock-server** 立刻刷新。

2. **页面未重新拉接口**  
   列表 / Album 在 **再次进入页面（onShow）** 时会重新请求 `activities`（已实现）。从 Album 返回列表、或切 Tab 再进，应拿到新 JSON。

3. **微信 `<image>` 本地缓存**  
   若 JSON 里 `coverImage.url` **字符串完全不变**（同路径、同签名），可能仍显示旧图。  
   后端换封面时应 **换对象 key 或 URL**，或在 URL 上带版本/query（如 `updatedAt`）；MinIO 预签名 URL 每次拉接口通常会变 query，一般能破缓存。

确认 JSON 是否已更新：直接请求 `http://127.0.0.1:3100/api/kb-life/activities`，看 `coverImage.url` 是否已是新地址。
