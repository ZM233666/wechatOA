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

可选排版属性：

- heading/paragraph `align`: left/center/right，缺省 left
- image `layout`: normal/wide/full，缺省 normal

示例见需求文档与 `fixtures/news/articles/news-001.json`。

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
