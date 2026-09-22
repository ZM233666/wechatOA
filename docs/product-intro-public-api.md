# Product Intro 微信公开读接口（Django 实现指南）

本文档供 **Django 后端仓库** 使用。本 monorepo 已包含 Mock Server 代理与小程序页面；后端需新增下列公开只读接口后，Mock 才会优先走公开 API。

## 数据模型（三系统分表）

`product_intro` **无** `is_home_recommended` 字段（该字段仅用于新闻/article-content，勿混用）。

| system（API 路径） | Django 表名 |
|-------------------|-------------|
| `braking` | `wechat_management_product_intro_braking` |
| `door` | `wechat_management_product_intro_door` |
| `power-supply` | `wechat_management_product_intro_power_supply` |

### 字段与小程序展示对应关系

| 字段 | 类型 | 小程序用途 |
|------|------|------------|
| `is_top` | bool | **置顶产品**：Products 页三系统磁贴封面；详情页顶部标题/封面/简介 |
| `is_core_product` | bool | **核心产品**：详情页「Core Products」模块列表（仅 `true` 的已发布产品） |
| `cover_url` | string | 产品封面图（相对路径或绝对 URL） |
| `summary` | string | 简介 |
| `detail_items` | JSON | 结构化详情块 |

同一产品可同时 `is_top=true` 且 `is_core_product=true`（顶部置顶 + 出现在 Core Products 列表）。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/product-intro/public/{system}/products/` | 某系统已发布产品列表 |
| GET | `/api/product-intro/public/{system}/products/{id}/` | 某系统产品详情 |

`{system}` 取值：`braking` | `door` | `power-supply`

```python
permission_classes = [AllowAny]
authentication_classes = []
```

### 查询逻辑

- `status = 'published'`
- `is_deleted = False`
- 列表默认排序：`-is_top`、`-update_datetime`（封面图取 `is_top=true` 的置顶产品）
- 可选 query：`category`、`is_core_product=true`

### 返回字段（不含 creator/modifier 等审计字段）

`id`, `product_name`, `category`, `product_no`, `summary`, `detail_items`, `cover_url`, `is_core_product`, `is_top`, `publish_time`, `update_datetime`

### 封面与模块规则（小程序）

| 展示位置 | 数据来源 |
|----------|----------|
| Products 页三系统磁贴封面 | `is_top=true` 产品的 `cover_url` |
| 详情页顶部（标题/封面/简介） | `is_top=true` 产品 |
| 详情页 Core Products 列表 | **仅** `is_core_product=true` 的产品 |

若无 `is_top=true` 的已发布产品，磁贴/顶部**不展示封面与置顶文案**（仅保留系统名称按钮）；Core Products 仍按 `is_core_product` 展示。

### 成功响应（dvadmin）

列表：

```json
{
  "code": 2000,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "product_name": "test01",
      "category": "braking",
      "product_no": "KB-001",
      "summary": "产品简介",
      "detail_items": [{ "id": "d1", "title": "规格", "content": "..." }],
      "cover_url": "/media/products/cover.jpg",
      "is_core_product": true,
      "is_top": true,
      "publish_time": "2026-01-01T08:00:00Z",
      "update_datetime": "2026-01-02T08:00:00Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "is_next": false,
  "is_previous": false
}
```

详情：`code=2000`，`data` 为单条对象（字段同上）。

无已发布产品：列表 `data=[]`；详情 404 或 `data=null`（Mock 会回退 fixture）。

---

## detail_items

JSON 数组，顺序即展示顺序：

```json
[{ "id": "...", "title": "...", "content": "..." }]
```

元素可自由扩展；小程序按 key 渲染，优先 `title` + `content`。不要用 HTML。

---

## 三系统 Tab

| system | 中文 |
|--------|------|
| braking | 制动系统 |
| door | 门系统 |
| power-supply | 电源系统 |

---

## 与本仓库 Mock Server 联调

`apps/mock-server/.env`：

```env
PRODUCT_INTRO_ENABLED=true
PRODUCT_INTRO_API_BASE_URL=http://127.0.0.1:8000
PRODUCT_INTRO_MEDIA_BASE_URL=http://127.0.0.1:8000
PRODUCT_INTRO_TRY_PUBLIC=true
PRODUCT_INTRO_USERNAME=superadmin
PRODUCT_INTRO_PASSWORD=admin123456
```

**公开接口尚未上线时**：Mock 会自动回退管理端 JWT（`GET /api/product-intro/{system}/products/?status=published`），与品牌介绍、新闻联调方式一致。

数据流（小程序现有 UI，不改页面）：

```
小程序 GET /api/products/categories、GET /api/products/:id
  → Mock Server product-source.service
  → Django product_intro 三系统列表/详情
  → 映射为 legacy categories + detail（封面、Core Products、detail_items 文本）
  → 小程序 Products 列表页 / 详情页
```

Mock 另提供与 Django 路径对齐的代理（便于联调公开 API）：

```
GET /api/product-intro/public/{system}/products/
GET /api/product-intro/public/{system}/products/{id}/
```

远程失败或无 published 数据时，Mock 回退 `fixtures/products/`。

---

## 微信小程序

- 页面：`apps/miniprogram/miniprogram/pages/products/`（UI 不变）
- 服务：`products.service.ts` → `GET /api/products/categories`、`GET /api/products/:id`（经 Mock）
- 列表磁贴 id 为系统 slug（`braking` / `door` / `power-supply`）
- 详情页 Core Products 来自该系统 `is_core_product=true` 的已发布产品
- 结构化字段 `summary` + `detail_items`，不使用 HTML

### 合法域名（生产）

- request：`https://<API 域名>`
- downloadFile：media 或 MinIO 域名（封面）

---

## 约束

- 不给普通用户走管理端 JWT 登录
- 公开接口只读，禁止暴露 create/update/delete/import
- 生产环境必须 HTTPS
- 相对封面路径：`API_BASE_URL + cover_url`；已是 `http(s)` 则直接用

---

## 仓库参考（Django）

- 模型：`backend/product_intro/models.py`
- 管理端 API：`/api/product-intro/{braking|door|power-supply}/products/`
- 管理端前端：`web/src/views/articleContent/productIntro/index.vue`
