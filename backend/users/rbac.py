from __future__ import annotations

import re
from typing import Any, Optional

from django.core.cache import cache
from django.utils.translation import gettext as _
from django.utils.translation import gettext_noop
from rest_framework.exceptions import PermissionDenied

ROLES_CACHE_KEY = "jb_rbac_roles_map_v2"
MODULES_CACHE_KEY = "jb_app_modules_state_v2"
APPEARANCE_CACHE_KEY = "jb_system_appearance_v1"
DEFAULT_PRIMARY_COLOR = "#0369A1"
HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
CACHE_TTL_SECONDS = 300

# 1. Granular Module -> Actions Catalog (Single Source of Truth)
PERMISSION_GROUPS: list[dict[str, Any]] = [
    {
        "key": "courses",
        "label": "Khoá học",
        "visibility_keys": ["courses"],
    },
    {
        "key": "cards",
        "label": "Học thẻ",
        "visibility_keys": ["study.cards"],
    },
    {
        "key": "personal_cards",
        "label": "Bộ thẻ của tôi",
        "visibility_keys": ["study.personal_cards"],
    },
    {
        "key": "shadowing",
        "label": "Luyện Shadowing",
        "visibility_keys": [
            "shadowing",
            "shadowing.pronunciation",
            "shadowing.listening",
            "shadowing.exercise",
            "shadowing.extraction",
        ],
    },
    {"key": "users", "label": "Tài khoản", "visibility_keys": []},
    {"key": "roles", "label": "Vai trò", "visibility_keys": []},
    {"key": "modules", "label": "Tính năng", "visibility_keys": []},
    {"key": "system", "label": "Hệ thống & Nhật ký", "visibility_keys": []},
]

PERMISSION_CATALOG: list[dict[str, str]] = [
    # Module: Khoá học
    {"code": "courses.view", "group": "courses", "label": "Xem khoá học"},
    {"code": "courses.create_own", "group": "courses", "label": "Thêm khoá học cá nhân"},
    {"code": "courses.edit_own", "group": "courses", "label": "Sửa khoá học cá nhân"},
    {"code": "courses.delete_own", "group": "courses", "label": "Xóa khoá học cá nhân"},
    {"code": "courses.view_all", "group": "courses", "label": "Xem khoá học quản trị"},
    {"code": "courses.create", "group": "courses", "label": "Thêm khoá học hệ thống"},
    {"code": "courses.edit", "group": "courses", "label": "Sửa mọi khoá học"},
    {"code": "courses.delete", "group": "courses", "label": "Xóa mọi khoá học"},
    # Module: Học thẻ
    {"code": "cards.view", "group": "cards", "label": "Xem & học thẻ"},
    {"code": "cards.view_all", "group": "cards", "label": "Xem thẻ quản trị"},
    {"code": "cards.create", "group": "cards", "label": "Thêm thẻ hệ thống"},
    {"code": "cards.edit", "group": "cards", "label": "Sửa mọi thẻ học"},
    {"code": "cards.delete", "group": "cards", "label": "Xóa mọi thẻ học"},
    # Module: Bộ thẻ của tôi
    {"code": "personal_cards.view", "group": "personal_cards", "label": "Xem bộ thẻ của tôi"},
    {"code": "cards.create_own", "group": "personal_cards", "label": "Thêm thẻ cá nhân"},
    {"code": "cards.edit_own", "group": "personal_cards", "label": "Sửa thẻ cá nhân"},
    {"code": "cards.delete_own", "group": "personal_cards", "label": "Xóa thẻ cá nhân"},
    # Module: Luyện Shadowing
    {"code": "shadowing.view", "group": "shadowing", "label": "Xem & luyện Shadowing"},
    {"code": "shadowing.create_own", "group": "shadowing", "label": "Thêm bài cá nhân"},
    {"code": "shadowing.edit_own", "group": "shadowing", "label": "Sửa bài cá nhân"},
    {"code": "shadowing.delete_own", "group": "shadowing", "label": "Xóa bài cá nhân"},
    {"code": "shadowing.view_all", "group": "shadowing", "label": "Xem bài Shadowing quản trị"},
    {"code": "shadowing.create", "group": "shadowing", "label": "Thêm bài hệ thống"},
    {"code": "shadowing.edit", "group": "shadowing", "label": "Sửa mọi bài & phụ đề"},
    {"code": "shadowing.delete", "group": "shadowing", "label": "Xóa mọi bài Shadowing"},
    # Module: users
    {"code": "users.view", "group": "users", "label": "Xem danh sách"},
    {"code": "users.create", "group": "users", "label": "Tạo tài khoản"},
    {"code": "users.edit", "group": "users", "label": "Sửa & Gán vai trò"},
    {"code": "users.lock", "group": "users", "label": "Khóa / Mở khóa"},
    {"code": "users.reset_password", "group": "users", "label": "Đặt lại mật khẩu"},
    {"code": "users.delete", "group": "users", "label": "Xóa tài khoản"},
    # Module: roles
    {"code": "roles.view", "group": "roles", "label": "Xem vai trò"},
    {"code": "roles.create", "group": "roles", "label": "Tạo vai trò"},
    {"code": "roles.edit", "group": "roles", "label": "Sửa phân quyền"},
    {"code": "roles.delete", "group": "roles", "label": "Xóa vai trò"},
    # Module: modules
    {"code": "modules.view", "group": "modules", "label": "Xem tính năng"},
    {"code": "modules.toggle", "group": "modules", "label": "Bật / Tắt & Bảo trì"},
    {"code": "modules.assign_roles", "group": "modules", "label": "Phân quyền vai trò & thao tác"},
    # Module: system
    {"code": "admin.access", "group": "system", "label": "Truy cập quản trị"},
    {"code": "system.status.view", "group": "system", "label": "Xem tổng quan"},
    {"code": "system.audit.view", "group": "system", "label": "Xem nhật ký"},
    {"code": "system.theme.manage", "group": "system", "label": "Tuỳ chỉnh giao diện"},
]

