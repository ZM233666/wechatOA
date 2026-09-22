# Brand Intro 微信公开读接口（Django 实现指南）

本文档供 **Django 后端仓库** 使用。本 monorepo 已包含 Mock Server 代理与小程序页面；后端需新增下列公开只读接口后，Mock 才会拉到真实数据。

## 接口

```
GET /api/brand-intro/intro/public/current/
permission_classes = [AllowAny]
```

### 查询逻辑

- `status = 'published'`
- `is_deleted = False`
- 按 `-publish_time`、`-create_datetime` 排序
- 取第 1 条作为线上生效版本

### 成功响应（dvadmin）

```json
{
  "code": 2000,
  "msg": "success",
  "data": {
    "id": 1,
    "company_name": "Knorr-Bremse Group",
    "company_profile": "...",
    "our_vision": "...",
    "our_value_items": [
      { "id": "v1", "title": "Entrepreneurship", "content": "..." }
    ],
    "core_brands": [
      { "id": "b1", "name": "Bendix", "description": "..." }
    ],
    "cover_url": "/media/brand/cover.jpg",
    "content_html": "",
    "publish_time": "2026-01-01T08:00:00Z",
    "create_datetime": "2026-01-01T07:00:00Z"
  }
}
```

无已发布版本：`code=2000`, `data=null`（Mock 会回退 fixture）。

---

## 1. Serializer（`backend/brand_intro/serializers/public.py`）

```python
from rest_framework import serializers


class BrandIntroPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    company_name = serializers.CharField()
    company_profile = serializers.CharField()
    our_vision = serializers.CharField()
    our_value_items = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    core_brands = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    cover_url = serializers.SerializerMethodField()
    content_html = serializers.CharField(allow_blank=True, required=False)
    publish_time = serializers.DateTimeField(allow_null=True)
    create_datetime = serializers.DateTimeField()

    def get_cover_url(self, obj):
        # 若管理端 Serializer 已有 cover_url，直接复用
        if hasattr(obj, "cover_url"):
            return obj.cover_url
        cover = getattr(obj, "cover", None)
        if not cover:
            return ""
        request = self.context.get("request")
        url = getattr(cover, "url", None) or getattr(cover, "file_url", None)
        if not url:
            return ""
        if str(url).startswith(("http://", "https://")):
            return url
        if request:
            return request.build_absolute_uri(url)
        return url
```

---

## 2. ViewSet action（追加到 `backend/brand_intro/views/brand_intro.py`）

```python
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from dvadmin.utils.json_response import DetailResponse  # 按项目实际 SuccessResponse 调整

from brand_intro.serializers.public import BrandIntroPublicSerializer


class BrandIntroViewSet(...):
    # 现有管理端 CRUD 保持不变

    @action(
        detail=False,
        methods=["get"],
        url_path="public/current",
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def public_current(self, request):
        obj = (
            BrandIntro.objects.filter(status="published", is_deleted=False)
            .order_by("-publish_time", "-create_datetime")
            .first()
        )
        if not obj:
            return DetailResponse(data=None, msg="暂无已发布品牌介绍")
        serializer = BrandIntroPublicSerializer(obj, context={"request": request})
        return DetailResponse(data=serializer.data)
```

可选历史版本：

```python
@action(detail=False, methods=["get"], url_path=r"public/(?P<pk>[^/.]+)", permission_classes=[AllowAny])
def public_detail(self, request, pk=None):
    obj = BrandIntro.objects.filter(
        pk=pk, status="published", is_deleted=False
    ).first()
    if not obj:
        return DetailResponse(code=404, msg="未找到已发布版本", data=None)
    ...
```

---

## 3. 路由

管理端 ViewSet 已挂载在 `backend/brand_intro/urls.py` 时，上述 `@action` 会自动生成：

```
GET /api/brand-intro/intro/public/current/
```

确认 `backend/application/urls.py`：

```python
path("api/brand-intro/", include("brand_intro.urls")),
```

---

## 4. 与本仓库 Mock Server 联调

`apps/mock-server/.env`：

```env
BRAND_INTRO_ENABLED=true
BRAND_INTRO_API_BASE_URL=http://127.0.0.1:8000
BRAND_INTRO_MEDIA_BASE_URL=http://127.0.0.1:8000
BRAND_INTRO_PUBLIC_PATH=/api/brand-intro/intro/public/current/
BRAND_INTRO_TRY_PUBLIC=true
BRAND_INTRO_USERNAME=superadmin
BRAND_INTRO_PASSWORD=admin123456
```

**公开接口尚未上线时**：Mock 会自动回退管理端 JWT（`GET /api/brand-intro/intro/?status=published` + 详情），与新闻 `article-content` 联调方式一致。

数据流：

```
小程序 GET /api/brand
  → Mock Server brand-source.service
  → Django GET /api/brand-intro/intro/public/current/ (AllowAny)
  → 映射为 { companyName, hero, intro, vision, values, brands }
  → 小程序 Brand Intro 页
```

远程失败或无 published 数据时，Mock 回退 `fixtures/brand/overview.json`。

---

## 5. 微信小程序

- 页面：`apps/miniprogram/miniprogram/pages/brand/`
- 服务：`brand.service.ts` → `GET /api/brand`（经 Mock）
- 优先结构化字段，不使用 `content_html`
- 支持下拉刷新、404/空态/网络错误

### 合法域名（生产）

- request：`https://<API 域名>`
- downloadFile：media 或 MinIO 域名（封面）

---

## 6. 版本策略

- 管理端可保留多条历史版本
- 微信端只展示 **一条**：最新 `published` + `publish_time`
- `create_datetime` 仅后台追溯，微信端不展示
