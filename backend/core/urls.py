from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("", lambda _req: JsonResponse({"status": "ok"})),
    path("admin/", admin.site.urls),
    path("api/", include("cards.urls", namespace="cards")),
    path("api/shadowing/", include("shadowing.urls", namespace="shadowing")),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    re_path(r"^static/(?P<path>.*)$", serve, {"document_root": settings.STATIC_ROOT}),
]

