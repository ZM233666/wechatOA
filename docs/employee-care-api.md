# 员工关怀 Mini API

员工关怀列表页数据来自 CMS/Fixture，**非**小程序本地 mock。

## 接口

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/kb-life/care` | 返回 Hero + 关怀 initiative 列表 |

前缀：Mock `{apiBase}/api/kb-life/care`；正式 `{apiBase}/api/v1/mini/kb-life/care`。

### 鉴权

- Query **`loginCode`**（`wx.login` 的 code，与身份绑定一致）
- **已绑定**身份（`roleLabel` 为 Employee 或 Customer）方可访问
- 未绑定：HTTP **403**，`error.code` 建议 `UNAUTHORIZED`

WeTalk / 员工手册为 Employee 专属；员工关怀与园区服务同级，Customer 绑定用户也可访问。

### 响应 `EmployeeCareData`

```json
{
  "hero": {
    "title": "…",
    "subtitle": "…",
    "image": { "url": "https://…", "alt": "…", "width": 800, "height": 400, "aspectRatio": 2 }
  },
  "initiatives": [
    {
      "id": "care-wash",
      "title": "…",
      "category": "Global Care",
      "date": "2026-08-01",
      "description": "…",
      "image": { "url": "https://…", "alt": "…", "width": 400, "height": 300, "aspectRatio": 1.33 },
      "showOnKbLifeBanner": true
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `showOnKbLifeBanner` | 可选。`true` 时该 initiative 进入 **KB Life 顶栏轮播**（可多篇，类比首页新闻 Banner）；**不会**在 Employee Care 列表顶重复展示 |

### KB Life 顶栏 Banner

`GET /kb-life/entries` 的 `banners[]` **优先**来自已发布关怀 initiative 中 `showOnKbLifeBanner=true` 的条目（按 `date` 倒序，最多 5 条）。若无勾选项，回退 `fixtures/kb-life/entries.json` 中的静态 `banners`。

Banner 项含 `careId`、`targetUrl`（跳转关怀列表页，可带 `initiativeId` query）。

**管理端（Local/Global Care 当前稿）字段建议：**

- 全球稿：`global_show_on_kb_life_banner`
- 本地稿：`local_show_on_kb_life_banner`

Mock 映射为 initiative 的 `showOnKbLifeBanner`。

空列表合法：`initiatives: []`（小程序展示「暂无关怀活动」）。

## Mock Server

- 默认 Fixture：`apps/mock-server/fixtures/kb-life/care.json`
- 开启 `LOCAL_GLOBAL_CARE_ENABLED=true` 时：**优先**请求 Django Mini `GET /api/v1/mini/kb-life/local-global-care/?campus=suzhou`（多篇 `LocalGlobalCareArticle`，含 `showOnKbLifeBanner`）；失败或无文稿时回退 JWT 旧接口 `GET /api/local-global-care/care/current/`；再失败则用 fixture
- 控制器：`getEmployeeCare` → `requireBoundIdentity`

## 小程序

- `services/kb-life.service.ts` → `getEmployeeCare()`（附带 `loginCode`）
- `subpackages/kb-life/care/index`：加载 / 空态 / 错误态；`onLoad` 未绑定则拦截
- KB Life 入口：`entries.json` 中 `employeeServices` → `path: /subpackages/kb-life/care/index`

| GET | `/kb-life/care/:id` | 单篇已发布文稿（`contentHtml`、`richContent`、封面、`author` 等）；`id` 可为 `care-local-12` 或 `12`。含 CMS 轮播时走 `richContent` 的 `carousel` 块，与新闻详情一致。`author` 来自 CMS 文稿字段，有值时详情展示 `author · date` |

列表「Read More」与 KB Life 顶栏 Banner 跳转 `subpackages/kb-life/care/detail`。

## Django 实现要点（待做）

1. 内容模型：Hero + 多条 Initiative（封面图走对象存储 URL）
2. GET 按 openid 校验绑定状态，规则与 Mock `identity-guard` 一致
3. Admin 发布/下架；Mini 只读已发布数据
