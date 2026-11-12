from __future__ import annotations

import importlib.util
import os
import sys
import time
from datetime import timedelta
from pathlib import Path

import django
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext as _
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from cards.models import Card, CardReview, Course
from cards.serializers import CardSerializer, CourseSerializer
from shadowing.models import ShadowingVideo, UserShadowingProgress
from shadowing.serializers import (
    ShadowingVideoDetailSerializer,
    ShadowingVideoListSerializer,
)
from shadowing.services.transcription import extract_youtube_id

from .models import AdminAuditLog, AppModuleConfig, Role
from .permissions import HasAdminAccess, require_any_perm
from .rbac import (
    ALL_PERMISSION_CODES,
    MODULE_ACTION_CATALOG_BY_KEY,
    MODULE_CATALOG_BY_KEY,
    MODULE_GROUPS,
    MODULE_VIEW_PERM_BY_KEY,
    PERMISSION_CATALOG,
    PERMISSION_GROUPS,
    ROLE_SCOPED_MODULES,
    apply_module_role_permissions,
    ensure_default_rbac_and_modules,
    get_all_subject_role_slugs,
    get_available_module_subjects,
    get_default_role_record,
    get_modules_state_map,
    get_role_visible_modules,
    invalidate_roles_cache,
    log_admin_action,
    normalize_allowed_roles,
    remove_deleted_role_from_modules,
    sync_role_visible_modules,
)
from .serializers import (
    AdminAuditLogSerializer,
    AdminResetPasswordSerializer,
    AdminUserSerializer,
    AdminUserWriteSerializer,
    AppModuleConfigSerializer,
    RoleAdminSerializer,
)

User = get_user_model()


def _parse_bool(val, default=None):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return default


