# 前端 Demo 分析（第一阶段）

## 1. Demo 类型

参考地址：`http://117.62.232.51:18888/`

- 类型：React + Tailwind CSS 移动端网页原型（标题：RVS China WeChat）
- 目标：转换为**原生微信小程序**（TypeScript + WXML + WXSS + JSON）
- 只借鉴信息架构、布局、配色、视觉层级与交互意图
- **不**复制 React / JSX / Tailwind / DOM API / 浏览器路由

## 2. 一级信息架构

| Tab | 中文 | 英文 | 小程序路径 |
| --- | --- | --- | --- |
| Home | 首页 | Home | `pages/index/index` |
| Services | 服务 | Services | `pages/services/index` |
| KB Life | KB生活 | KB Life | `pages/kb-life/index` |
| Profile | 我的 | Profile | `pages/profile/index` |

本阶段使用微信**原生 TabBar**（非自定义 TabBar），原因：

- 四个一级页均为 `switchTab` 场景，原生 TabBar 稳定可靠
- 避免与原生导航栏、安全区、页面栈冲突
- 降低第一阶段复杂度，便于微信开发者工具直接预览

## 3. 首页结构（第一版）

```text
首页
├── 顶部标题区域（原生导航栏 + 页内双语标题可选）
├── Banner 轮播（swiper，2～3 条 Mock）
├── 四个快捷入口
└── 最新资讯（3 条 Mock + 「更多」）
```

四个快捷入口：

1. 新闻中心 / News Center
2. 品牌介绍 / Brand Introduction
3. 产品介绍 / Product Introduction
4. 项目案例 / Project Cases

Demo 中可见 Banner 文案示例：

- 「2024 年德国柏林国际轨道交通技术展览会 (InnoTrans）…」
- 「了解最新轨道交通解决方案与创新技术」
- 「智能互联：重塑轨道交通未来」

## 4. 视觉规范

### 颜色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--kb-brand` | `#00467f` | 品牌主色 |
| `--kb-navy` | `#033e70` | 品牌深色 / Tab 选中近似 `#003B70` |
| `--kb-gold` | `#d4a84b` | 金色高光 |
| `--kb-gold-light` | `#e8c56a` | 浅金 |
| `--kb-gold-dark` | `#b8892e` | 深金 |
| `--kb-bg` | `#F5F7FA` | 页面背景 |
| `--kb-card` | `#FFFFFF` | 卡片背景 |
| `--kb-text` | `#1F2937` | 主要文字 |
| `--kb-text-secondary` | `#6B7280` | 次要文字 |
| `--kb-text-muted` | `#9CA3AF` | 辅助文字 |
| `--kb-divider` | `#EEF0F3` | 分割线 |
| `--kb-danger` | `#DC2626` | 警告 |
| `--kb-success` | `#16A34A` | 成功 |

Demo CSS/JS 中高频色还包括 `#003B70`、`#cda96a`，本阶段映射到 navy / gold 系列。

### 视觉特点

- 企业级简洁风格
- 深蓝 + 金色品牌配色
- 中英文双语标题
- 白色圆角卡片 + 轻量阴影
- 清晰信息层级，点击区域适合移动端
- 避免过度动画

### 导航栏策略

**保留微信原生导航栏**，不额外实现自定义沉浸式导航栏。

原因：

1. 四个 Tab 页标题明确，原生导航栏足够
2. 避免与状态栏、胶囊按钮、安全区冲突
3. 页内使用 `section-title` / 轻量标题组件补充中英双语层级

## 5. 尺寸建议（rpx）

| 项 | 值 |
| --- | --- |
| 页面横向间距 | `32rpx` |
| 卡片圆角 | `20rpx`～`24rpx` |
| 小组件圆角 | `12rpx`～`16rpx` |
| 卡片内边距 | `24rpx`～`32rpx` |
| 主要标题 | `32rpx` |
| 普通标题 | `28rpx` |
| 正文 | `26rpx` |
| 辅助文字 | `22rpx` |
| 英文小标题 | `20rpx`～`22rpx` |

底部使用 `env(safe-area-inset-bottom)`，不写死机型高度。

## 6. 后续候选页面（本阶段不创建）

根据 Demo 可识别的功能：

- 新闻列表 / 新闻详情
- 品牌介绍
- 产品列表 / 产品详情
- 项目案例列表 / 案例详情
- Digital CBM（含访客介绍、资产等）
- FastPHM（预测健康管理）
- KB Insights
- WeTalk
- 员工服务
- 园区地图 / 班车 / 食堂 / 假期日历
- 个人资料 / 通知 / 收藏 / 待办
- 登录与权限

## 7. 健康检查迁移说明

原首页「检查后端服务」为框架联调能力。

本阶段处理：

- 正式首页 UI **不**突出展示健康检查
- 相关逻辑保留在首页 TypeScript 中，仅在 `develop` 环境通过折叠调试区或 `status-feedback` 组件展示
- 正式业务预览不受影响
