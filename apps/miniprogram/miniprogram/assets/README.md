# 小程序静态资源说明

本目录存放原生微信小程序本地图片资源。**不要**热链 Demo 中的 Genspark / Unsplash 等外部图片。

## 当前资源状态

| 资源 | 路径 | 状态 | 说明 |
| --- | --- | --- | --- |
| TabBar 图标 | `icons/tabbar/tab-*.png` | 临时占位 | KB Life 已换为心形；其余仍为几何图形 |
| 快捷入口图标 | `images/Home/*.png` | 用户提供 | 新闻中心 `news.png`、品牌介绍 `companies.png`、产品介绍 `train.png`、项目案例 `briefcase.png` |
| Banner | `images/banners/banner-*.png` | 临时占位 | 品牌色渐变图，非正式活动海报 |
| 新闻缩略图 | `images/news/news-*.png` | 临时占位 | 纯色构图，需替换真实新闻封面 |
| 通用占位图 | `images/placeholders/placeholder.png` | 临时占位 | 后续通用兜底 |

## 建议尺寸

| 类型 | 建议尺寸 |
| --- | --- |
| TabBar 图标 | 81×81 px（@3x 可准备 81px） |
| 快捷入口图标 | 96×96 px，透明底 |
| Banner | 750×340～750×400 px |
| 新闻缩略图 | 约 3:2 或 4:3，如 360×270 px |
| Logo | 待定（导航栏 / 启动页） |

## 后续需要用户提供的正式素材

1. 品牌 Logo（含深色 / 浅色背景版本）
2. 首页正式 Banner（2～3 张）及对应文案确认
3. 新闻列表缩略图
5. TabBar 其余三套正式图标（Home / Services / My Profile；KB Life 已用心形占位）
6. 服务页 Digital CBM / FastPHM / KB Insights 如需插图

首页顶栏已使用 `images/brand/KB_Logo.png`，置于 Home 标题左侧。

## 使用约定

- 仅引用本仓库本地路径
- 不在 WXML / WXSS 中内嵌超大 Base64
- 替换素材后保持文件名或同步更新 `mock/home.ts` 与 `app.json` 中的路径
