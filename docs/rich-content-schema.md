# 富文本内容模型

文章正文字段名为 `richContent`，类型为可判别联合 `ArticleContentBlock[]`。

**不要**把任意 HTML 交给小程序 `rich-text`。

## Block 类型

| type | 说明 |
| --- | --- |
| `heading` | `level` 1–3 + `text` |
| `paragraph` | `spans[]`，行内 `text` / `link`，`marks`: bold/italic/underline |
| `image` | `image: ImageResource` + 可选 `caption` |
| `quote` | `text` + 可选 `source` |
| `list` | `ordered` + `items: string[]` |
| `divider` | 分隔线 |
| `callout` | `variant`: info/warning/success/exclusive |
| `link` | `text` + `url` + `linkType`: internal/external |
| `carousel` | `slides: ImageResource[]`；可选 `caption`、`autoplay`、`interval`（**毫秒**）、`loop`（缺省 true） |
| `video` | `src`；可选 `poster`、`caption` |

可选排版属性：

- heading/paragraph `align`: left/center/right，缺省 left
- image `layout`: normal/wide/full，缺省 normal

示例见需求文档与 `fixtures/news/articles/news-001.json`。

### CMS HTML 嵌入（新闻 `content_html`）

管理端可在 wangEditor HTML 中插入下列结构，Mock/Django 同步时会转为 `richContent` Block，小程序用 `article-renderer` 渲染（`rich-text` 无法播放视频 / 轮播）：

**SVG / 图片轮播**

```html
<div data-kb-block="carousel" data-caption="说明文字" data-autoplay="true" data-interval="5000" data-loop="true">
  <img src="https://.../a.svg" alt="图1" />
  <img src="https://.../b.png" alt="图2" />
</div>
```

或使用 `data-slides='[{"url":"https://.../a.svg","alt":"图1"}]'`；也支持 class：`kb-carousel` / `kb-media-carousel` / `wx-svg-carousel`。

**管理端 SVG 动图图集（aa-svg-gallery）**

识别 `<section class="aa-svg-gallery" data-aa-svg-gallery="1" data-aa-config="...">`（`data-aa-config` 为 URL 编码 JSON，含 `images[]`、`intervalMs` / `interval` / `scrollDuration`（均为**毫秒**）、`loop`、`autoplay` 等）。容器上还可写 `data-interval`、`data-loop`（或 `data-circular`）。小程序转为 `carousel.interval` / `carousel.loop`；时长未配置时默认 2000ms，循环未配置时默认 true。`loop=true` 时按 `images` 去重。

**后台对接细则（时长、循环、HTML 模板、API 字段）见 [news-carousel-interval-contract.md](./news-carousel-interval-contract.md)。**

**视频**

```html
<video src="https://.../clip.mp4" poster="https://.../poster.jpg" data-caption="说明"></video>
```

视频域名须配置到小程序「downloadFile 合法域名」。新闻正文轮播（动图）默认 **不可点击放大**（`article-renderer` 的 `carouselPreview=false`），仅支持 swiper 滑动切换。

## 小程序渲染

组件：`components/common/article-renderer/`

- 按 `block.type` 渲染
- 图片 `mode="widthFix"`，失败显示占位
- 内部链接 `wx.navigateTo` / Tab 页 `wx.switchTab`
- 外部链接弹窗提示，不直接打开网页
- 未知 type 忽略，开发环境 `console.warn`，页面不崩溃

## 安全限制

- 不执行 script / iframe / style 注入 / 事件属性
- 不使用 `DOMParser`、`document`、`window`
- 若将来转换为 `rich-text` nodes，只允许受控 Block 映射

## 图片规则

- JSON 中只存 `/mock-assets/...`
- 必须有 `alt`
- 列表封面与正文大图使用不同字段，不假设同一比例

## 内部链接规则

`linkType: "internal"` 且 `url` 以 `/pages/` 开头时走小程序路由。

## 未知类型

向前兼容：新增 block 时旧客户端忽略即可。
