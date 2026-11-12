from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminAuditLogListView,
    AdminCardViewSet,
    AdminCourseViewSet,
    AdminModuleViewSet,
    AdminOverviewAPIView,
    AdminRoleViewSet,
    AdminShadowingVideoViewSet,
    AdminUserViewSet,
    PublicSystemConfigView,
)

app_name = "users"

admin_router = DefaultRouter()
admin_router.register(r"users", AdminUserViewSet, basename="admin-user")
admin_router.register(r"roles", AdminRoleViewSet, basename="admin-role")
admin_router.register(r"modules", AdminModuleViewSet, basename="admin-module")
admin_router.register(r"courses", AdminCourseViewSet, basename="admin-course")
admin_router.register(r"cards", AdminCardViewSet, basename="admin-card")
admin_router.register(
    r"shadowing-videos",
    AdminShadowingVideoViewSet,
    basename="admin-shadowing-video",
)

urlpatterns = [
    path(
        "system/public-config/",
        PublicSystemConfigView.as_view(),
        name="public-config",
    ),
    path("admin/overview/", AdminOverviewAPIView.as_view(), name="admin-overview"),
    path("admin/audit-logs/", AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("admin/", include(admin_router.urls)),
]
