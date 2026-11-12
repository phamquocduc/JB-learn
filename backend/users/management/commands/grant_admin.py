from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from users.rbac import (
    ensure_default_rbac_and_modules,
    get_default_role_record,
    log_admin_action,
)


class Command(BaseCommand):
    help = "Cấp vai trò Quản trị viên (admin) cho một tài khoản theo username hoặc email."

    def add_arguments(self, parser):
        parser.add_argument(
            "identifier",
            type=str,
            help="Username hoặc email của tài khoản cần cấp quyền Quản trị viên.",
        )

    def handle(self, *args, **options):
        ensure_default_rbac_and_modules()
        identifier = options["identifier"].strip()
        User = get_user_model()
        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()
        if not user:
            raise CommandError(f"Không tìm thấy người dùng '{identifier}'.")

        admin_role = get_default_role_record("admin")
        user.role = admin_role
        user.is_staff = True
        user.is_active = True
        user.save(update_fields=["role", "is_staff", "is_active"])
        log_admin_action(
            None,
            action="user.grant_admin",
            target_type="user",
            target_id=user.id,
            target_repr=user.username,
            details={"source": "cli"},
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Đã cấp vai trò Quản trị viên cho '{user.username}' (id={user.id})."
            )
        )