LEGACY_PERMISSION_EXPANSION: dict[str, list[str]] = {
    "courses.manage": [
        "courses.view",
        "courses.create_own",
        "courses.edit_own",
        "courses.delete_own",
        "courses.view_all",
        "courses.create",
        "courses.edit",
        "courses.delete",
    ],
    "cards.manage": [
        "cards.view",
        "cards.view_all",
        "cards.create",
        "cards.edit",
        "cards.delete",
        "personal_cards.view",
        "cards.create_own",
        "cards.edit_own",
        "cards.delete_own",
    ],
    "shadowing.manage": [
        "shadowing.view",
        "shadowing.create_own",
        "shadowing.edit_own",
        "shadowing.delete_own",
        "shadowing.view_all",
        "shadowing.create",
        "shadowing.edit",
        "shadowing.delete",
    ],
    "users.manage": [
        "users.view",
        "users.create",
        "users.edit",
        "users.lock",
        "users.reset_password",
        "users.delete",
    ],
    "roles.manage": [
        "roles.view",
        "roles.create",
        "roles.edit",
        "roles.delete",
    ],
    "system.modules.manage": [
        "modules.view",
        "modules.toggle",
        "modules.assign_roles",
    ],
    "personal_content.create": [
        "courses.view",
        "courses.create_own",
        "courses.edit_own",
        "courses.delete_own",
        "cards.view",
        "personal_cards.view",
        "cards.create_own",
        "cards.edit_own",
        "cards.delete_own",
        "shadowing.view",
        "shadowing.create_own",
        "shadowing.edit_own",
        "shadowing.delete_own",
    ],
}

ALL_PERMISSION_CODES: list[str] = [item["code"] for item in PERMISSION_CATALOG]
PERMISSION_CODE_SET: set[str] = set(ALL_PERMISSION_CODES)
ACCEPTED_PERMISSION_INPUT_SET: set[str] = PERMISSION_CODE_SET | set(
    LEGACY_PERMISSION_EXPANSION.keys()
)

# 2. Built-in Default Roles
MODERATOR_DEFAULT_PERMISSIONS: list[str] = [
    "admin.access",
    "system.status.view",
    "courses.view",
    "courses.create_own",
    "courses.edit_own",
    "courses.delete_own",
    "courses.view_all",
    "courses.create",
    "courses.edit",
    "courses.delete",
    "cards.view",
    "cards.view_all",
    "cards.create",
    "cards.edit",
    "cards.delete",
    "personal_cards.view",
    "cards.create_own",
    "cards.edit_own",
    "cards.delete_own",
    "shadowing.view",
    "shadowing.create_own",
    "shadowing.edit_own",
    "shadowing.delete_own",
    "shadowing.view_all",
    "shadowing.create",
    "shadowing.edit",
    "shadowing.delete",
]

