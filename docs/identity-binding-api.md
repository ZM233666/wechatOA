# 身份绑定 Mini API（小程序 ↔ 后端）

用户输入**公司邮箱**，后端按**完整邮箱**或**邮箱域名后缀**与库内授权数据匹配；匹配成功则将 **微信 openid**（由 `loginCode` 经 code2Session 得到）与邮箱建立绑定。

## 接口

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/profile/identity-binding` | 查询当前微信用户是否已绑定 |
| POST | `/profile/identity-binding` | 提交邮箱并尝试绑定 |

前缀：Mock `GET/POST {apiBase}/api/profile/identity-binding`；正式 `{apiBase}/api/v1/mini/profile/identity-binding`。

### GET 查询

Query：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `loginCode` | 是 | 小程序 `wx.login()` 返回的 `code` |

响应 `IdentityBindingStatus`：

```json
{
  "bound": true,
  "binding": {
    "companyEmail": "edward.chen@knorr-bremse.com",
    "boundAt": "2026-10-15T08:00:00.000Z",
    "displayName": "爱德华 · Edward",
    "department": "Digital Solutions",
    "roleLabel": "Employee"
  }
}
```

未绑定时：`{ "bound": false, "binding": null }`。

### POST 绑定

Body（`IdentityBindingSubmitBody`）：

```json
{
  "companyEmail": "user@knorr-bremse.com",
  "loginCode": "081xxxx"
}
```

成功：与 GET 中 `binding` 结构一致，包在 `{ bound: true, binding: {...} }`。

失败：

| HTTP | 场景 |
| --- | --- |
| 400 | 参数无效；邮箱不在授权名录/域名白名单 |
| 409 | 当前 openid 已绑定其他邮箱 |

## Mock Server

- 授权数据：`fixtures/profile/identity-bind-registry.json`（`entries` 精确邮箱 + `allowedDomains` 后缀）
- openid：开发环境固定为 `mock-openid-local-wechat-user`（模拟同一微信用户）
- 绑定关系：进程内存（重启 Mock 会清空）

## 小程序

### 会话身份（一次同步、处处复用）

1. **`App.onLaunch`**：`syncIdentitySession()` → 单次 `wx.login` + **GET** 身份绑定，写入 `identityBindingRecord`。
2. **`identity-login.service.ts`**：同一会话内复用 `loginCode`（约 4 分钟），供 `/profile`、受保护 KB Life / Services 等 Mini API 查询参数使用，避免每次请求再 `wx.login`。
3. **`utils/identity-access.ts`**：My Dashboard、园区地图/班车/食堂/假期、WeTalk、Insights gating 等**只读本地 tier**（`visitor` / `customer` / `employee`），点击功能时不重复拉绑定接口。
4. 用户在 Setting 完成 **POST 绑定** 后：`applyIdentityBindingToSession()` 立即更新本地快照；**KB Life / Services** Tab 通过 `identitySessionRevision` 订阅与 `onShow` 检测自动重拉列表，无需手动刷新。

### 相关模块

- `services/identity-session.service.ts`：启动同步与 `globalData.identitySession` 快照
- `services/identity-binding.service.ts`：`fetchIdentityBindingFromServer`、`submitIdentityBinding`
- 员工关怀：`GET /kb-life/care`（见 [employee-care-api.md](./employee-care-api.md)）
- 本地 `identityBindingRecord`：GET 失败时的展示与权限回退；成功同步后以服务端为准

## Django 实现要点（待做）

1. `code` → 微信 `code2Session` → `openid`（及可选 `unionid`）
2. 校验 `companyEmail`：精确匹配员工/客户表，或域名在白名单
3. 持久化 `(openid, company_email, bound_at, …)`，GET 按 openid 返回
4. 错误文案与上表保持一致，便于小程序直接展示 `message`
