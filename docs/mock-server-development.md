# Mock Server 开发指南

## 添加一篇新闻

1. 在 `fixtures/news/list.json` 增加摘要，ID 如 `news-009`
2. 必须同时在 `fixtures/news/articles/news-009.json` 写完整 `richContent`（列表 ID 必须能打开对应详情）
3. 封面放到 `public/mock-assets/news/`
4. 分类 ID 必须已存在于 `fixtures/news/categories.json`
5. `relatedIds` 必须指向真实存在的新闻 ID
6. 运行 `pnpm validate:mock`

## 添加产品

1. `fixtures/products/list.json` 增加摘要
2. 详情放到 `fixtures/products/details/product-00x.json`
3. 分类 `featuredProductId` 必须指向列表中的产品
4. 运行校验

## 添加案例

同产品：`cases/list.json` + `cases/details/` + 分类表。

## 添加图片

1. 文件放入 `apps/mock-server/public/mock-assets/<分类>/`
2. fixture 中写相对路径 `/mock-assets/...`
3. 填写 `alt/width/height/aspectRatio`
4. 不要引用 `miniprogram/assets` 作为静态托管目录

## 校验 fixture

```bash
pnpm validate:mock
```

启动时也会做同样校验；失败会打印文件路径和字段，不会静默忽略。

## 测试异常场景

```bash
curl 'http://127.0.0.1:3100/api/news?__scenario=empty'
curl 'http://127.0.0.1:3100/api/news?__scenario=error'
curl 'http://127.0.0.1:3100/api/news?__scenario=unauthorized'
curl 'http://127.0.0.1:3100/api/news?__scenario=not-found'
curl 'http://127.0.0.1:3100/api/news?__scenario=slow'
curl -H 'X-Mock-Scenario: empty' http://127.0.0.1:3100/api/home
```

自动化测试：`pnpm test:mock`。