LEARNER_DEFAULT_PERMISSIONS: list[str] = [
    "courses.view",
    "courses.create_own",
    "courses.edit_own",
    "courses.delete_own",
    "cards.view",
    "personal_cards.view",
    "cards.create_own",
    "cards.edit_own",
    "cards.delete_own",
    "shadowing.view",
    "shadowing.create_own",
    "shadowing.edit_own",
    "shadowing.delete_own",
]

BUILTIN_ROLES: list[dict[str, Any]] = [
    {
        "slug": "admin",
        "name": "Quản trị viên",
        "description": "",
        "permissions": list(ALL_PERMISSION_CODES),
        "is_system": True,
    },
    {
        "slug": "moderator",
        "name": "Biên tập viên",
        "description": "",
        "permissions": list(MODERATOR_DEFAULT_PERMISSIONS),
        "is_system": True,
    },
    {
        "slug": "learner",
        "name": "Học viên",
        "description": "",
        "permissions": list(LEARNER_DEFAULT_PERMISSIONS),
        "is_system": True,
    },
]

BUILTIN_ROLES_BY_SLUG: dict[str, dict[str, Any]] = {
    r["slug"]: r for r in BUILTIN_ROLES
}

# 3. Module Toggle Groups & Catalog
MODULE_GROUPS: list[dict[str, str]] = [
    {"key": "access", "label": "Truy cập & Tài khoản"},
    {"key": "cards", "label": "Khoá học & Học thẻ"},
    {"key": "shadowing", "label": "Luyện Shadowing"},
]

MODULE_CATALOG: list[dict[str, Any]] = [
    {
        "key": "auth.registration",
        "name": gettext_noop("Đăng ký tài khoản mới"),
        "group": "access",
        "parent_key": "",
        "role_scoped": False,
        "display_order": 10,
        "description": "",
    },
    {
        "key": "auth.guest_mode",
        "name": gettext_noop("Học không cần đăng nhập"),
        "group": "access",
        "parent_key": "",
        "role_scoped": False,
        "display_order": 20,
        "description": "",
    },
    {
        "key": "courses",
        "name": gettext_noop("Khoá học"),
        "group": "cards",
        "parent_key": "",
        "role_scoped": True,
        "display_order": 30,
        "short_label": "Khoá học",
        "description": "",
    },
    {
        "key": "study.cards",
        "name": gettext_noop("Học thẻ"),
        "group": "cards",
        "parent_key": "",
        "role_scoped": True,
        "display_order": 40,
        "short_label": "Học thẻ",
        "description": "",
    },
    {
        "key": "study.personal_cards",
        "name": gettext_noop("Bộ thẻ của tôi"),
        "group": "cards",
        "parent_key": "",
        "role_scoped": True,
        "display_order": 50,
        "short_label": "Bộ thẻ của tôi",
        "description": "",
    },
    {
        "key": "shadowing",
        "name": gettext_noop("Luyện Shadowing"),
        "group": "shadowing",
        "parent_key": "",
        "role_scoped": True,
        "display_order": 60,
        "short_label": "Luyện Shadowing",
        "description": "",
    },
    {
        "key": "shadowing.pronunciation",
        "name": gettext_noop("Chế độ Phát âm"),
        "group": "shadowing",
        "parent_key": "shadowing",
        "role_scoped": True,
        "display_order": 70,
        "short_label": "Chế độ Phát âm",
        "description": "",
    },
    {
        "key": "shadowing.listening",
        "name": gettext_noop("Chế độ Luyện nghe"),
        "group": "shadowing",
        "parent_key": "shadowing",
        "role_scoped": True,
        "display_order": 80,
        "short_label": "Chế độ Luyện nghe",
        "description": "",
    },
    {
        "key": "shadowing.exercise",
        "name": gettext_noop("Chế độ Bài tập"),
        "group": "shadowing",
        "parent_key": "shadowing",
        "role_scoped": True,
        "display_order": 90,
        "short_label": "Chế độ Bài tập",
        "description": "",
    },
    {
        "key": "shadowing.extraction",
        "name": gettext_noop("Thêm bài & Trích xuất phụ đề"),
        "group": "shadowing",
        "parent_key": "shadowing",
        "role_scoped": True,
        "display_order": 100,
        "short_label": "Thêm bài & Trích xuất phụ đề",
        "description": "",
    },
]

