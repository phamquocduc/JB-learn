from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .rbac import (
    ALL_PERMISSION_CODES,
    BUILTIN_ROLES_BY_SLUG,
    check_permission_code,
    get_roles_cache_map,
    invalidate_modules_cache,
    invalidate_roles_cache,
    normalize_permission_codes,
)


class Role(models.Model):
    """Dynamic role storing a curated list of permission codes."""

    slug = models.SlugField(
        max_length=50,
        unique=True,
        verbose_name="Mã vai trò",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Tên vai trò",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Mô tả",
    )
    permissions = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Danh sách mã quyền",
    )
    is_system = models.BooleanField(
        default=False,
        verbose_name="Vai trò mặc định hệ thống",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Vai trò"
        verbose_name_plural = "Danh sách vai trò"
        ordering = ["-is_system", "id"]

    def save(self, *args, **kwargs):
        if self.slug == "admin":
            self.permissions = list(ALL_PERMISSION_CODES)
            self.is_system = True
        else:
            self.permissions = normalize_permission_codes(self.permissions)
        super().save(*args, **kwargs)
        invalidate_roles_cache()

    def delete(self, *args, **kwargs):
        res = super().delete(*args, **kwargs)
        invalidate_roles_cache()
        return res

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


class User(AbstractUser):
    """Custom User model inheriting all default attributes from AbstractUser plus dynamic RBAC role."""

    class LanguageChoice(models.TextChoices):
        VI = "vi", "Tiếng Việt"
        EN = "en", "English"

    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Vai trò",
    )
    preferred_language = models.CharField(
        max_length=10,
        choices=LanguageChoice.choices,
        default=LanguageChoice.VI,
        null=True,
        blank=True,
        verbose_name="Ngôn ngữ ưu tiên",
    )

    class Meta(AbstractUser.Meta):
        verbose_name = "Người dùng"
        verbose_name_plural = "Danh sách người dùng"
        ordering = ["-date_joined", "id"]

    def _resolved_role_info(self) -> dict:
        if self.role_id:
            if "role" in self._state.fields_cache and self._state.fields_cache["role"] is not None:
                r_obj = self._state.fields_cache["role"]
                return {
                    "id": r_obj.id,
                    "slug": r_obj.slug,
                    "name": r_obj.name,
                    "permissions": normalize_permission_codes(r_obj.permissions),
                    "is_system": r_obj.is_system,
                }
            cached_role = get_roles_cache_map().get(self.role_id)
            if cached_role:
                return cached_role

        fallback_slug = "admin" if (self.is_superuser or self.is_staff) else "learner"
        fallback_def = BUILTIN_ROLES_BY_SLUG[fallback_slug]
        return {
            "id": None,
            "slug": fallback_slug,
            "name": fallback_def["name"],
            "permissions": list(fallback_def["permissions"]),
            "is_system": True,
        }

    def get_effective_role_slug(self) -> str:
        if self.is_superuser:
            return "admin"
        return self._resolved_role_info()["slug"]

    def get_effective_role_name(self) -> str:
        if self.is_superuser:
            return BUILTIN_ROLES_BY_SLUG["admin"]["name"]
        return self._resolved_role_info()["name"]

    def get_permission_codes(self) -> list[str]:
        if not self.is_active:
            return []
        info = self._resolved_role_info()
        if self.is_superuser or info["slug"] == "admin":
            return list(ALL_PERMISSION_CODES)
        return list(info["permissions"])

    def has_perm_code(self, code: str) -> bool:
        if not self.is_active:
            return False
        if self.is_superuser or self.get_effective_role_slug() == "admin":
            return True
        return check_permission_code(self.get_permission_codes(), code)

    def __str__(self) -> str:
        return self.username


class AppModuleConfig(models.Model):
    """Runtime feature/module flag controlled from the integrated Admin view."""

    key = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="Mã tính năng",
    )
    name = models.CharField(
        max_length=120,
        verbose_name="Tên tính năng",
    )
    group = models.CharField(
        max_length=32,
        default="general",
        db_index=True,
        verbose_name="Nhóm phân hệ",
    )
    parent_key = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name="Mã phân hệ cha",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Mô tả",
    )
    is_enabled = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Đang kích hoạt",
    )
    maintenance_note = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Thông báo bảo trì",
    )
    allowed_roles = models.JSONField(
        default=None,
        null=True,
        blank=True,
        verbose_name="Vai trò được phép xem",
    )
    display_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Thứ tự hiển thị",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Người cập nhật",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Thời điểm cập nhật",
    )

    class Meta:
        verbose_name = "Cấu hình tính năng"
        verbose_name_plural = "Danh sách cấu hình tính năng"
        ordering = ["display_order", "key"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        invalidate_modules_cache()

    def delete(self, *args, **kwargs):
        res = super().delete(*args, **kwargs)
        invalidate_modules_cache()
        return res

    def __str__(self) -> str:
        state = "Bật" if self.is_enabled else "Tắt"
        return f"{self.name} [{state}]"


class AdminAuditLog(models.Model):
    """Immutable audit log of administrative actions across users, roles, modules, and content."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_audit_logs",
        verbose_name="Người thực hiện",
    )
    actor_username = models.CharField(
        max_length=150,
        blank=True,
        default="",
        verbose_name="Tài khoản thực hiện",
    )
    action = models.CharField(
        max_length=64,
        db_index=True,
        verbose_name="Hành động",
    )
    target_type = models.CharField(
        max_length=32,
        db_index=True,
        verbose_name="Loại đối tượng",
    )
    target_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name="Mã đối tượng",
    )
    target_repr = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Tên đối tượng",
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Chi tiết thay đổi",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Địa chỉ IP",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Thời gian",
    )

    class Meta:
        verbose_name = "Nhật ký quản trị"
        verbose_name_plural = "Danh sách nhật ký quản trị"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["target_type", "-created_at"],
                name="audit_target_created_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"[{self.created_at}] {self.actor_username}: {self.action} ({self.target_repr})"
