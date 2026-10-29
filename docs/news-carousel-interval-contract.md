# 新闻轮播后台对接说明（时长 + 循环）

**时长全链路单位：毫秒（ms）** —— HTML、`aa-config` JSON、Mini API `carousel.interval`、小程序 `swiper.interval` 均为毫秒。

**循环**：Mini API 字段 **`loop`**（boolean）→ 小程序 `swiper` 的 **`circular`**。缺省 **`true`**（与改版前行为一致）。

**自动播放**：与循环独立，由 **`autoplay`** / **`data-autoplay`** 控制。

---

## 1. Mini API 响应（小程序已对接）

`GET /api/news/:id`：

```json
{
  "success": true,
  "data": {
    "richContent": [
      {
        "id": "carousel-1",
        "type": "carousel",
        "slides": [{ "url": "https://.../a.png", "alt": "图1" }],
        "autoplay": true,
        "interval": 3000,
        "loop": true
      }
    ]
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `interval` | 单张停留 **毫秒**；缺省或非法时 **2000**；小程序钳制 **500～60000** |
| `loop` | 是否首尾衔接循环；缺省 **`true`** |
| `autoplay` | 是否自动轮播；通用轮播块默认仅 `data-autoplay="true"` 时为 true |

---

## 2. 停留时长（解析优先级）

1. **`data-interval="毫秒"`**（HTML 属性，推荐）
2. `data-aa-config` JSON 中的 **`intervalMs`**（推荐字段名）
3. 同 JSON 中的 **`interval`**（毫秒，与 `intervalMs` 等价）
4. 同 JSON 中的 **`scrollDuration`**（毫秒，历史字段名，与上同义）
5. 均未配置 → **2000**

---

## 3. 是否循环（解析优先级）

1. **`data-loop="true"` / `"false"`**（HTML 属性，推荐）
2. **`data-circular`**（与 `data-loop` 同义；若两者同时存在，**`data-loop` 优先**）
3. `data-aa-config` JSON 中的 **`loop`**
4. 均未配置 → **`true`**

`loop: false` 时：滑到最后一张后不会回到第一张（`circular=false`）。**不再**用 `loop: false` 表示关闭自动播放；关闭自动播放请设 **`autoplay: false`** 或 **`data-autoplay="false"`**。

**aa-svg-gallery 兼容**：若 JSON 未写 `autoplay`，仍按旧规则推断——`loop !== false` 或 `effect === "scroll"` 时为自动播放。

---

## 4. HTML 模板 A：aa-svg-gallery

```html
<section
  class="aa-svg-gallery"
  data-aa-svg-gallery="1"
  data-interval="3000"
  data-loop="true"
  data-aa-config="..."
>
```

`data-aa-config` 解码后示例（时长数值均为毫秒）：

```json
{
  "images": ["https://.../1.png", "https://.../2.png"],
  "intervalMs": 3000,
  "loop": true,
  "autoplay": true,
  "effect": "scroll"
}
```

3 秒应写 **`3000`**，不要写 `3`。同时存在时 **`data-interval` 优先于 JSON 内时长字段**；**`data-loop` 优先于 JSON 内 `loop`**。

`loop: true` 时，解析会对 `images` **按 URL 去重**。

---

## 5. HTML 模板 B：通用轮播

```html
<div
  data-kb-block="carousel"
  data-autoplay="true"
  data-interval="5000"
  data-loop="false"
>
  <img src="https://.../1.png" alt="图1" />
</div>
```

---

## 6. 后台检查清单

- [ ] 「单张时长」保存为 **毫秒**（3 秒 → `3000`）
- [ ] 写入 `data-interval` / `intervalMs`；写入 `data-loop` / `loop`
- [ ] 自动播放与循环分开配置（`autoplay` vs `loop`）
- [ ] 发布后同步新闻；`GET /api/news/:id` 中 `carousel.interval`、`carousel.loop` 与预期一致

---

## 7. 相关代码

| 环节 | 位置 |
| --- | --- |
| HTML → `interval` / `loop` | `apps/mock-server/src/services/article-carousel-html.ts` |
| 小程序渲染 | `apps/miniprogram/miniprogram/components/common/article-renderer/` |

见 [rich-content-schema.md](./rich-content-schema.md)。