MODULE_VIEW_PERM_BY_KEY: dict[str, str] = {
    "courses": "courses.view",
    "study.cards": "cards.view",
    "study.personal_cards": "personal_cards.view",
    "shadowing": "shadowing.view",
}

MODULE_ACTION_GROUP_BY_KEY: dict[str, str] = {
    "courses": "courses",
    "study.cards": "cards",
    "study.personal_cards": "personal_cards",
    "shadowing": "shadowing",
}

MODULE_ACTION_CATALOG_BY_KEY: dict[str, list[dict[str, str]]] = {
    mod_key: [
        {"code": item["code"], "label": item["label"]}
        for item in PERMISSION_CATALOG
        if item["group"] == group_key
    ]
    for mod_key, group_key in MODULE_ACTION_GROUP_BY_KEY.items()
}

MODULE_ACTION_CODE_SET_BY_KEY: dict[str, set[str]] = {
    mod_key: {item["code"] for item in items}
    for mod_key, items in MODULE_ACTION_CATALOG_BY_KEY.items()
}

MODULE_CATALOG_BY_KEY: dict[str, dict[str, Any]] = {
    m["key"]: m for m in MODULE_CATALOG
}
ROLE_SCOPED_MODULES: list[dict[str, Any]] = [
    m for m in MODULE_CATALOG if m.get("role_scoped")
]
ROLE_SCOPED_KEYS: list[str] = [m["key"] for m in ROLE_SCOPED_MODULES]
ROLE_SCOPED_KEY_SET: set[str] = set(ROLE_SCOPED_KEYS)


def normalize_permission_codes(raw_codes: Any) -> list[str]:
    if not isinstance(raw_codes, (list, tuple, set)):
        return []
    expanded: set[str] = set()
    for raw in raw_codes:
        if not raw:
            continue
        code = str(raw).strip()
        if code in LEGACY_PERMISSION_EXPANSION:
            expanded.update(LEGACY_PERMISSION_EXPANSION[code])
        elif code in PERMISSION_CODE_SET:
            expanded.add(code)
    return [code for code in ALL_PERMISSION_CODES if code in expanded]


def check_permission_code(held_codes: list[str] | set[str], code: str) -> bool:
    held_set = set(held_codes)
    if code in held_set:
        return True
    if code in LEGACY_PERMISSION_EXPANSION:
        # Legacy umbrella check succeeds if user holds any core write/view action of that umbrella
        mapped = LEGACY_PERMISSION_EXPANSION[code]
        if code == "personal_content.create":
            return any(c in held_set for c in mapped)
        return all(c in held_set for c in mapped)
    return False


def invalidate_roles_cache() -> None:
    cache.delete(ROLES_CACHE_KEY)


def invalidate_modules_cache() -> None:
    cache.delete(MODULES_CACHE_KEY)


def invalidate_appearance_cache() -> None:
    cache.delete(APPEARANCE_CACHE_KEY)


def get_system_appearance() -> dict[str, Any]:
    cached = cache.get(APPEARANCE_CACHE_KEY)
    if cached is not None:
        return cached

    from .models import AppSystemConfig

    payload: dict[str, Any] = {
        "primary_color": DEFAULT_PRIMARY_COLOR,
        "default_primary_color": DEFAULT_PRIMARY_COLOR,
        "updated_at": None,
        "updated_by_username": "",
    }
    try:
        cfg = (
            AppSystemConfig.objects.select_related("updated_by")
            .filter(key="default")
            .first()
        )
        if cfg is not None:
            raw_color = str(cfg.primary_color or "").strip().upper()
            payload = {
                "primary_color": raw_color
                if HEX_COLOR_RE.match(raw_color)
                else DEFAULT_PRIMARY_COLOR,
                "default_primary_color": DEFAULT_PRIMARY_COLOR,
                "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
                "updated_by_username": (
                    cfg.updated_by.username if cfg.updated_by else ""
                ),
            }
    except Exception:
        pass

    cache.set(APPEARANCE_CACHE_KEY, payload, CACHE_TTL_SECONDS)
    return payload


