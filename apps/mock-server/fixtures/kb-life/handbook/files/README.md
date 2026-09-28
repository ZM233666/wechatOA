# 员工手册 PDF

- 将 PDF 放在此目录，或上传到 MinIO：`wechat-official-account/employee-handbook/`（见 `MINIO_EMPLOYEE_HANDBOOK_PREFIX`）。
- Mock Server 会优先使用 MinIO 缓存，其次使用本目录文件；未指定 `pdfFile` 时取最新 PDF。
