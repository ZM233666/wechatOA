# 财务指导手册 PDF

MinIO 对象路径（与后台一致）：

| 分区 | 对象键示例 |
| --- | --- |
| 使用手册 | `wechat-official-account/finance-handbook/user_manual/xxx.pdf` |
| 注意事项 | `wechat-official-account/finance-handbook/precautions/xxx.pdf` |

环境变量：

- `MINIO_BUCKET=wechat-official-account`
- `MINIO_FINANCIAL_HANDBOOK_PREFIX=finance-handbook/`
- `MINIO_FINANCIAL_HANDBOOK_USER_MANUAL_SUBDIR=user_manual`
- `MINIO_FINANCIAL_HANDBOOK_PRECAUTIONS_SUBDIR=precautions`

Mock 同步后对外 URL：

```text
/mock-assets/kb-life/finance-handbook/files/user_manual/xxx.pdf
/mock-assets/kb-life/finance-handbook/files/precautions/xxx.pdf
```

**本地兜底**：在本目录下建立同名子文件夹 `user_manual/`、`precautions/` 放置 PDF。

**迁移说明**：若 MinIO 里仍是旧的平铺 `finance-handbook/*.pdf`（未分子目录），Mock 会临时按文件名关键词分配，且优先把一份绑定「使用手册」、另一份绑定「注意事项」。正式环境请尽快改为上述子目录结构。

`financial-handbook.json` 中 `pdfFile` 可写 `xxx.pdf`（自动补子目录）或完整相对路径如 `user_manual/xxx.pdf`。