def get_roles_cache_map() -> dict[int, dict[str, Any]]:
    cached = cache.get(ROLES_CACHE_KEY)
    if cached is not None:
        return cached

    from .models import Role

    by_id: dict[int, dict[str, Any]] = {}
    try:
        for role in Role.objects.all():
            by_id[role.id] = {
                "id": role.id,
                "slug": role.slug,
                "name": role.name,
                "permissions": normalize_permission_codes(role.permissions),
                "is_system": role.is_system,
            }
        cache.set(ROLES_CACHE_KEY, by_id, CACHE_TTL_SECONDS)
    except Exception:
        return {}
    return by_id


def get_default_role_record(slug: str = "learner") -> Optional[Any]:
    from .models import Role

    defaults = BUILTIN_ROLES_BY_SLUG.get(slug, BUILTIN_ROLES_BY_SLUG["learner"])
    role, _created = Role.objects.get_or_create(
        slug=slug,
        defaults={
            "name": defaults["name"],
            "description": defaults["description"],
            "permissions": list(defaults["permissions"]),
            "is_system": True,
        },
    )
    return role


def ensure_default_rbac_and_modules() -> None:
    """Idempotently ensure built-in roles and module rows exist in DB."""
    from .models import AppModuleConfig, Role

    for r_def in BUILTIN_ROLES:
        role, created = Role.objects.get_or_create(
            slug=r_def["slug"],
            defaults={
                "name": r_def["name"],
                "description": r_def["description"],
                "permissions": list(r_def["permissions"]),
                "is_system": True,
            },
        )
        if not created:
            if role.slug == "admin" and set(role.permissions) != PERMISSION_CODE_SET:
                role.permissions = list(ALL_PERMISSION_CODES)
                role.is_system = True
                role.save(update_fields=["permissions", "is_system", "updated_at"])
            else:
                normalized = normalize_permission_codes(role.permissions)
                if normalized != role.permissions:
                    role.permissions = normalized
                    role.save(update_fields=["permissions", "updated_at"])

    for m_def in MODULE_CATALOG:
        AppModuleConfig.objects.get_or_create(
            key=m_def["key"],
            defaults={
                "name": m_def["name"],
                "group": m_def["group"],
                "parent_key": m_def["parent_key"],
                "description": m_def["description"],
                "display_order": m_def["display_order"],
                "is_enabled": True,
            },
        )
    invalidate_roles_cache()
    invalidate_modules_cache()


def get_all_subject_role_slugs() -> list[str]:
    from .models import Role

    ordered: list[str] = ["guest"]
    try:
        db_slugs = list(
            Role.objects.order_by("-is_system", "id").values_list("slug", flat=True)
        )
    except Exception:
        db_slugs = ["admin", "moderator", "learner"]

    for builtin in ("admin", "moderator", "learner"):
        if builtin in db_slugs and builtin not in ordered:
            ordered.append(builtin)
    for slug in db_slugs:
        if slug not in ordered:
            ordered.append(slug)
    if "admin" not in ordered:
        ordered.insert(1, "admin")
    return ordered


def get_available_module_subjects() -> list[dict[str, Any]]:
    from django.db.models import Count

    from .models import Role

    items: list[dict[str, Any]] = [
        {
            "slug": "guest",
            "name": "Khách chưa đăng nhập",
            "is_system": True,
            "locked": False,
            "user_count": None,
        }
    ]
    roles_qs = Role.objects.annotate(user_count=Count("users")).order_by(
        "-is_system", "id"
    )
    for role in roles_qs:
        items.append(
            {
                "slug": role.slug,
                "name": role.name,
                "is_system": role.is_system,
                "locked": role.slug == "admin",
                "user_count": role.user_count,
            }
        )
    return items


def normalize_allowed_roles(
    raw_roles: Any,
    valid_slugs: Optional[list[str]] = None,
) -> Optional[list[str]]:
    if raw_roles is None:
        return None
    if not isinstance(raw_roles, (list, tuple, set)):
        return None

    universe = valid_slugs if valid_slugs is not None else get_all_subject_role_slugs()
    universe_set = set(universe)
    incoming = {str(s).strip().lower() for s in raw_roles if str(s).strip()}
    incoming.add("admin")

    cleaned = [slug for slug in universe if slug in incoming]
    if "admin" not in cleaned:
        cleaned.insert(0, "admin")

    if set(cleaned) >= universe_set:
        return None
    return cleaned


