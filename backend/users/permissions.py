from __future__ import annotations

from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission


def user_has_perm_code(user, code: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    has_perm_fn = getattr(user, "has_perm_code", None)
    if callable(has_perm_fn):
        return bool(has_perm_fn(code))
    return bool(getattr(user, "is_superuser", False))


def can_user_edit_object(user, obj, prefix: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if user_has_perm_code(user, f"{prefix}.edit"):
        return True
    created_by_id = getattr(obj, "created_by_id", None)
    return bool(
        created_by_id is not None
        and created_by_id == getattr(user, "id", None)
        and user_has_perm_code(user, f"{prefix}.edit_own")
    )


def can_user_delete_object(user, obj, prefix: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if user_has_perm_code(user, f"{prefix}.delete"):
        return True
    created_by_id = getattr(obj, "created_by_id", None)
    return bool(
        created_by_id is not None
        and created_by_id == getattr(user, "id", None)
        and user_has_perm_code(user, f"{prefix}.delete_own")
    )


class ModuleObjectPermission(BasePermission):
    """
    Shared granular Module -> Actions permission check across Courses, Cards & Shadowing:
    - Read: public items, owner items, or `view_all` / `edit` / `delete`.
    - Create (`POST`): `create` or `create_own`.
    - Update (`PUT`/`PATCH`): `edit`, or owner holding `edit_own`.
    - Delete (`DELETE`): `delete`, or owner holding `delete_own`.
    """

    default_prefix = "cards"

    def _prefix(self, view) -> str:
        return getattr(view, "permission_module_prefix", self.default_prefix)

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        prefix = self._prefix(view)
        if request.method == "POST":
            return user_has_perm_code(user, f"{prefix}.create") or user_has_perm_code(
                user, f"{prefix}.create_own"
            )
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        prefix = self._prefix(view)

        if request.method in SAFE_METHODS:
            if getattr(obj, "is_public", True):
                return True
            if any(
                user_has_perm_code(user, f"{prefix}.{act}")
                for act in ("view_all", "edit", "delete")
            ):
                return True
            return bool(
                user
                and user.is_authenticated
                and getattr(obj, "created_by", None) == user
            )

        if request.method == "DELETE":
            return can_user_delete_object(user, obj, prefix)
        return can_user_edit_object(user, obj, prefix)


class HasAdminAccess(BasePermission):
    """Requires an active authenticated user holding the `admin.access` permission."""

    message = gettext_lazy("Bạn không có quyền truy cập khu vực quản trị.")

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and hasattr(user, "has_perm_code")
            and user.has_perm_code("admin.access")
        )


def require_any_perm(request, codes: list[str], message: str = "") -> None:
    user = getattr(request, "user", None)
    if (
        user
        and user.is_authenticated
        and user.is_active
        and hasattr(user, "has_perm_code")
        and any(user.has_perm_code(code) for code in codes)
    ):
        return
    raise PermissionDenied(
        detail=message or _("Tài khoản của bạn không có quyền thực hiện thao tác này.")
    )
