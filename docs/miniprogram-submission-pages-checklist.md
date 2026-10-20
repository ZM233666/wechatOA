# 小程序提审前改动清单（页面 · 文件级）

范围：`apps/miniprogram/miniprogram/app.json` 中注册的页面路径。  
路径前缀：页面文件均相对于 `apps/miniprogram/miniprogram/`。

## 图例

| 标记 | 含义 |
|------|------|
| 🔴 | 提审包内**可达**时，当前状态易拒审或存在明显合规/安全风险 |
| 🟠 | 页面仍保留或入口仍展示时**必改** |
| 🟡 | 强烈建议（分享深链、体验、域名等） |

关联接口均为正式 Mini API：`GET https://<api-host>/api/v1/mini<path>`（与 `services/endpoints.ts` 一致）。

---

## 1. Home（Tab）

| 页面路径 | 主要文件 | 必改项 | 关联接口 |
|----------|----------|--------|----------|
| `pages/index/index` | `pages/index/index.ts`<br>`pages/index/index.wxml`<br>`pages/index/index.json`<br>`pages/index/index.wxss`<br>`services/home.service.ts` | 🔴 release 下 `/home` 可用（真实 HTTPS，非 Mock/占位域名）<br>🔴 快捷入口指向页不能长期为「待补充」壳（未就绪则改 `entries` 或隐藏入口） | `GET /home` |
| | `pages/index/index.wxml`（`status-feedback`） | 🟡 仅 `develop` 显示；确认正式提审包为 `trial`/`release`，勿误用 develop 包 | `GET /health`（开发诊断） |

---

## 2. Services（Tab 及子页）

| 页面路径 | 主要文件 | 必改项 | 关联接口 |
|----------|----------|--------|----------|
| `pages/services/index` | `pages/services/index.ts`<br>`pages/services/index.wxml`<br>`services/services.service.ts` | 🟠 Insights 与 `gating` 与后端一致；gated 详情须 `loginCode`/JWT + 403 | `GET /services` |
| `pages/services/insights/index` | `pages/services/insights/index.ts`<br>`pages/services/insights/index.wxml` | 🟠 同上 | `GET /services/insights` |
| `pages/services/insights/reader` | `pages/services/insights/reader.ts`<br>`pages/services/insights/reader.json`<br>`pages/services/insights/reader.wxml`<br>`components/services/insight-reader/*` | 🔴 分享 path 带 `id` 深链；gated 报告须绑定身份/403<br>🟡 阅读器拉取详情失败时勿暴露 Mock 域名资源 | `GET /services/insights/:id` + `loginCode` |
| `pages/services/insights/access-denied/index` | `pages/services/insights/access-denied/index.ts`<br>`pages/services/insights/access-denied/index.wxml` | 🟠 勿在未授权时请求 Insight 详情；引导至 Profile 身份绑定 | — |

---

## 3. KB Life（Tab 及子页）

| 页面路径 | 主要文件 | 必改项 | 关联接口 |
|----------|----------|--------|----------|
| `pages/kb-life/index` | `pages/kb-life/index.ts`<br>`pages/kb-life/index.wxml`<br>`pages/kb-life/index.wxss`<br>`services/kb-life.service.ts` | 🔴 WeTalk / 园区服务等与身份绑定一致；UI 与 API 403 一致 | `GET /kb-life/entries`<br>`GET /kb-life/wetalk*` + `loginCode` |
| `pages/kb-life/campus-map/index` | `pages/kb-life/campus-map/index.ts`<br>`pages/kb-life/campus-map/index.wxml`<br>`utils/campus-location.ts` | 🟠 `rejectVisitorCampusAccess` + 服务端 `requireBoundIdentity` | `GET /kb-life/campus-map?location=` + `loginCode` |
| `pages/kb-life/shuttle-bus/index` | `pages/kb-life/shuttle-bus/index.ts`<br>`pages/kb-life/shuttle-bus/index.wxml`<br>`utils/shuttle-map.ts` | 🟠 同上 | `GET /kb-life/shuttle?location=` + `loginCode` |
| `pages/kb-life/canteen/index` | `pages/kb-life/canteen/index.ts`<br>`pages/kb-life/canteen/index.wxml` | 🟠 同上 | `GET /kb-life/canteen?location=` + `loginCode` |
| `pages/kb-life/holiday-calendar/index` | `pages/kb-life/holiday-calendar/index.ts`<br>`pages/kb-life/holiday-calendar/index.wxml` | 🟠 同上 | `GET /kb-life/holiday-calendar?location=` + `loginCode` |
| `pages/kb-life/open-positions/index` | `pages/kb-life/open-positions/index.ts`<br>`pages/kb-life/open-positions/index.wxml` | 🟠 **访客可读**；release 需 CMS 已发布岗位或接受空列表 | `GET /kb-life/open-positions` |
| `pages/kb-life/open-positions/detail` | `pages/kb-life/open-positions/detail.ts`<br>`pages/kb-life/open-positions/detail.wxml` | 🟠 同上；投递按钮仍为引导文案 | `GET /kb-life/open-positions/:id` |
| `pages/kb-life/guidance/index` | `pages/kb-life/guidance/index.ts`<br>`pages/kb-life/guidance/index.wxml` | 🟠 **访客可读**（列表 + 子手册页） | `GET /kb-life/guidance-documents` |
| `pages/kb-life/handbook/index` | `pages/kb-life/handbook/index.ts`<br>`pages/kb-life/handbook/index.wxml` | 🟠 访客可读 | `GET /kb-life/handbook` |
| `pages/kb-life/financial-handbook/index` | 财务手册 hub（注意事项 / 使用手册入口） | 🟠 访客可读 | `GET /kb-life/financial-handbook` |
| `pages/kb-life/financial-handbook/document/index` | 分区详情 + `wx.downloadFile` | 🟠 访客可读 | `GET /kb-life/financial-handbook`（按 `section` 展示） |
| `pages/kb-life/care/index` | `pages/kb-life/care/index.ts`<br>`pages/kb-life/care/index.wxml`<br>`services/kb-life.service.ts` | ✅ 策略 B：`GET /kb-life/care` + 身份绑定；见 [employee-care-api.md](./employee-care-api.md) | `GET /kb-life/care` + `loginCode` |
| `pages/kb-life/events/index` | `pages/kb-life/events/index.ts`<br>`pages/kb-life/events/index.wxml` | 🟠 `getCompanyActivities` 在 release 可用 | `GET /kb-life/activities` |
| `pages/kb-life/events/annual-dinner/index` | 各 `index.ts` / `index.wxml` | 🟠 活动详情非 Mock | 由 activities 配置 |
| `pages/kb-life/events/outings/index` | 同上 | 🟠 同上 | 同上 |
| `pages/kb-life/events/health/index` | 同上 | 🟠 含 `wx.downloadFile` | 同上 |
| `pages/kb-life/events/highlight-moments/index` | 各 `index.ts` / `index.wxml` | 🟠 相册列表 | `GET /kb-life/activities`（`highlightMoments.albums`） |
| `pages/kb-life/events/highlight-moments/album/index` | 同上 | 🟠 单相册图片网格；含 `wx.previewImage` | 同上（按 `album.id` 取图） |

---

## 4. My Profile（Tab）

| 页面路径 | 主要文件 | 必改项 | 关联接口 |
|----------|----------|--------|----------|
| `pages/profile/index` | `pages/profile/index.ts`<br>`pages/profile/index.wxml`<br>`services/profile.service.ts`<br>`services/identity-binding.service.ts` | 🟠 身份绑定 + 基本信息；无 Demo Role Switcher | `GET /profile` + `loginCode`<br>GET/POST `/profile/identity-binding` |

---

## 5. Home 子页（非 Tab，首页/导航可达）

| 页面路径 | 主要文件 | 必改项 | 关联接口 |
|----------|----------|--------|----------|
| `pages/news/index` | `pages/news/index.ts`<br>`services/news.service.ts` | 🟠 列表/空态/错误态；封面 HTTPS | `GET /news*` |
| `pages/news/detail` | `pages/news/detail.ts`<br>`components/common/article-renderer/*` | 🟡 分享内容须已发布 | `GET /news/:id` |
| `pages/brand/index` | `pages/brand/index.ts` | 🟠 避免长期空壳 | `GET /brand` |
| `pages/products/index` | `pages/products/index.ts` | 🔴 联系信息「待补充」须改或隐藏 | `GET /products*` |
| `pages/products/detail` | `pages/products/detail.ts` | 🟠 详情可读 | `GET /products/:id` |
| `pages/cases/index` | `pages/cases/index.ts` | 🟠 入口开放则须可用数据 | `GET /cases*` |
| `pages/cases/detail` | `pages/cases/detail.ts` | 🟠 同上 | `GET /cases/:id` |

---

## 6. 跨页组件

| 文件 | 必改项 |
|------|--------|
| `components/services/insight-reader/index.ts` | gated / WeTalk / campus-map 详情须带身份校验 |
| `utils/identity-access.ts` | 客户端权限与 `identityBindingRecord` 一致 |
| `components/common/article-renderer/*` | 富文本外链合规 |

---

*全局配置与 Django 全量 Mini API 见 `docs/miniprogram-backend-prep.md`、`docs/mock-to-real-backend.md`、`docs/identity-binding-api.md`。*