def get_modules_state_map() -> dict[str, dict[str, Any]]:
    cached = cache.get(MODULES_CACHE_KEY)
    if cached is not None:
        return cached

    from .models import AppModuleConfig

    universe = get_all_subject_role_slugs()
    raw_map: dict[str, dict[str, Any]] = {}
    for item in MODULE_CATALOG:
        raw_map[item["key"]] = {
            "key": item["key"],
            "name": item["name"],
            "group": item["group"],
            "parent_key": item["parent_key"],
            "role_scoped": bool(item.get("role_scoped", False)),
            "description": item["description"],
            "display_order": item["display_order"],
            "raw_enabled": True,
            "is_enabled": True,
            "raw_allowed_roles": None,
            "allowed_roles": None,
            "maintenance_note": "",
        }

    try:
        for row in AppModuleConfig.objects.all():
            base = raw_map.get(row.key, {})
            role_scoped = bool(base.get("role_scoped", False))
            norm_roles = (
                normalize_allowed_roles(row.allowed_roles, valid_slugs=universe)
                if role_scoped
                else None
            )
            raw_map[row.key] = {
                "key": row.key,
                "name": base.get("name") or row.name or row.key,
                "group": row.group or base.get("group", "general"),
                "parent_key": row.parent_key if row.parent_key is not None else base.get("parent_key", ""),
                "role_scoped": role_scoped,
                "description": "",
                "display_order": row.display_order or base.get("display_order", 0),
                "raw_enabled": bool(row.is_enabled),
                "is_enabled": bool(row.is_enabled),
                "raw_allowed_roles": list(norm_roles) if norm_roles is not None else None,
                "allowed_roles": list(norm_roles) if norm_roles is not None else None,
                "maintenance_note": row.maintenance_note or "",
            }
    except Exception:
        return raw_map

    for _key, info in raw_map.items():
        parent_key = info.get("parent_key") or ""
        if parent_key and parent_key in raw_map:
            parent_info = raw_map[parent_key]
            if not parent_info["raw_enabled"]:
                info["is_enabled"] = False
                if not info["maintenance_note"] and parent_info["maintenance_note"]:
                    info["maintenance_note"] = parent_info["maintenance_note"]

            if info.get("role_scoped"):
                parent_roles = parent_info.get("raw_allowed_roles")
                child_roles = info.get("raw_allowed_roles")
                if parent_roles is not None:
                    if child_roles is None:
                        info["allowed_roles"] = list(parent_roles)
                    else:
                        parent_set = set(parent_roles)
                        info["allowed_roles"] = [
                            s for s in child_roles if s in parent_set
                        ] or ["admin"]

    cache.set(MODULES_CACHE_KEY, raw_map, CACHE_TTL_SECONDS)
    return raw_map


def get_role_visible_modules(
    role_slug: str,
    state_map: Optional[dict[str, dict[str, Any]]] = None,
) -> list[str]:
    if role_slug == "admin":
        return list(ROLE_SCOPED_KEYS)
    smap = state_map if state_map is not None else get_modules_state_map()
    visible: list[str] = []
    for key in ROLE_SCOPED_KEYS:
        entry = smap.get(key)
        allowed = entry.get("allowed_roles") if entry else None
        if allowed is None or role_slug in allowed:
            visible.append(key)
    return visible


def sync_role_visible_modules(
    role_slug: str,
    selected_keys: list[str],
    updated_by: Any = None,
) -> None:
    if role_slug == "admin":
        return

    from .models import AppModuleConfig

    selected_set = {
        str(k).strip() for k in selected_keys if str(k).strip() in ROLE_SCOPED_KEY_SET
    }
    universe = get_all_subject_role_slugs()
    rows_by_key = {
        row.key: row
        for row in AppModuleConfig.objects.filter(key__in=ROLE_SCOPED_KEYS)
    }

    for key in ROLE_SCOPED_KEYS:
        mod = rows_by_key.get(key)
        if not mod:
            continue

        parent_key = MODULE_CATALOG_BY_KEY.get(key, {}).get("parent_key") or ""
        if parent_key and parent_key not in selected_set and mod.allowed_roles is None:
            continue

        should_see = key in selected_set and (
            not parent_key or parent_key in selected_set
        )
        current_raw = mod.allowed_roles

        if current_raw is None:
            if should_see:
                continue
            next_roles = normalize_allowed_roles(
                [s for s in universe if s != role_slug],
                valid_slugs=universe,
            )
        else:
            current_set = set(current_raw)
            if should_see:
                current_set.add(role_slug)
            else:
                current_set.discard(role_slug)
            next_roles = normalize_allowed_roles(
                list(current_set),
                valid_slugs=universe,
            )

        if next_roles != current_raw:
            mod.allowed_roles = next_roles
            if updated_by is not None and getattr(updated_by, "is_authenticated", False):
                mod.updated_by = updated_by
            mod.save()

    invalidate_modules_cache()


