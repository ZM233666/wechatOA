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
      "image": { "url": "https://…", "alt": "…", "width": 400, "height": 300, "aspectRatio": 1.33 }
    }
  ]
}
```

空列表合法：`initiatives: []`（小程序展示「暂无关怀活动」）。

## Mock Server

- 默认 Fixture：`apps/mock-server/fixtures/kb-life/care.json`
- 开启 `LOCAL_GLOBAL_CARE_ENABLED=true` 时：JWT 拉取管理端 `GET /api/local-global-care/care/current/?campus=suzhou`，将已发布的本地/全球富文本映射为 `hero` + 最多 2 条 `initiatives`（`Global Care` / `Local Care`）；失败或未发布时回退 fixture
- 控制器：`getEmployeeCare` → `requireBoundIdentity`

## 小程序

- `services/kb-life.service.ts` → `getEmployeeCare()`（附带 `loginCode`）
- `subpackages/kb-life/care/index`：加载 / 空态 / 错误态；`onLoad` 未绑定则拦截
- KB Life 入口：`entries.json` 中 `employeeServices` → `path: /subpackages/kb-life/care/index`

Initiative 详情页尚未实现；列表项「Read More」为 coming soon，后续可增 `GET /kb-life/care/:id`。

## Django 实现要点（待做）

1. 内容模型：Hero + 多条 Initiative（封面图走对象存储 URL）
2. GET 按 openid 校验绑定状态，规则与 Mock `identity-guard` 一致
3. Admin 发布/下架；Mini 只读已发布数据
