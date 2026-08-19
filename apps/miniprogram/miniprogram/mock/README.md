# 本地 Mock 数据（迁移参考 / 紧急 fallback）

本目录中的 TypeScript fixture **不再作为页面主数据源**。

- 主数据源：`wx.request` → Mock API Server（`apps/mock-server`，默认 `http://127.0.0.1:3100`）
- 页面与组件禁止直接 `import` 本目录作为线上/开发主路径
- 保留这些文件是为了对照旧字段、紧急 fallback 与迁移核对

对应关系：

| 本地文件 | Mock API |
| --- | --- |
| `home.ts` / `news.ts` | `GET /api/home` `GET /api/news` |
| `brand.ts` | `GET /api/brand` |
| `products.ts` | `GET /api/products` |
| `cases.ts` | `GET /api/cases` |
| `services.ts` | `GET /api/services` |
| `kb-life.ts` / `canteen.ts` / `shuttle-bus.ts` | `GET /api/kb-life/*` |
| `profile.ts` | `GET /api/profile` |

KB Life 子页（手册、假期、岗位、关怀、活动详情等）仍可能暂时读取本目录；后续可按同一契约补接口。