def remove_deleted_role_from_modules(role_slug: str) -> None:
    from .models import AppModuleConfig

    universe = get_all_subject_role_slugs()
    for mod in AppModuleConfig.objects.filter(allowed_roles__isnull=False):
        next_roles = normalize_allowed_roles(mod.allowed_roles, valid_slugs=universe)
        if next_roles != mod.allowed_roles:
            mod.allowed_roles = next_roles
            mod.save()
    invalidate_modules_cache()


def is_module_enabled(key: str) -> bool:
    state = get_modules_state_map().get(key)
    if state is None:
        return True
    return bool(state.get("is_enabled", True))


def get_subject_role_slug(user: Any) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return "guest"
    if not getattr(user, "is_active", False):
        return ""
    if getattr(user, "is_superuser", False):
        return "admin"
    fn = getattr(user, "get_effective_role_slug", None)
    if callable(fn):
        return str(fn() or "learner")
    return "admin" if getattr(user, "is_staff", False) else "learner"


def user_can_bypass_module_guard(user: Any) -> bool:
    if not user or not getattr(user, "is_authenticated", False) or not getattr(user, "is_active", False):
        return False
    if get_subject_role_slug(user) == "admin":
        return True
    has_perm_fn = getattr(user, "has_perm_code", None)
    if callable(has_perm_fn):
        return bool(has_perm_fn("modules.toggle"))
    return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))


def enforce_module_enabled(key: str, user: Any = None, custom_message: str = "") -> None:
    state = get_modules_state_map().get(key)
    if state is None:
        return

    role_slug = get_subject_role_slug(user)
    if role_slug == "admin":
        return

    if state.get("role_scoped", False):
        allowed_roles = state.get("allowed_roles")
        if allowed_roles is not None and role_slug not in allowed_roles:
            label = _(state.get("name") or key)
            msg = (
                _(
                    'Vui lòng đăng nhập bằng tài khoản được cấp quyền để truy cập "%(label)s".'
                )
                % {"label": label}
                if role_slug == "guest"
                else _(
                    'Vai trò hiện tại không được cấp quyền truy cập phân hệ "%(label)s".'
                )
                % {"label": label}
            )
            raise PermissionDenied(
                detail={
                    "detail": custom_message or msg,
                    "code": "module_restricted_for_role",
                    "module": key,
                }
            )

    if user_can_bypass_module_guard(user) or state.get("is_enabled", True):
        return

    note = (state.get("maintenance_note") or "").strip()
    label = _(state.get("name") or key)
    default_msg = _('Tính năng "%(label)s" hiện đang tạm ngưng.') % {"label": label}
    if note:
        default_msg = f"{default_msg} {note}"
    raise PermissionDenied(
        detail={
            "detail": custom_message or default_msg,
            "code": "module_disabled",
            "module": key,
        }
    )


def enforce_guest_access(request: Any) -> None:
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return
    if is_module_enabled("auth.guest_mode"):
        return
    state = get_modules_state_map().get("auth.guest_mode") or {}
    note = (state.get("maintenance_note") or "").strip()
    msg = _(
        "Chế độ học không cần đăng nhập hiện đang tạm ngưng. Vui lòng đăng nhập để tiếp tục."
    )
    if note:
        msg = f"{msg} {note}"
    raise PermissionDenied(
        detail={
            "detail": msg,
            "code": "guest_mode_disabled",
            "module": "auth.guest_mode",
        }
    )


def get_client_ip(request: Any) -> Optional[str]:
    if request is None:
        return None
    meta = getattr(request, "META", {}) or {}
    forwarded = meta.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    remote = (meta.get("REMOTE_ADDR") or "").strip()
    return remote or None


def log_admin_action(
    request: Any,
    action: str,
    target_type: str,
    target_id: Any = "",
    target_repr: str = "",
    details: Optional[dict[str, Any]] = None,
) -> Any:
    from .models import AdminAuditLog

    user = getattr(request, "user", None)
    actor = user if (user and getattr(user, "is_authenticated", False)) else None
    actor_username = actor.username if actor else "Hệ thống"

    return AdminAuditLog.objects.create(
        actor=actor,
        actor_username=actor_username,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else "",
        target_repr=(target_repr or "")[:255],
        details=details or {},
        ip_address=get_client_ip(request),
    )


def enforce_view_permission(
    user: Any,
    allowed_codes: tuple[str, ...] | list[str],
    message: str = "",
) -> None:
    """Enforces module view permission for authenticated non-superuser accounts."""
    if not user or not getattr(user, "is_authenticated", False):
        return
    if getattr(user, "is_superuser", False):
        return
    has_perm_fn = getattr(user, "has_perm_code", None)
    if callable(has_perm_fn) and any(has_perm_fn(code) for code in allowed_codes):
        return
    raise PermissionDenied(
        {
            "detail": message
            or _("Vai trò của bạn hiện chưa được cấp quyền xem phân hệ này."),
            "code": "permission_denied",
        }
    )


def apply_module_role_permissions(
    module_key: str,
    role_permissions_input: dict[Any, Any],
) -> tuple[dict[str, list[str]], list[str]]:
    """
    Atomically updates per-role action permissions scoped strictly to `module_key`.
    Returns `(updated_role_perms_by_slug, permitted_view_role_slugs)`.
    """
    from rest_framework.exceptions import ValidationError
    from .models import Role

    allowed_codes = MODULE_ACTION_CODE_SET_BY_KEY.get(module_key, set())
    if not allowed_codes:
        raise ValidationError(
            {
                "role_permissions": "Tính năng này chỉ hỗ trợ cấu hình hiển thị theo vai trò."
            }
        )

    if not isinstance(role_permissions_input, dict):
        raise ValidationError(
            {"role_permissions": "Dữ liệu phân quyền vai trò phải là đối tượng JSON."}
        )

    roles_by_key: dict[str, Role] = {}
    all_roles = list(Role.objects.all())
    for role in all_roles:
        roles_by_key[str(role.id)] = role
        roles_by_key[role.slug] = role

    view_code = MODULE_VIEW_PERM_BY_KEY.get(module_key, "")
    updated_summary: dict[str, list[str]] = {}
    pending_saves: list[Role] = []

    for raw_role_key, raw_codes in role_permissions_input.items():
        role_key = str(raw_role_key).strip()
        role_obj = roles_by_key.get(role_key)
        if role_obj is None:
            raise ValidationError(
                {"role_permissions": f"Không tìm thấy vai trò '{role_key}'."}
            )
        if role_obj.slug == "admin":
            continue
        if not isinstance(raw_codes, list):
            raise ValidationError(
                {
                    "role_permissions": f"Danh sách quyền cho vai trò '{role_obj.name}' phải là một mảng."
                }
            )
        cleaned_codes: set[str] = set()
        for item in raw_codes:
            code = str(item).strip()
            if not code:
                continue
            if code not in allowed_codes:
                raise ValidationError(
                    {
                        "role_permissions": f"Quyền '{code}' không thuộc phân hệ đang cấu hình."
                    }
                )
            cleaned_codes.add(code)

        # Preserve permissions from all other modules, replace only this module's codes
        kept_other = [
            c
            for c in normalize_permission_codes(role_obj.permissions)
            if c not in allowed_codes
        ]
        merged = set(kept_other) | cleaned_codes
        next_perms = [c for c in ALL_PERMISSION_CODES if c in merged]
        if next_perms != list(role_obj.permissions or []):
            role_obj.permissions = next_perms
            pending_saves.append(role_obj)
        updated_summary[role_obj.slug] = [
            c for c in next_perms if c in allowed_codes
        ]

    if pending_saves:
        for role_obj in pending_saves:
            role_obj.save(update_fields=["permissions", "updated_at"])
        invalidate_roles_cache()

    view_role_slugs = ["admin"]
    if view_code:
        for role in all_roles:
            if role.slug == "admin":
                continue
            held = set(role.permissions or [])
            if view_code in held:
                view_role_slugs.append(role.slug)

    return updated_summary, view_role_slugs