def _paginate_queryset(qs, request: Request, default_size: int = 30, max_size: int = 100):
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = int(request.query_params.get("page_size", default_size))
        page_size = max(1, min(max_size, page_size))
    except (ValueError, TypeError):
        page_size = default_size

    total = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    if page > total_pages:
        page = total_pages
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])
    return items, {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


def _count_active_admins(exclude_user_id: int | None = None) -> int:
    qs = User.objects.filter(is_active=True).filter(
        Q(is_superuser=True)
        | Q(role__slug="admin")
        | Q(role__isnull=True, is_staff=True)
    )
    if exclude_user_id is not None:
        qs = qs.exclude(pk=exclude_user_id)
    return qs.count()


class PublicSystemConfigView(APIView):
    """Public endpoint exposing enabled/disabled module states for live UI gating."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response(
            {
                "modules": get_modules_state_map(),
                "module_groups": MODULE_GROUPS,
            },
            status=status.HTTP_200_OK,
        )


class AdminOverviewAPIView(APIView):
    """Returns real-time system health checks, platform statistics, and latest audit logs."""

    permission_classes = [HasAdminAccess]

    def get(self, request: Request) -> Response:
        require_any_perm(request, ["system.status.view"])
        ensure_default_rbac_and_modules()
        now_dt = timezone.now()
        seven_days_ago = now_dt - timedelta(days=7)

        # 1. Database health & latency
        db_ok = False
        db_latency_ms = 0.0
        db_engine_raw = settings.DATABASES.get("default", {}).get("ENGINE", "")
        db_engine_label = (
            "MySQL"
            if "mysql" in db_engine_raw
            else "PostgreSQL"
            if "postgres" in db_engine_raw
            else "SQLite"
            if "sqlite" in db_engine_raw
            else db_engine_raw.split(".")[-1]
        )
        try:
            t0 = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            db_ok = True
        except Exception:
            db_ok = False

        # 2. Media storage health
        media_root = Path(settings.MEDIA_ROOT)
        media_exists = media_root.exists()
        check_target = media_root if media_exists else media_root.parent
        media_writable = os.access(str(check_target), os.W_OK)
        media_files_count = 0
        media_total_bytes = 0
        if media_exists:
            for root_dir, _dirs, files in os.walk(media_root):
                for fname in files:
                    fpath = Path(root_dir) / fname
                    try:
                        media_total_bytes += fpath.stat().st_size
                        media_files_count += 1
                    except OSError:
                        continue

        # 3. Speech / Transcript engines
        whisper_installed = importlib.util.find_spec("faster_whisper") is not None
        yt_transcript_installed = (
            importlib.util.find_spec("youtube_transcript_api") is not None
        )
        whisper_cache = Path(getattr(settings, "WHISPER_CACHE_DIR", ""))

        # 4. Aggregated platform statistics (single-pass conditional counts)
        user_agg = User.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(is_active=True)),
            inactive=Count("id", filter=Q(is_active=False)),
            new_7d=Count("id", filter=Q(date_joined__gte=seven_days_ago)),
        )
        roles_breakdown = list(
            Role.objects.annotate(user_count=Count("users"))
            .values("id", "slug", "name", "is_system", "user_count")
            .order_by("-is_system", "-user_count", "id")
        )

        course_agg = Course.objects.aggregate(
            total=Count("id"),
            system=Count("id", filter=Q(created_by__isnull=True)),
            public=Count("id", filter=Q(is_public=True)),
            private=Count("id", filter=Q(is_public=False)),
        )

        card_agg = Card.objects.aggregate(
            total=Count("id"),
            grammar=Count("id", filter=Q(card_type=Card.CardType.GRAMMAR)),
            vocabulary=Count("id", filter=Q(card_type=Card.CardType.VOCABULARY)),
            kanji=Count("id", filter=Q(card_type=Card.CardType.KANJI)),
            system=Count("id", filter=Q(created_by__isnull=True)),
            user_created=Count("id", filter=Q(created_by__isnull=False)),
            private=Count("id", filter=Q(is_public=False)),
        )

        video_agg = ShadowingVideo.objects.aggregate(
            total=Count("id"),
            youtube=Count(
                "id", filter=Q(media_source=ShadowingVideo.MediaSource.YOUTUBE)
            ),
            upload=Count(
                "id", filter=Q(media_source=ShadowingVideo.MediaSource.UPLOAD)
            ),
            system=Count("id", filter=Q(created_by__isnull=True)),
            user_created=Count("id", filter=Q(created_by__isnull=False)),
            private=Count("id", filter=Q(is_public=False)),
        )

        review_agg = CardReview.objects.aggregate(
            total_reviews=Count("id"),
            due_reviews=Count(
                "id",
                filter=Q(
                    state__in=[
                        CardReview.ReviewState.LEARNING,
                        CardReview.ReviewState.REVIEW,
                        CardReview.ReviewState.RELEARNING,
                    ]
                )
                & (Q(due_at__lte=now_dt) | Q(due_at__isnull=True)),
            ),
            active_learners_7d=Count(
                "user_id",
                filter=Q(last_reviewed_at__gte=seven_days_ago),
                distinct=True,
            ),
        )
        shadowing_progress_count = UserShadowingProgress.objects.count()

        modules_map = get_modules_state_map()
        enabled_modules = [m for m in modules_map.values() if m["is_enabled"]]
        disabled_modules = [m for m in modules_map.values() if not m["is_enabled"]]

        recent_logs = AdminAuditLogSerializer(
            AdminAuditLog.objects.all()[:8], many=True
        ).data

        return Response(
            {
                "health": {
                    "database": {
                        "ok": db_ok,
                        "engine": db_engine_label,
                        "latency_ms": db_latency_ms,
                    },
                    "media_storage": {
                        "ok": media_writable,
                        "files_count": media_files_count,
                        "size_mb": round(media_total_bytes / (1024 * 1024), 2),
                    },
                    "speech_engine": {
                        "whisper_available": whisper_installed,
                        "youtube_transcript_available": yt_transcript_installed,
                        "whisper_model": getattr(settings, "WHISPER_MODEL_SIZE", "base"),
                        "cache_ready": whisper_cache.exists(),
                    },
                    "runtime": {
                        "django_version": django.get_version(),
                        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                        "timezone": settings.TIME_ZONE,
                        "server_time": now_dt.isoformat(),
                    },
                },
                "counts": {
                    "users": {
                        **user_agg,
                        "by_role": roles_breakdown,
                    },
                    "courses": course_agg,
                    "cards": card_agg,
                    "shadowing": video_agg,
                    "learning": {
                        **review_agg,
                        "shadowing_progress": shadowing_progress_count,
                    },
                },
                "modules_summary": {
                    "total": len(modules_map),
                    "enabled": len(enabled_modules),
                    "disabled": len(disabled_modules),
                    "disabled_items": [
                        {"key": m["key"], "name": m["name"]} for m in disabled_modules
                    ],
                },
                "recent_logs": recent_logs,
            },
            status=status.HTTP_200_OK,
        )


class AdminUserViewSet(viewsets.ViewSet):
    """Full user lifecycle & role assignment API for the integrated Admin console."""

    permission_classes = [HasAdminAccess]

    def _build_stats_context(self, user_ids: list[int]) -> dict:
        if not user_ids:
            return {
                "courses_map": {},
                "cards_map": {},
                "videos_map": {},
                "reviews_map": {},
            }
        courses_map = dict(
            Course.objects.filter(created_by_id__in=user_ids)
            .values("created_by_id")
            .annotate(c=Count("id"))
            .values_list("created_by_id", "c")
        )
        cards_map = dict(
            Card.objects.filter(created_by_id__in=user_ids)
            .values("created_by_id")
            .annotate(c=Count("id"))
            .values_list("created_by_id", "c")
        )
        videos_map = dict(
            ShadowingVideo.objects.filter(created_by_id__in=user_ids)
            .values("created_by_id")
            .annotate(c=Count("id"))
            .values_list("created_by_id", "c")
        )
        reviews_map = dict(
            CardReview.objects.filter(user_id__in=user_ids)
            .values("user_id")
            .annotate(c=Count("id"))
            .values_list("user_id", "c")
        )
        return {
            "courses_map": courses_map,
            "cards_map": cards_map,
            "videos_map": videos_map,
            "reviews_map": reviews_map,
        }

    def _can_touch_admin_role(self, actor: User) -> bool:
        return (
            actor.is_superuser
            or actor.get_effective_role_slug() == "admin"
            or actor.has_perm_code("roles.edit")
        )

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            [
                "users.view",
                "users.create",
                "users.edit",
                "users.lock",
                "users.reset_password",
                "users.delete",
            ],
        )
        ensure_default_rbac_and_modules()
        qs = User.objects.select_related("role").order_by("-date_joined", "-id")

        search = (request.query_params.get("search") or "").strip()
        role_slug = (request.query_params.get("role") or "").strip().lower()
        status_filter = (request.query_params.get("status") or "").strip().lower()

        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        if role_slug:
            if role_slug == "admin":
                qs = qs.filter(Q(role__slug="admin") | Q(is_superuser=True))
            else:
                qs = qs.filter(role__slug=role_slug)
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)

        items, meta = _paginate_queryset(qs, request, default_size=25)
        ctx = self._build_stats_context([u.id for u in items])
        data = AdminUserSerializer(items, many=True, context=ctx).data
        return Response({**meta, "results": data}, status=status.HTTP_200_OK)

    def retrieve(self, request: Request, pk=None) -> Response:
        require_any_perm(
            request,
            [
                "users.view",
                "users.create",
                "users.edit",
                "users.lock",
                "users.reset_password",
                "users.delete",
            ],
        )
        user_obj = get_object_or_404(User.objects.select_related("role"), pk=pk)
        ctx = self._build_stats_context([user_obj.id])
        return Response(
            AdminUserSerializer(user_obj, context=ctx).data,
            status=status.HTTP_200_OK,
        )

    def create(self, request: Request) -> Response:
        require_any_perm(request, ["users.create"])
        ensure_default_rbac_and_modules()

        requested_role = (request.data.get("role_slug") or "learner").strip().lower()
        if requested_role == "admin" and not self._can_touch_admin_role(request.user):
            return Response(
                {"detail": _("Bạn không có quyền gán vai trò Quản trị viên.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminUserWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            new_user = serializer.save()
            log_admin_action(
                request,
                action="user.create",
                target_type="user",
                target_id=new_user.id,
                target_repr=new_user.username,
                details={
                    "email": new_user.email,
                    "role": new_user.get_effective_role_slug(),
                    "is_active": new_user.is_active,
                },
            )
        ctx = self._build_stats_context([new_user.id])
        return Response(
            AdminUserSerializer(new_user, context=ctx).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        target = get_object_or_404(User.objects.select_related("role"), pk=pk)
        prev_role_slug = target.get_effective_role_slug()
        prev_active = target.is_active

        incoming_role = request.data.get("role_slug")
        incoming_active = _parse_bool(request.data.get("is_active"), default=None)
        other_keys = set(request.data.keys()) - {"is_active"}
        if other_keys or incoming_active is None:
            require_any_perm(request, ["users.edit"])
        if incoming_active is not None and incoming_active != prev_active:
            require_any_perm(request, ["users.lock"])
        if request.data.get("password"):
            require_any_perm(request, ["users.reset_password"])

        if (
            prev_role_slug == "admin"
            or (incoming_role and str(incoming_role).strip().lower() == "admin")
        ) and not self._can_touch_admin_role(request.user):
            return Response(
                {"detail": _("Bạn không có quyền thay đổi tài khoản Quản trị viên.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        if target.id == request.user.id:
            if incoming_active is False:
                raise ValidationError(
                    {"detail": _("Bạn không thể tự khóa tài khoản đang đăng nhập.")}
                )
            if incoming_role and str(incoming_role).strip().lower() != prev_role_slug:
                raise ValidationError(
                    {"detail": _("Bạn không thể tự thay đổi vai trò của chính mình.")}
                )

        is_losing_admin = prev_role_slug == "admin" and (
            (incoming_active is False)
            or (
                incoming_role is not None
                and str(incoming_role).strip().lower() != "admin"
                and not target.is_superuser
            )
        )
        if is_losing_admin and _count_active_admins(exclude_user_id=target.id) == 0:
            raise ValidationError(
                {"detail": _("Hệ thống phải luôn giữ ít nhất 1 Quản trị viên đang hoạt động.")}
            )

        serializer = AdminUserWriteSerializer(
            target, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            updated_user = serializer.save()
            if not updated_user.is_active:
                Token.objects.filter(user=updated_user).delete()
            log_admin_action(
                request,
                action="user.update",
                target_type="user",
                target_id=updated_user.id,
                target_repr=updated_user.username,
                details={
                    "prev_role": prev_role_slug,
                    "new_role": updated_user.get_effective_role_slug(),
                    "prev_active": prev_active,
                    "new_active": updated_user.is_active,
                },
            )

        ctx = self._build_stats_context([updated_user.id])
        return Response(
            AdminUserSerializer(updated_user, context=ctx).data,
            status=status.HTTP_200_OK,
        )

    def update(self, request: Request, pk=None) -> Response:
        return self.partial_update(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["users.lock"])
        target = get_object_or_404(User.objects.select_related("role"), pk=pk)

        if (
            target.get_effective_role_slug() == "admin"
            and not self._can_touch_admin_role(request.user)
        ):
            return Response(
                {"detail": _("Bạn không có quyền khóa tài khoản Quản trị viên.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        if target.id == request.user.id and target.is_active:
            raise ValidationError(
                {"detail": _("Bạn không thể tự khóa tài khoản đang đăng nhập.")}
            )

        next_active = not target.is_active
        if (
            not next_active
            and target.get_effective_role_slug() == "admin"
            and _count_active_admins(exclude_user_id=target.id) == 0
        ):
            raise ValidationError(
                {"detail": _("Hệ thống phải luôn giữ ít nhất 1 Quản trị viên đang hoạt động.")}
            )

        with transaction.atomic():
            target.is_active = next_active
            target.save(update_fields=["is_active"])
            if not next_active:
                Token.objects.filter(user=target).delete()
            log_admin_action(
                request,
                action="user.unlock" if next_active else "user.lock",
                target_type="user",
                target_id=target.id,
                target_repr=target.username,
                details={"is_active": next_active},
            )

        ctx = self._build_stats_context([target.id])
        return Response(
            AdminUserSerializer(target, context=ctx).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["users.reset_password"])
        target = get_object_or_404(User.objects.select_related("role"), pk=pk)

        if (
            target.get_effective_role_slug() == "admin"
            and not self._can_touch_admin_role(request.user)
        ):
            return Response(
                {"detail": _("Bạn không có quyền đặt lại mật khẩu Quản trị viên.")},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            target.set_password(serializer.validated_data["password"])
            target.save(update_fields=["password"])
            if target.id != request.user.id:
                Token.objects.filter(user=target).delete()
            log_admin_action(
                request,
                action="user.reset_password",
                target_type="user",
                target_id=target.id,
                target_repr=target.username,
            )

        return Response(
            {
                "detail": _("Đã đặt lại mật khẩu cho '%(username)s'.")
                % {"username": target.username}
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["users.delete"])
        target = get_object_or_404(User.objects.select_related("role"), pk=pk)

        if target.id == request.user.id:
            raise ValidationError(
                {"detail": _("Bạn không thể tự xóa tài khoản đang đăng nhập.")}
            )
        if (
            target.get_effective_role_slug() == "admin"
            and not self._can_touch_admin_role(request.user)
        ):
            return Response(
                {"detail": _("Bạn không có quyền xóa tài khoản Quản trị viên.")},
                status=status.HTTP_403_FORBIDDEN,
            )
        if (
            target.get_effective_role_slug() == "admin"
            and target.is_active
            and _count_active_admins(exclude_user_id=target.id) == 0
        ):
            raise ValidationError(
                {"detail": _("Hệ thống phải luôn giữ ít nhất 1 Quản trị viên đang hoạt động.")}
            )

        username = target.username
        target_id = target.id
        with transaction.atomic():
            Token.objects.filter(user=target).delete()
            target.delete()
            log_admin_action(
                request,
                action="user.delete",
                target_type="user",
                target_id=target_id,
                target_repr=username,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRoleViewSet(viewsets.ViewSet):
    """Dynamic RBAC Role, Module Visibility & Permission matrix management API."""

    permission_classes = [HasAdminAccess]

    def _sync_role_view_and_visibility(
        self,
        role: Role,
        request_data: dict,
        prev_perms: list[str] | None = None,
    ) -> None:
        if role.slug == "admin":
            return
        perms = set(role.permissions or [])
        visible_modules = list(get_role_visible_modules(role.slug))
        visible_set = set(visible_modules)

        if "visible_modules" in request_data:
            for mod_key, view_code in MODULE_VIEW_PERM_BY_KEY.items():
                if mod_key in visible_set:
                    perms.add(view_code)
                else:
                    perms.discard(view_code)
        elif prev_perms is not None:
            prev_set = set(prev_perms)
            vis_changed = False
            for mod_key, view_code in MODULE_VIEW_PERM_BY_KEY.items():
                if view_code in perms and view_code not in prev_set:
                    visible_set.add(mod_key)
                    vis_changed = True
                elif view_code not in perms and view_code in prev_set:
                    visible_set.discard(mod_key)
                    vis_changed = True
            if vis_changed:
                sync_role_visible_modules(role.slug, list(visible_set))
        else:
            for mod_key, view_code in MODULE_VIEW_PERM_BY_KEY.items():
                if mod_key in visible_set:
                    perms.add(view_code)

        ordered = [code for code in ALL_PERMISSION_CODES if code in perms]
        if ordered != list(role.permissions or []):
            role.permissions = ordered
            role.save(update_fields=["permissions", "updated_at"])
            invalidate_roles_cache()

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            [
                "roles.view",
                "roles.create",
                "roles.edit",
                "roles.delete",
                "users.view",
                "users.create",
                "users.edit",
            ],
        )
        ensure_default_rbac_and_modules()
        state_map = get_modules_state_map()
        roles = Role.objects.annotate(user_count=Count("users")).order_by(
            "-is_system", "id"
        )
        return Response(
            {
                "results": RoleAdminSerializer(
                    roles,
                    many=True,
                    context={"modules_state_map": state_map},
                ).data,
                "permission_groups": PERMISSION_GROUPS,
                "permission_catalog": PERMISSION_CATALOG,
                "module_groups": [
                    g for g in MODULE_GROUPS if g["key"] != "access"
                ],
                "role_scoped_modules": ROLE_SCOPED_MODULES,
            },
            status=status.HTTP_200_OK,
        )

    def create(self, request: Request) -> Response:
        require_any_perm(request, ["roles.create"])
        ensure_default_rbac_and_modules()
        serializer = RoleAdminSerializer(
            data=request.data,
            context={"actor": request.user},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            role = serializer.save(is_system=False)
            self._sync_role_view_and_visibility(role, request.data)
            state_map = get_modules_state_map()
            visible_modules = get_role_visible_modules(role.slug, state_map)
            log_admin_action(
                request,
                action="role.create",
                target_type="role",
                target_id=role.id,
                target_repr=role.name,
                details={
                    "slug": role.slug,
                    "permissions": role.permissions,
                    "visible_modules": visible_modules,
                },
            )
        return Response(
            RoleAdminSerializer(
                role,
                context={"modules_state_map": state_map},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["roles.edit"])
        ensure_default_rbac_and_modules()
        role = get_object_or_404(Role, pk=pk)
        prev_perms = list(role.permissions)
        prev_visible = get_role_visible_modules(role.slug)
        serializer = RoleAdminSerializer(
            role,
            data=request.data,
            partial=True,
            context={"actor": request.user},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated_role = serializer.save()
            self._sync_role_view_and_visibility(
                updated_role, request.data, prev_perms=prev_perms
            )
            state_map = get_modules_state_map()
            next_visible = get_role_visible_modules(updated_role.slug, state_map)
            log_admin_action(
                request,
                action="role.update",
                target_type="role",
                target_id=updated_role.id,
                target_repr=updated_role.name,
                details={
                    "slug": updated_role.slug,
                    "prev_permissions": prev_perms,
                    "new_permissions": updated_role.permissions,
                    "prev_visible_modules": prev_visible,
                    "new_visible_modules": next_visible,
                },
            )
        updated_role.user_count = updated_role.users.count()
        return Response(
            RoleAdminSerializer(
                updated_role,
                context={"modules_state_map": state_map},
            ).data,
            status=status.HTTP_200_OK,
        )

    def update(self, request: Request, pk=None) -> Response:
        return self.partial_update(request, pk=pk)

    def destroy(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["roles.delete"])
        role = get_object_or_404(Role, pk=pk)
        if role.is_system:
            raise ValidationError(
                {"detail": _("Không thể xóa vai trò mặc định của hệ thống.")}
            )
        role_name = role.name
        role_slug = role.slug
        role_id = role.id
        with transaction.atomic():
            learner_role = get_default_role_record("learner")
            reassigned_count = User.objects.filter(role=role).update(
                role=learner_role, is_staff=False
            )
            role.delete()
            remove_deleted_role_from_modules(role_slug)
            log_admin_action(
                request,
                action="role.delete",
                target_type="role",
                target_id=role_id,
                target_repr=role_name,
                details={
                    "slug": role_slug,
                    "reassigned_users": reassigned_count,
                },
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminModuleViewSet(viewsets.ViewSet):
    """Runtime feature/module toggle & per-role visibility API."""

    permission_classes = [HasAdminAccess]
    lookup_value_regex = r"[a-zA-Z0-9_.-]+"

    def _serialized_modules_payload(self) -> dict:
        ensure_default_rbac_and_modules()
        state_map = get_modules_state_map()
        rows = AppModuleConfig.objects.select_related("updated_by").order_by(
            "display_order", "key"
        )
        roles = Role.objects.annotate(user_count=Count("users")).order_by(
            "-is_system", "id"
        )
        return {
            "module_groups": MODULE_GROUPS,
            "modules_map": state_map,
            "available_roles": get_available_module_subjects(),
            "action_catalog_by_key": MODULE_ACTION_CATALOG_BY_KEY,
            "module_view_perm_by_key": MODULE_VIEW_PERM_BY_KEY,
            "roles": RoleAdminSerializer(
                roles,
                many=True,
                context={"modules_state_map": state_map},
            ).data,
            "results": AppModuleConfigSerializer(
                rows,
                many=True,
                context={"modules_state_map": state_map},
            ).data,
        }

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            ["modules.view", "modules.toggle", "modules.assign_roles", "roles.edit"],
        )
        return Response(
            self._serialized_modules_payload(),
            status=status.HTTP_200_OK,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        has_global_fields = (
            "is_enabled" in request.data or "maintenance_note" in request.data
        )
        has_role_fields = (
            "allowed_roles" in request.data or "role_permissions" in request.data
        )
        if has_global_fields:
            require_any_perm(request, ["modules.toggle"])
        if has_role_fields:
            require_any_perm(request, ["modules.assign_roles", "roles.edit"])
        if not has_global_fields and not has_role_fields:
            require_any_perm(request, ["modules.toggle", "modules.assign_roles"])

        ensure_default_rbac_and_modules()
        mod = get_object_or_404(AppModuleConfig, key=pk)

        prev_enabled = mod.is_enabled
        prev_note = mod.maintenance_note
        prev_allowed_roles = mod.allowed_roles
        next_enabled = _parse_bool(request.data.get("is_enabled"), default=mod.is_enabled)
        next_note = (
            str(request.data.get("maintenance_note", mod.maintenance_note)).strip()[:255]
        )

        next_allowed_roles = mod.allowed_roles
        incoming_roles = request.data.get("allowed_roles")
        if "allowed_roles" in request.data:
            is_role_scoped = bool(
                MODULE_CATALOG_BY_KEY.get(mod.key, {}).get("role_scoped", False)
            )
            if not is_role_scoped:
                raise ValidationError(
                    {
                        "allowed_roles": _(
                            "Tính năng này áp dụng toàn cục, không phân quyền theo vai trò."
                        )
                    }
                )
            if incoming_roles is not None and not isinstance(incoming_roles, list):
                raise ValidationError(
                    {
                        "allowed_roles": _(
                            "Danh sách vai trò phải là một mảng hoặc để trống."
                        )
                    }
                )
            universe = get_all_subject_role_slugs()
            if isinstance(incoming_roles, list):
                universe_set = set(universe)
                invalid = [
                    str(r).strip()
                    for r in incoming_roles
                    if str(r).strip() and str(r).strip().lower() not in universe_set
                ]
                if invalid:
                    raise ValidationError(
                        {
                            "allowed_roles": _("Mã vai trò không hợp lệ: %(roles)s")
                            % {"roles": ", ".join(invalid)}
                        }
                    )
            next_allowed_roles = normalize_allowed_roles(
                incoming_roles,
                valid_slugs=universe,
            )

        role_perms_updated = None
        with transaction.atomic():
            if "role_permissions" in request.data:
                role_perms_updated, view_role_slugs = apply_module_role_permissions(
                    mod.key,
                    request.data.get("role_permissions"),
                )
                if MODULE_VIEW_PERM_BY_KEY.get(mod.key):
                    if "allowed_roles" in request.data:
                        allow_guest = incoming_roles is None or (
                            isinstance(incoming_roles, list)
                            and any(
                                str(r).strip().lower() == "guest"
                                for r in incoming_roles
                            )
                        )
                    else:
                        allow_guest = prev_allowed_roles is None or (
                            isinstance(prev_allowed_roles, list)
                            and "guest" in prev_allowed_roles
                        )
                    combined_subjects = (
                        (["guest"] if allow_guest else []) + view_role_slugs
                    )
                    next_allowed_roles = normalize_allowed_roles(
                        combined_subjects,
                        valid_slugs=get_all_subject_role_slugs(),
                    )

            mod.is_enabled = bool(next_enabled)
            mod.maintenance_note = next_note
            mod.allowed_roles = next_allowed_roles
            mod.updated_by = request.user
            mod.save()
            audit_details = {
                "prev_enabled": prev_enabled,
                "is_enabled": mod.is_enabled,
                "prev_note": prev_note,
                "maintenance_note": mod.maintenance_note,
                "prev_allowed_roles": prev_allowed_roles,
                "allowed_roles": mod.allowed_roles,
            }
            if role_perms_updated is not None:
                audit_details["role_permissions"] = role_perms_updated
            log_admin_action(
                request,
                action="module.toggle",
                target_type="module",
                target_id=mod.key,
                target_repr=mod.name,
                details=audit_details,
            )

        return Response(
            self._serialized_modules_payload(),
            status=status.HTTP_200_OK,
        )


class AdminCourseViewSet(viewsets.ViewSet):
    """Admin CRUD over all Courses (System + Public + Private)."""

    permission_classes = [HasAdminAccess]

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            ["courses.view_all", "courses.create", "courses.edit", "courses.delete"],
        )
        qs = (
            Course.objects.select_related("created_by")
            .annotate(card_count=Count("cards"))
            .order_by("-created_at", "-id")
        )

        search = (request.query_params.get("search") or "").strip()
        level = (request.query_params.get("level") or "").strip()
        card_type = (request.query_params.get("card_type") or "").strip()
        scope = (request.query_params.get("scope") or "").strip().lower()
        visibility = (request.query_params.get("visibility") or "").strip().lower()

        if search:
            qs = qs.search(search)
        if level:
            qs = qs.by_level(level)
        if card_type:
            qs = qs.by_type(card_type)
        if scope == "system":
            qs = qs.filter(created_by__isnull=True)
        elif scope == "user":
            qs = qs.filter(created_by__isnull=False)
        if visibility == "public":
            qs = qs.filter(is_public=True)
        elif visibility == "private":
            qs = qs.filter(is_public=False)

        items, meta = _paginate_queryset(qs, request, default_size=25)
        data = CourseSerializer(
            items, many=True, context={"request": request}
        ).data
        return Response({**meta, "results": data}, status=status.HTTP_200_OK)

    def create(self, request: Request) -> Response:
        require_any_perm(request, ["courses.create"])
        as_system = _parse_bool(request.data.get("as_system"), default=True)
        serializer = CourseSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            owner = None if as_system else request.user
            course = serializer.save(created_by=owner)
            log_admin_action(
                request,
                action="course.create",
                target_type="course",
                target_id=course.id,
                target_repr=course.title,
                details={"as_system": as_system, "is_public": course.is_public},
            )
        return Response(
            CourseSerializer(course, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["courses.edit"])
        course = get_object_or_404(Course.objects.select_related("created_by"), pk=pk)
        serializer = CourseSerializer(
            course, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        extra_save = {}
        if "as_system" in request.data:
            as_system = _parse_bool(request.data.get("as_system"), default=False)
            if as_system:
                extra_save["created_by"] = None
            elif course.created_by_id is None:
                extra_save["created_by"] = request.user

        with transaction.atomic():
            updated = serializer.save(**extra_save)
            log_admin_action(
                request,
                action="course.update",
                target_type="course",
                target_id=updated.id,
                target_repr=updated.title,
                details={"is_public": updated.is_public},
            )
        return Response(
            CourseSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["courses.delete"])
        course = get_object_or_404(Course, pk=pk)
        title = course.title
        cid = course.id
        with transaction.atomic():
            course.delete()
            log_admin_action(
                request,
                action="course.delete",
                target_type="course",
                target_id=cid,
                target_repr=title,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCardViewSet(viewsets.ViewSet):
    """Admin CRUD over all Study Cards (System + Public + Private)."""

    permission_classes = [HasAdminAccess]

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            ["cards.view_all", "cards.create", "cards.edit", "cards.delete"],
        )
        qs = Card.objects.select_related("course", "created_by").order_by(
            "-id"
        )

        search = (request.query_params.get("search") or "").strip()
        level = (request.query_params.get("level") or "").strip()
        card_type = (request.query_params.get("card_type") or "").strip()
        course_id = (request.query_params.get("course") or "").strip()
        scope = (request.query_params.get("scope") or "").strip().lower()
        visibility = (request.query_params.get("visibility") or "").strip().lower()

        if search:
            qs = qs.search(search)
        if level:
            qs = qs.by_level(level)
        if card_type:
            qs = qs.by_type(card_type)
        if course_id:
            qs = qs.by_course(course_id)
        if scope == "system":
            qs = qs.filter(created_by__isnull=True)
        elif scope == "user":
            qs = qs.filter(created_by__isnull=False)
        if visibility == "public":
            qs = qs.filter(is_public=True)
        elif visibility == "private":
            qs = qs.filter(is_public=False)

        items, meta = _paginate_queryset(qs, request, default_size=30)
        data = CardSerializer(
            items, many=True, context={"request": request}
        ).data
        return Response({**meta, "results": data}, status=status.HTTP_200_OK)

    def create(self, request: Request) -> Response:
        require_any_perm(request, ["cards.create"])
        as_system = _parse_bool(request.data.get("as_system"), default=True)
        serializer = CardSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            owner = None if as_system else request.user
            card = serializer.save(created_by=owner)
            log_admin_action(
                request,
                action="card.create",
                target_type="card",
                target_id=card.id,
                target_repr=card.front_text,
                details={
                    "card_type": card.card_type,
                    "level": card.level,
                    "as_system": as_system,
                },
            )
        return Response(
            CardSerializer(card, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["cards.edit"])
        card = get_object_or_404(
            Card.objects.select_related("course", "created_by"), pk=pk
        )
        serializer = CardSerializer(
            card, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        extra_save = {}
        if "as_system" in request.data:
            as_system = _parse_bool(request.data.get("as_system"), default=False)
            if as_system:
                extra_save["created_by"] = None
            elif card.created_by_id is None:
                extra_save["created_by"] = request.user

        with transaction.atomic():
            updated = serializer.save(**extra_save)
            log_admin_action(
                request,
                action="card.update",
                target_type="card",
                target_id=updated.id,
                target_repr=updated.front_text,
                details={"is_public": updated.is_public},
            )
        return Response(
            CardSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["cards.delete"])
        card = get_object_or_404(Card, pk=pk)
        front_text = card.front_text
        cid = card.id
        with transaction.atomic():
            card.delete()
            log_admin_action(
                request,
                action="card.delete",
                target_type="card",
                target_id=cid,
                target_repr=front_text,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminShadowingVideoViewSet(viewsets.ViewSet):
    """Admin CRUD over all Shadowing Videos (System + Public + Private)."""

    permission_classes = [HasAdminAccess]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def list(self, request: Request) -> Response:
        require_any_perm(
            request,
            [
                "shadowing.view_all",
                "shadowing.create",
                "shadowing.edit",
                "shadowing.delete",
            ],
        )
        qs = ShadowingVideo.objects.select_related("created_by").order_by(
            "-created_at", "-id"
        )

        search = (request.query_params.get("search") or "").strip()
        level = (request.query_params.get("level") or "").strip()
        topic = (request.query_params.get("topic") or "").strip()
        scope = (request.query_params.get("scope") or "").strip().lower()
        visibility = (request.query_params.get("visibility") or "").strip().lower()

        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(translations__en__title__icontains=search)
                | Q(translations__en__description__icontains=search)
            )
        if level:
            qs = qs.by_level(level)
        if topic:
            qs = qs.by_topic(topic)
        if scope == "system":
            qs = qs.filter(created_by__isnull=True)
        elif scope == "user":
            qs = qs.filter(created_by__isnull=False)
        if visibility == "public":
            qs = qs.filter(is_public=True)
        elif visibility == "private":
            qs = qs.filter(is_public=False)

        items, meta = _paginate_queryset(qs, request, default_size=25)
        data = ShadowingVideoListSerializer(
            items, many=True, context={"request": request}
        ).data
        return Response({**meta, "results": data}, status=status.HTTP_200_OK)

    def retrieve(self, request: Request, pk=None) -> Response:
        require_any_perm(
            request,
            [
                "shadowing.view_all",
                "shadowing.create",
                "shadowing.edit",
                "shadowing.delete",
            ],
        )
        video = get_object_or_404(
            ShadowingVideo.objects.select_related("created_by"), pk=pk
        )
        return Response(
            ShadowingVideoDetailSerializer(video, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def create(self, request: Request) -> Response:
        require_any_perm(request, ["shadowing.create"])
        as_system = _parse_bool(request.data.get("as_system"), default=True)
        serializer = ShadowingVideoDetailSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        youtube_url = serializer.validated_data.get("youtube_url", "")
        youtube_id = serializer.validated_data.get("youtube_id", "")
        if youtube_url and not youtube_id:
            youtube_id = extract_youtube_id(youtube_url)

        extra_kwargs = {
            "created_by": None if as_system else request.user,
            "youtube_id": youtube_id,
        }
        if youtube_id and not serializer.validated_data.get("thumbnail_url"):
            extra_kwargs["thumbnail_url"] = (
                f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"
            )

        with transaction.atomic():
            video = serializer.save(**extra_kwargs)
            log_admin_action(
                request,
                action="video.create",
                target_type="video",
                target_id=video.id,
                target_repr=video.title,
                details={"as_system": as_system, "is_public": video.is_public},
            )
        return Response(
            ShadowingVideoDetailSerializer(video, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["shadowing.edit"])
        video = get_object_or_404(
            ShadowingVideo.objects.select_related("created_by"), pk=pk
        )
        serializer = ShadowingVideoDetailSerializer(
            video, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        extra_save = {}
        youtube_url = serializer.validated_data.get("youtube_url", "")
        if youtube_url:
            extra_save["youtube_id"] = extract_youtube_id(youtube_url)
        if "as_system" in request.data:
            as_system = _parse_bool(request.data.get("as_system"), default=False)
            if as_system:
                extra_save["created_by"] = None
            elif video.created_by_id is None:
                extra_save["created_by"] = request.user

        with transaction.atomic():
            updated = serializer.save(**extra_save)
            log_admin_action(
                request,
                action="video.update",
                target_type="video",
                target_id=updated.id,
                target_repr=updated.title,
                details={"is_public": updated.is_public},
            )
        return Response(
            ShadowingVideoDetailSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request: Request, pk=None) -> Response:
        require_any_perm(request, ["shadowing.delete"])
        video = get_object_or_404(ShadowingVideo, pk=pk)
        title = video.title
        vid = video.id
        with transaction.atomic():
            video.delete()
            log_admin_action(
                request,
                action="video.delete",
                target_type="video",
                target_id=vid,
                target_repr=title,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAuditLogListView(APIView):
    """Paginated administrative audit log endpoint."""

    permission_classes = [HasAdminAccess]

    def get(self, request: Request) -> Response:
        require_any_perm(request, ["system.audit.view"])
        qs = AdminAuditLog.objects.all()

        target_type = (request.query_params.get("target_type") or "").strip().lower()
        action_filter = (request.query_params.get("action") or "").strip().lower()
        search = (request.query_params.get("search") or "").strip()

        if target_type:
            qs = qs.filter(target_type=target_type)
        if action_filter:
            qs = qs.filter(action__icontains=action_filter)
        if search:
            qs = qs.filter(
                Q(actor_username__icontains=search)
                | Q(target_repr__icontains=search)
                | Q(action__icontains=search)
            )

        items, meta = _paginate_queryset(qs, request, default_size=30)
        return Response(
            {
                **meta,
                "results": AdminAuditLogSerializer(items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
