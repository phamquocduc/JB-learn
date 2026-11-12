from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import AdminAuditLog, AppModuleConfig, Role
from .rbac import (
    ACCEPTED_PERMISSION_INPUT_SET,
    ALL_PERMISSION_CODES,
    MODULE_CATALOG_BY_KEY,
    ROLE_SCOPED_KEY_SET,
    ROLE_SCOPED_KEYS,
    get_default_role_record,
    get_role_visible_modules,
    normalize_permission_codes,
    sync_role_visible_modules,
)

User = get_user_model()
_UNSET = object()


class RoleAdminSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(max_length=50, required=False, allow_blank=True)
    user_count = serializers.SerializerMethodField()
    visible_modules = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Role
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "permissions",
            "visible_modules",
            "is_system",
            "user_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "user_count", "created_at", "updated_at"]

    def get_user_count(self, obj: Role) -> int:
        if hasattr(obj, "user_count"):
            return obj.user_count
        return obj.users.count()

    def to_representation(self, instance: Role) -> dict:
        data = super().to_representation(instance)
        data["visible_modules"] = get_role_visible_modules(
            instance.slug,
            self.context.get("modules_state_map"),
        )
        return data

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(_("Tên vai trò không được để trống."))
        return cleaned

    def validate_permissions(self, value) -> list[str]:
        if not isinstance(value, list):
            raise serializers.ValidationError(_("Danh sách quyền phải là một mảng."))
        invalid = [
            str(c) for c in value if str(c).strip() not in ACCEPTED_PERMISSION_INPUT_SET
        ]
        if invalid:
            raise serializers.ValidationError(
                _("Mã quyền không hợp lệ: %(codes)s") % {"codes": ", ".join(invalid)}
            )
        return normalize_permission_codes(value)

    def validate_visible_modules(self, value) -> list[str]:
        if not isinstance(value, list):
            raise serializers.ValidationError(_("Danh sách phân hệ phải là một mảng."))
        invalid = [str(k) for k in value if str(k) not in ROLE_SCOPED_KEY_SET]
        if invalid:
            raise serializers.ValidationError(
                _("Mã phân hệ không hợp lệ: %(keys)s") % {"keys": ", ".join(invalid)}
            )
        incoming = {str(k).strip() for k in value if k}
        return [k for k in ROLE_SCOPED_KEYS if k in incoming]

    def validate(self, attrs: dict) -> dict:
        instance: Role | None = self.instance
        raw_slug = (attrs.get("slug") or "").strip().lower()

        if instance is not None:
            if instance.is_system and raw_slug and raw_slug != instance.slug:
                raise serializers.ValidationError(
                    {"slug": _("Không thể thay đổi mã của vai trò mặc định hệ thống.")}
                )
            if not raw_slug:
                attrs.pop("slug", None)
            else:
                if Role.objects.exclude(pk=instance.pk).filter(slug=raw_slug).exists():
                    raise serializers.ValidationError(
                        {"slug": _("Mã vai trò này đã tồn tại.")}
                    )
                attrs["slug"] = raw_slug
            if instance.slug == "admin":
                attrs["permissions"] = list(ALL_PERMISSION_CODES)
                attrs["visible_modules"] = list(ROLE_SCOPED_KEYS)
        else:
            if not raw_slug:
                base_slug = slugify(attrs.get("name", "")) or "role"
                candidate = base_slug[:45]
                idx = 2
                while Role.objects.filter(slug=candidate).exists():
                    candidate = f"{base_slug[:40]}-{idx}"
                    idx += 1
                raw_slug = candidate
            elif Role.objects.filter(slug=raw_slug).exists():
                raise serializers.ValidationError(
                    {"slug": _("Mã vai trò này đã tồn tại.")}
                )
            attrs["slug"] = raw_slug

        return attrs

    def create(self, validated_data: dict) -> Role:
        visible_modules = validated_data.pop("visible_modules", _UNSET)
        role = super().create(validated_data)
        if visible_modules is not _UNSET:
            sync_role_visible_modules(
                role.slug,
                visible_modules,
                updated_by=self.context.get("actor"),
            )
        return role

    def update(self, instance: Role, validated_data: dict) -> Role:
        visible_modules = validated_data.pop("visible_modules", _UNSET)
        role = super().update(instance, validated_data)
        if visible_modules is not _UNSET:
            sync_role_visible_modules(
                role.slug,
                visible_modules,
                updated_by=self.context.get("actor"),
            )
        return role


class AdminUserSerializer(serializers.ModelSerializer):
    role_slug = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    courses_count = serializers.SerializerMethodField()
    cards_count = serializers.SerializerMethodField()
    videos_count = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "role",
            "role_slug",
            "role_name",
            "permissions",
            "courses_count",
            "cards_count",
            "videos_count",
            "reviews_count",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields

    def get_role_slug(self, obj: User) -> str:
        return obj.get_effective_role_slug()

    def get_role_name(self, obj: User) -> str:
        return obj.get_effective_role_name()

    def get_permissions(self, obj: User) -> list[str]:
        return obj.get_permission_codes()

    def _stat(self, obj: User, key: str) -> int:
        stats_map = self.context.get(key) or {}
        return int(stats_map.get(obj.id, 0))

    def get_courses_count(self, obj: User) -> int:
        return self._stat(obj, "courses_map")

    def get_cards_count(self, obj: User) -> int:
        return self._stat(obj, "cards_map")

    def get_videos_count(self, obj: User) -> int:
        return self._stat(obj, "videos_map")

    def get_reviews_count(self, obj: User) -> int:
        return self._stat(obj, "reviews_map")


class AdminUserWriteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
    )
    role_slug = serializers.SlugField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "is_active",
            "role_slug",
        ]

    def validate_username(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(_("Tên người dùng không được để trống."))
        qs = User.objects.filter(username__iexact=cleaned)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(_("Tên người dùng này đã tồn tại."))
        return cleaned

    def validate_email(self, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise serializers.ValidationError(_("Email không được để trống."))
        qs = User.objects.filter(email__iexact=cleaned)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(_("Email này đã được sử dụng."))
        return cleaned

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError(_("Mật khẩu phải chứa ít nhất 8 ký tự."))
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_role_slug(self, value: str) -> Role:
        slug = value.strip().lower()
        if slug in ("admin", "moderator", "learner"):
            return get_default_role_record(slug)
        role = Role.objects.filter(slug=slug).first()
        if not role:
            raise serializers.ValidationError(_("Vai trò được chọn không tồn tại."))
        return role

    def validate(self, attrs: dict) -> dict:
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": _("Vui lòng nhập mật khẩu cho tài khoản mới.")}
            )
        return attrs

    def create(self, validated_data: dict) -> User:
        role = validated_data.pop("role_slug", None) or get_default_role_record("learner")
        password = validated_data.pop("password")
        is_active = validated_data.pop("is_active", True)
        user = User(**validated_data)
        user.role = role
        user.is_active = is_active
        user.is_staff = role.slug == "admin"
        user.set_password(password)
        user.save()
        return user

    def update(self, instance: User, validated_data: dict) -> User:
        role = validated_data.pop("role_slug", None)
        password = validated_data.pop("password", None)

        for field, val in validated_data.items():
            setattr(instance, field, val)

        if role is not None:
            instance.role = role
            instance.is_staff = role.slug == "admin"

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class AdminResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError(_("Mật khẩu phải chứa ít nhất 8 ký tự."))
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class AppModuleConfigSerializer(serializers.ModelSerializer):
    raw_enabled = serializers.BooleanField(source="is_enabled", read_only=True)
    effective_enabled = serializers.SerializerMethodField()
    role_scoped = serializers.SerializerMethodField()
    raw_allowed_roles = serializers.SerializerMethodField()
    allowed_roles = serializers.SerializerMethodField()
    updated_by_username = serializers.SerializerMethodField()

    class Meta:
        model = AppModuleConfig
        fields = [
            "key",
            "name",
            "group",
            "parent_key",
            "role_scoped",
            "description",
            "display_order",
            "is_enabled",
            "raw_enabled",
            "effective_enabled",
            "raw_allowed_roles",
            "allowed_roles",
            "maintenance_note",
            "updated_by",
            "updated_by_username",
            "updated_at",
        ]
        read_only_fields = [
            "key",
            "name",
            "group",
            "parent_key",
            "role_scoped",
            "description",
            "display_order",
            "raw_enabled",
            "effective_enabled",
            "raw_allowed_roles",
            "allowed_roles",
            "updated_by",
            "updated_by_username",
            "updated_at",
        ]

    def get_effective_enabled(self, obj: AppModuleConfig) -> bool:
        state_map = self.context.get("modules_state_map") or {}
        if obj.key in state_map:
            return bool(state_map[obj.key].get("is_enabled", obj.is_enabled))
        return bool(obj.is_enabled)

    def get_role_scoped(self, obj: AppModuleConfig) -> bool:
        state_map = self.context.get("modules_state_map") or {}
        if obj.key in state_map:
            return bool(state_map[obj.key].get("role_scoped", False))
        return bool(MODULE_CATALOG_BY_KEY.get(obj.key, {}).get("role_scoped", False))

    def get_raw_allowed_roles(self, obj: AppModuleConfig):
        state_map = self.context.get("modules_state_map") or {}
        if obj.key in state_map:
            return state_map[obj.key].get("raw_allowed_roles")
        return obj.allowed_roles

    def get_allowed_roles(self, obj: AppModuleConfig):
        state_map = self.context.get("modules_state_map") or {}
        if obj.key in state_map:
            return state_map[obj.key].get("allowed_roles")
        return obj.allowed_roles

    def get_updated_by_username(self, obj: AppModuleConfig) -> str:
        return obj.updated_by.username if obj.updated_by else str(_("Hệ thống"))


class AdminAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAuditLog
        fields = [
            "id",
            "actor",
            "actor_username",
            "action",
            "target_type",
            "target_id",
            "target_repr",
            "details",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields
