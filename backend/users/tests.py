from __future__ import annotations

from io import StringIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from cards.models import Card, Course
from shadowing.models import ShadowingVideo

from .models import AdminAuditLog, AppModuleConfig, AppSystemConfig, Role
from .rbac import (
    ALL_PERMISSION_CODES,
    DEFAULT_PRIMARY_COLOR,
    ensure_default_rbac_and_modules,
    get_default_role_record,
    invalidate_appearance_cache,
    invalidate_modules_cache,
    invalidate_roles_cache,
)

User = get_user_model()


class CustomUserModelTests(TestCase):
    def setUp(self):
        cache.clear()
        ensure_default_rbac_and_modules()

    def test_auth_user_model_setting_points_to_users_user(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "users.User")
        self.assertIs(get_user_model(), User)
        self.assertTrue(issubclass(User, AbstractUser))

    def test_custom_user_inherits_default_abstract_user_attributes(self):
        user = User.objects.create_user(
            username="tanaka",
            email="tanaka@example.com",
            password="StrongPassword123!",
            first_name="Taro",
            last_name="Tanaka",
        )
        self.assertEqual(user.username, "tanaka")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertEqual(user.get_full_name(), "Taro Tanaka")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.get_effective_role_slug(), "learner")
        self.assertTrue(user.has_perm_code("personal_content.create"))
        self.assertFalse(user.has_perm_code("admin.access"))

    def test_django_default_admin_url_is_unmounted(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 404)

    def test_grant_admin_management_command_promotes_user(self):
        user = User.objects.create_user(
            username="cli_target",
            email="cli_target@example.com",
            password="StrongPassword123!",
        )
        out = StringIO()
        call_command("grant_admin", "cli_target@example.com", stdout=out)
        user.refresh_from_db()
        self.assertEqual(user.get_effective_role_slug(), "admin")
        self.assertTrue(user.is_staff)
        self.assertTrue(user.has_perm_code("admin.access"))
        self.assertTrue(AdminAuditLog.objects.filter(action="user.grant_admin").exists())


class RBACAndAdminUsersAPITests(TestCase):
    def setUp(self):
        cache.clear()
        ensure_default_rbac_and_modules()
        self.admin_role = get_default_role_record("admin")
        self.mod_role = get_default_role_record("moderator")
        self.learner_role = get_default_role_record("learner")

        self.admin_user = User.objects.create_user(
            username="root_admin",
            email="root_admin@example.com",
            password="AdminPassword123!",
            role=self.admin_role,
            is_staff=True,
        )
        self.mod_user = User.objects.create_user(
            username="editor_mod",
            email="editor_mod@example.com",
            password="ModPassword123!",
            role=self.mod_role,
        )
        self.learner_user = User.objects.create_user(
            username="student_one",
            email="student_one@example.com",
            password="StudentPassword123!",
            role=self.learner_role,
        )

        self.admin_client = APIClient()
        admin_token, _ = Token.objects.get_or_create(user=self.admin_user)
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Token {admin_token.key}")

        self.mod_client = APIClient()
        mod_token, _ = Token.objects.get_or_create(user=self.mod_user)
        self.mod_client.credentials(HTTP_AUTHORIZATION=f"Token {mod_token.key}")

        self.learner_client = APIClient()
        self.learner_token, _ = Token.objects.get_or_create(user=self.learner_user)
        self.learner_client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.learner_token.key}"
        )

    def test_register_assigns_learner_role_and_exposes_permissions(self):
        anon = APIClient()
        res = anon.post(
            "/api/auth/register/",
            {
                "username": "new_learner",
                "email": "new_learner@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        user_payload = res.data["user"]
        self.assertEqual(user_payload["role_slug"], "learner")
        self.assertFalse(user_payload["can_access_admin"])
        self.assertIn("courses.create_own", user_payload["permissions"])
        self.assertIn("cards.create_own", user_payload["permissions"])
        self.assertIn("shadowing.create_own", user_payload["permissions"])

    def test_admin_overview_blocked_for_learner_and_accessible_for_admin(self):
        denied = self.learner_client.get("/api/admin/overview/")
        self.assertEqual(denied.status_code, 403)

        ok = self.admin_client.get("/api/admin/overview/")
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.data["health"]["database"]["ok"])
        self.assertGreaterEqual(ok.data["counts"]["users"]["total"], 3)
        self.assertEqual(ok.data["modules_summary"]["total"], 10)

    def test_moderator_cannot_manage_users_or_roles(self):
        res_users = self.mod_client.get("/api/admin/users/")
        self.assertEqual(res_users.status_code, 403)

        res_role_create = self.mod_client.post(
            "/api/admin/roles/",
            {"name": "Trợ giảng", "permissions": ["cards.manage"]},
            format="json",
        )
        self.assertEqual(res_role_create.status_code, 403)

    def test_custom_role_crud_and_reassignment_on_delete(self):
        create_res = self.admin_client.post(
            "/api/admin/roles/",
            {
                "name": "Quản lý Học viên",
                "slug": "user-supervisor",
                "description": "Hỗ trợ tài khoản học viên",
                "permissions": ["admin.access", "users.view", "users.manage"],
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, 201)
        role_id = create_res.data["id"]
        self.assertFalse(create_res.data["is_system"])

        # Assign learner_user to custom role
        assign_res = self.admin_client.patch(
            f"/api/admin/users/{self.learner_user.id}/",
            {"role_slug": "user-supervisor"},
            format="json",
        )
        self.assertEqual(assign_res.status_code, 200)
        self.assertEqual(assign_res.data["role_slug"], "user-supervisor")

        # User with users.manage WITHOUT roles.manage cannot escalate anyone to admin
        escalate_res = self.learner_client.post(
            "/api/admin/users/",
            {
                "username": "sneaky_admin",
                "email": "sneaky@example.com",
                "password": "StrongPassword123!",
                "role_slug": "admin",
            },
            format="json",
        )
        self.assertEqual(escalate_res.status_code, 403)

        # Cannot delete built-in system role
        sys_del = self.admin_client.delete(f"/api/admin/roles/{self.admin_role.id}/")
        self.assertEqual(sys_del.status_code, 400)

        # Deleting custom role reassigns member back to learner
        del_res = self.admin_client.delete(f"/api/admin/roles/{role_id}/")
        self.assertEqual(del_res.status_code, 204)
        self.learner_user.refresh_from_db()
        self.assertEqual(self.learner_user.get_effective_role_slug(), "learner")

    def test_lock_user_revokes_auth_token_and_protects_last_admin(self):
        # Self-lock & last-admin lock must fail
        self_lock = self.admin_client.post(
            f"/api/admin/users/{self.admin_user.id}/toggle-active/"
        )
        self.assertEqual(self_lock.status_code, 400)

        self_delete = self.admin_client.delete(
            f"/api/admin/users/{self.admin_user.id}/"
        )
        self.assertEqual(self_delete.status_code, 400)

        self_demote = self.admin_client.patch(
            f"/api/admin/users/{self.admin_user.id}/",
            {"role_slug": "learner"},
            format="json",
        )
        self.assertEqual(self_demote.status_code, 400)

        # Lock learner_user -> revokes token immediately
        lock_res = self.admin_client.post(
            f"/api/admin/users/{self.learner_user.id}/toggle-active/"
        )
        self.assertEqual(lock_res.status_code, 200)
        self.assertFalse(lock_res.data["is_active"])
        self.assertFalse(Token.objects.filter(user=self.learner_user).exists())

        me_res = self.learner_client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, 401)

    def test_reset_user_password_updates_credentials_and_logs_audit(self):
        res = self.admin_client.post(
            f"/api/admin/users/{self.learner_user.id}/reset-password/",
            {"password": "NewSecurePassword456!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.learner_user.refresh_from_db()
        self.assertTrue(self.learner_user.check_password("NewSecurePassword456!"))

        logs_res = self.admin_client.get(
            "/api/admin/audit-logs/?action=user.reset_password"
        )
        self.assertEqual(logs_res.status_code, 200)
        self.assertGreaterEqual(logs_res.data["total"], 1)


class ModuleToggleAndContentManagementTests(TestCase):
    def setUp(self):
        cache.clear()
        ensure_default_rbac_and_modules()
        self.admin_user = User.objects.create_user(
            username="sys_admin",
            email="sys_admin@example.com",
            password="AdminPassword123!",
            role=get_default_role_record("admin"),
            is_staff=True,
        )
        self.mod_user = User.objects.create_user(
            username="content_mod",
            email="content_mod@example.com",
            password="ModPassword123!",
            role=get_default_role_record("moderator"),
        )
        self.learner_user = User.objects.create_user(
            username="learner_a",
            email="learner_a@example.com",
            password="LearnerPassword123!",
            role=get_default_role_record("learner"),
        )

        self.admin_client = APIClient()
        t_admin, _ = Token.objects.get_or_create(user=self.admin_user)
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Token {t_admin.key}")

        self.mod_client = APIClient()
        t_mod, _ = Token.objects.get_or_create(user=self.mod_user)
        self.mod_client.credentials(HTTP_AUTHORIZATION=f"Token {t_mod.key}")

        self.learner_client = APIClient()
        t_learn, _ = Token.objects.get_or_create(user=self.learner_user)
        self.learner_client.credentials(HTTP_AUTHORIZATION=f"Token {t_learn.key}")

        self.anon_client = APIClient()

        self.system_course = Course.objects.create(
            title="Giáo trình Hệ thống N3",
            level="N3",
            card_type="vocabulary",
            is_public=True,
            created_by=None,
        )
        self.system_card = Card.objects.create(
            course=self.system_course,
            card_type="vocabulary",
            level="N3",
            lesson="Bài 1",
            front_text="約束",
            meaning="Lời hứa",
            is_public=True,
            created_by=None,
        )
        self.system_video = ShadowingVideo.objects.create(
            title="Bản tin NHK mẫu",
            level="N3",
            topic="news",
            media_source="youtube",
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtube_id="dQw4w9WgXcQ",
            is_public=True,
            created_by=None,
            segments=[{"text": "こんにちは", "start": 0.0, "end": 1.5}],
        )

    def test_module_toggles_enforce_api_for_guests_and_learners_but_bypass_for_admin(self):
        # 1. Disable registration
        r1 = self.admin_client.patch(
            "/api/admin/modules/auth.registration/",
            {"is_enabled": False, "maintenance_note": "Tạm khóa đăng ký."},
            format="json",
        )
        self.assertEqual(r1.status_code, 200)

        reg_attempt = self.anon_client.post(
            "/api/auth/register/",
            {
                "username": "blocked_user",
                "email": "blocked@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(reg_attempt.status_code, 403)
        self.assertEqual(reg_attempt.data["code"], "module_disabled")

        # 2. Disable guest_mode -> blocks anonymous, allows authenticated learner
        self.admin_client.patch(
            "/api/admin/modules/auth.guest_mode/",
            {"is_enabled": False},
            format="json",
        )
        self.assertEqual(self.anon_client.get("/api/courses/").status_code, 403)
        self.assertEqual(self.learner_client.get("/api/courses/").status_code, 200)

        # 3. Disable parent `shadowing` -> cascades to child modules in public-config & blocks learner
        self.admin_client.patch(
            "/api/admin/modules/shadowing/",
            {"is_enabled": False, "maintenance_note": "Đang nâng cấp phòng nghe."},
            format="json",
        )
        pub_cfg = self.anon_client.get("/api/system/public-config/")
        self.assertEqual(pub_cfg.status_code, 200)
        self.assertFalse(pub_cfg.data["modules"]["shadowing"]["is_enabled"])
        self.assertFalse(
            pub_cfg.data["modules"]["shadowing.pronunciation"]["is_enabled"]
        )
        self.assertEqual(
            pub_cfg.data["modules"]["shadowing.pronunciation"]["maintenance_note"],
            "Đang nâng cấp phòng nghe.",
        )

        learner_vid = self.learner_client.get("/api/shadowing/videos/")
        self.assertEqual(learner_vid.status_code, 403)
        self.assertEqual(learner_vid.data["code"], "module_disabled")

        # Admin bypasses disabled module!
        admin_vid = self.admin_client.get("/api/shadowing/videos/")
        self.assertEqual(admin_vid.status_code, 200)

        # 4. Disable `study.personal_cards` -> learner can still read cards, cannot create card
        self.admin_client.patch(
            "/api/admin/modules/study.personal_cards/",
            {"is_enabled": False},
            format="json",
        )
        self.assertEqual(self.learner_client.get("/api/cards/").status_code, 200)
        create_card_blocked = self.learner_client.post(
            "/api/cards/",
            {
                "card_type": "vocabulary",
                "level": "N5",
                "lesson": "Bài 1",
                "front_text": "水",
                "meaning": "Nước",
            },
            format="json",
        )
        self.assertEqual(create_card_blocked.status_code, 403)

    def test_moderator_and_admin_can_manage_system_and_private_content(self):
        # Learner cannot edit system course/card/video
        self.assertEqual(
            self.learner_client.patch(
                f"/api/courses/{self.system_course.id}/",
                {"title": "Hack"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.learner_client.patch(
                f"/api/cards/{self.system_card.id}/",
                {"meaning": "Hack"},
                format="json",
            ).status_code,
            403,
        )

        # Moderator CAN update system content via both learner API (`can_manage`) and `/api/admin/*`
        mod_list = self.mod_client.get("/api/admin/courses/?scope=system")
        self.assertEqual(mod_list.status_code, 200)
        self.assertEqual(mod_list.data["total"], 1)
        self.assertTrue(mod_list.data["results"][0]["can_manage"])

        mod_patch = self.mod_client.patch(
            f"/api/admin/cards/{self.system_card.id}/",
            {"meaning": "Lời hứa / Cuộc hẹn"},
            format="json",
        )
        self.assertEqual(mod_patch.status_code, 200)
        self.system_card.refresh_from_db()
        self.assertEqual(self.system_card.meaning, "Lời hứa / Cuộc hẹn")

        # Admin creates system course & video, then deletes video
        new_course = self.admin_client.post(
            "/api/admin/courses/",
            {
                "title": "Khoá học Chuẩn N2",
                "level": "N2",
                "card_type": "grammar",
                "is_public": True,
                "as_system": True,
            },
            format="json",
        )
        self.assertEqual(new_course.status_code, 201)
        self.assertIsNone(new_course.data["created_by"])
        self.assertEqual(new_course.data["created_by_username"], "Hệ thống")

        del_vid = self.admin_client.delete(
            f"/api/admin/shadowing-videos/{self.system_video.id}/"
        )
        self.assertEqual(del_vid.status_code, 204)
        self.assertFalse(
            ShadowingVideo.objects.filter(pk=self.system_video.id).exists()
        )
        invalidate_roles_cache()
        invalidate_modules_cache()

    def test_per_role_module_visibility_via_modules_and_roles_apis(self):
        # 1. Restrict `shadowing` to moderator (admin is always kept automatically)
        res = self.admin_client.patch(
            "/api/admin/modules/shadowing/",
            {"allowed_roles": ["moderator"]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        subjects_by_slug = {s["slug"]: s for s in res.data["available_roles"]}
        self.assertIsNone(subjects_by_slug["guest"]["user_count"])
        self.assertGreaterEqual(subjects_by_slug["admin"]["user_count"], 1)
        shadowing_cfg = res.data["modules_map"]["shadowing"]
        self.assertEqual(shadowing_cfg["allowed_roles"], ["admin", "moderator"])
        # Child module inherits parent's role restriction
        self.assertEqual(
            res.data["modules_map"]["shadowing.pronunciation"]["allowed_roles"],
            ["admin", "moderator"],
        )

        # Guest & Learner are blocked with module_restricted_for_role; Moderator & Admin pass
        anon_vid = self.anon_client.get("/api/shadowing/videos/")
        self.assertEqual(anon_vid.status_code, 403)
        self.assertEqual(anon_vid.data["code"], "module_restricted_for_role")

        learner_vid = self.learner_client.get("/api/shadowing/videos/")
        self.assertEqual(learner_vid.status_code, 403)
        self.assertEqual(learner_vid.data["code"], "module_restricted_for_role")

        self.assertEqual(self.mod_client.get("/api/shadowing/videos/").status_code, 200)
        self.assertEqual(self.admin_client.get("/api/shadowing/videos/").status_code, 200)

        # Resetting `shadowing` back to None restores access for all roles & guests
        reset_res = self.admin_client.patch(
            "/api/admin/modules/shadowing/",
            {"allowed_roles": None},
            format="json",
        )
        self.assertEqual(reset_res.status_code, 200)
        self.assertIsNone(reset_res.data["modules_map"]["shadowing"]["allowed_roles"])
        self.assertEqual(self.learner_client.get("/api/shadowing/videos/").status_code, 200)

        # 2. Configure `visible_modules` directly from Role API (create custom role + update learner)
        vip_role_res = self.admin_client.post(
            "/api/admin/roles/",
            {
                "name": "Học viên Cơ bản",
                "slug": "basic-tier",
                "permissions": [],
                "visible_modules": ["courses", "study.cards"],
            },
            format="json",
        )
        self.assertEqual(vip_role_res.status_code, 201)
        vip_role_id = vip_role_res.data["id"]
        self.assertEqual(
            vip_role_res.data["visible_modules"],
            ["courses", "study.cards"],
        )

        # Assign learner_user to `basic-tier` -> can access courses/cards, blocked from shadowing
        self.admin_client.patch(
            f"/api/admin/users/{self.learner_user.id}/",
            {"role_slug": "basic-tier"},
            format="json",
        )
        self.assertEqual(self.learner_client.get("/api/courses/").status_code, 200)
        self.assertEqual(self.learner_client.get("/api/cards/").status_code, 200)
        self.assertEqual(
            self.learner_client.get("/api/shadowing/videos/").status_code, 403
        )
        # Meanwhile moderator & guest still see shadowing because only `basic-tier` unchecked it
        self.assertEqual(self.mod_client.get("/api/shadowing/videos/").status_code, 200)
        self.assertEqual(self.anon_client.get("/api/shadowing/videos/").status_code, 200)

        # Deleting `basic-tier` cleans up `allowed_roles` back to None (unrestricted)
        del_role = self.admin_client.delete(f"/api/admin/roles/{vip_role_id}/")
        self.assertEqual(del_role.status_code, 204)
        pub_cfg = self.anon_client.get("/api/system/public-config/")
        self.assertIsNone(pub_cfg.data["modules"]["shadowing"]["allowed_roles"])
        self.assertTrue(AppModuleConfig.objects.filter(key="shadowing").exists())
        self.assertEqual(Role.objects.filter(slug="admin").first().permissions, ALL_PERMISSION_CODES)

    def test_granular_module_actions_enforced_per_endpoint(self):
        role_res = self.admin_client.post(
            "/api/admin/roles/",
            {
                "name": "Trợ lý Kiểm duyệt",
                "slug": "sub-reviewer",
                "permissions": [
                    "admin.access",
                    "users.view",
                    "users.reset_password",
                    "cards.view_all",
                    "cards.edit",
                    "modules.assign_roles",
                ],
            },
            format="json",
        )
        self.assertEqual(role_res.status_code, 201)

        reviewer = User.objects.create_user(
            username="sub_rev",
            email="sub_rev@example.com",
            password="StrongPassword123!",
            role_id=role_res.data["id"],
        )
        rev_client = APIClient()
        rev_tok, _ = Token.objects.get_or_create(user=reviewer)
        rev_client.credentials(HTTP_AUTHORIZATION=f"Token {rev_tok.key}")

        # Users module: can view + reset password, CANNOT create / lock / delete
        self.assertEqual(rev_client.get("/api/admin/users/").status_code, 200)
        self.assertEqual(
            rev_client.post(
                f"/api/admin/users/{self.learner_user.id}/reset-password/",
                {"password": "ResetByReviewer123!"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(
            rev_client.post(
                "/api/admin/users/",
                {
                    "username": "nope_u",
                    "email": "nope_u@example.com",
                    "password": "StrongPassword123!",
                },
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            rev_client.post(
                f"/api/admin/users/{self.learner_user.id}/toggle-active/"
            ).status_code,
            403,
        )
        self.assertEqual(
            rev_client.delete(f"/api/admin/users/{self.learner_user.id}/").status_code,
            403,
        )

        # Cards module: can view_all + edit, CANNOT create or delete
        cards_list = rev_client.get("/api/admin/cards/")
        self.assertEqual(cards_list.status_code, 200)
        card_item = cards_list.data["results"][0]
        self.assertTrue(card_item["can_edit"])
        self.assertFalse(card_item["can_delete"])

        self.assertEqual(
            rev_client.patch(
                f"/api/cards/{self.system_card.id}/",
                {"meaning": "Đã hiệu đính"},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(
            rev_client.delete(f"/api/cards/{self.system_card.id}/").status_code,
            403,
        )
        self.assertEqual(
            rev_client.delete(f"/api/admin/cards/{self.system_card.id}/").status_code,
            403,
        )
        self.assertEqual(
            rev_client.post(
                "/api/admin/cards/",
                {
                    "card_type": "vocabulary",
                    "level": "N5",
                    "lesson": "Bài 1",
                    "front_text": "火",
                    "meaning": "Lửa",
                },
                format="json",
            ).status_code,
            403,
        )

        # Modules: can assign_roles, CANNOT toggle is_enabled
        self.assertEqual(
            rev_client.patch(
                "/api/admin/modules/courses/",
                {"allowed_roles": ["moderator", "learner"]},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(
            rev_client.patch(
                "/api/admin/modules/courses/",
                {"is_enabled": False},
                format="json",
            ).status_code,
            403,
        )

    def test_aligned_module_names_and_view_own_action_enforcement(self):
        expected_names = {
            "courses": "Khoá học",
            "study.cards": "Học thẻ",
            "study.personal_cards": "Bộ thẻ của tôi",
            "shadowing": "Luyện Shadowing",
        }
        for key, label in expected_names.items():
            mod = AppModuleConfig.objects.get(key=key)
            self.assertEqual(mod.name, label)

        role_res = self.admin_client.post(
            "/api/admin/roles/",
            {
                "name": "Học viên Chỉ xem",
                "slug": "view-only-tier",
                "permissions": ["cards.view"],
                "visible_modules": ["study.cards"],
            },
            format="json",
        )
        self.assertEqual(role_res.status_code, 201)
        role_id = role_res.data["id"]

        user = User.objects.create_user(
            username="view_only_u",
            email="view_only_u@example.com",
            password="StrongPassword123!",
            role_id=role_id,
        )
        own_course = Course.objects.create(
            title="Khoá học riêng của Học viên",
            level="N4",
            card_type="vocabulary",
            is_public=False,
            created_by=user,
        )
        client = APIClient()
        tok, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f"Token {tok.key}")

        # Missing `courses.view`, `personal_cards.view`, `shadowing.view` -> 403
        self.assertEqual(client.get("/api/courses/").status_code, 403)
        self.assertEqual(client.get("/api/cards/").status_code, 200)
        self.assertEqual(client.get("/api/cards/?mine=true").status_code, 403)
        self.assertEqual(client.get("/api/shadowing/videos/").status_code, 403)

        # Grant ONLY `courses.view` (no create_own, edit_own, delete_own)
        self.admin_client.patch(
            f"/api/admin/roles/{role_id}/",
            {"permissions": ["courses.view"]},
            format="json",
        )
        self.assertEqual(client.get("/api/cards/").status_code, 403)
        list_res = client.get("/api/courses/?mine=true")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.data), 1)
        self.assertFalse(list_res.data[0]["can_edit"])
        self.assertFalse(list_res.data[0]["can_delete"])

        self.assertEqual(
            client.post(
                "/api/courses/",
                {"title": "Blocked Create", "level": "N5", "card_type": "vocabulary"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            client.patch(
                f"/api/courses/{own_course.id}/",
                {"title": "Blocked Edit"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            client.delete(f"/api/courses/{own_course.id}/").status_code,
            403,
        )

    def test_module_endpoint_updates_role_actions_atomically_and_rejects_cross_module_perms(self):
        limited_role_res = self.admin_client.post(
            "/api/admin/roles/",
            {
                "name": "Nhóm Tùy biến",
                "slug": "custom-courses-tier",
                "permissions": ["cards.view", "shadowing.view"],
                "visible_modules": ["study.cards", "shadowing"],
            },
            format="json",
        )
        self.assertEqual(limited_role_res.status_code, 201)

        # Reject cross-module permission injection (`roles.edit` cannot be assigned on `/modules/courses/`)
        bad_res = self.admin_client.patch(
            "/api/admin/modules/courses/",
            {"role_permissions": {"learner": ["courses.view", "roles.edit"]}},
            format="json",
        )
        self.assertEqual(bad_res.status_code, 400)

        # Valid atomic update: give learner `courses.view` + `courses.create_own` only, deny `custom-courses-tier`
        ok_res = self.admin_client.patch(
            "/api/admin/modules/courses/",
            {
                "allowed_roles": ["guest", "admin", "moderator", "learner"],
                "role_permissions": {
                    "learner": ["courses.view", "courses.create_own"],
                    "custom-courses-tier": [],
                },
            },
            format="json",
        )
        self.assertEqual(ok_res.status_code, 200)
        self.assertIn("courses", ok_res.data["action_catalog_by_key"])
        self.assertEqual(
            ok_res.data["module_view_perm_by_key"]["courses"],
            "courses.view",
        )

        learner_role = Role.objects.get(slug="learner")
        self.assertIn("courses.view", learner_role.permissions)
        self.assertIn("courses.create_own", learner_role.permissions)
        self.assertNotIn("courses.edit_own", learner_role.permissions)
        self.assertNotIn("courses.delete_own", learner_role.permissions)
        # Unrelated module permissions remain untouched
        self.assertIn("cards.view", learner_role.permissions)
        self.assertIn("shadowing.view", learner_role.permissions)

        courses_cfg = AppModuleConfig.objects.get(key="courses")
        self.assertNotIn("custom-courses-tier", courses_cfg.allowed_roles or [])
        self.assertIn("learner", courses_cfg.allowed_roles or [])


class BackendI18nAndPreferredLanguageTests(TestCase):
    def setUp(self):
        cache.clear()
        ensure_default_rbac_and_modules()
        self.learner = User.objects.create_user(
            username="i18n_learner",
            email="i18n_learner@example.com",
            password="StrongPassword123!",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.learner)

    def test_preferred_language_get_and_patch_on_current_user(self):
        get_res = self.client.get("/api/auth/me/")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data["preferred_language"], "vi")

        patch_en = self.client.patch(
            "/api/auth/me/",
            {"preferred_language": "en"},
            format="json",
        )
        self.assertEqual(patch_en.status_code, 200)
        self.assertEqual(patch_en.data["preferred_language"], "en")
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.preferred_language, "en")

        patch_invalid = self.client.patch(
            "/api/auth/me/",
            {"preferred_language": "fr"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(patch_invalid.status_code, 400)
        self.assertIn("preferred_language", patch_invalid.data)
        self.assertIn("Invalid language", str(patch_invalid.data["preferred_language"][0]))

        patch_vi = self.client.patch(
            "/api/auth/me/",
            {"preferred_language": "vi"},
            format="json",
        )
        self.assertEqual(patch_vi.status_code, 200)
        self.assertEqual(patch_vi.data["preferred_language"], "vi")

    def test_accept_language_translates_rbac_and_permission_errors(self):
        vi_res = self.client.get(
            "/api/admin/users/",
            HTTP_ACCEPT_LANGUAGE="vi",
        )
        self.assertEqual(vi_res.status_code, 403)
        self.assertIn("quyền", str(vi_res.data.get("detail", "")).lower())

        en_res = self.client.get(
            "/api/admin/users/",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(en_res.status_code, 403)
        self.assertIn("permission", str(en_res.data.get("detail", "")).lower())


class AdminSystemAppearanceTests(TestCase):
    def setUp(self):
        cache.clear()
        invalidate_appearance_cache()
        ensure_default_rbac_and_modules()
        admin_role = Role.objects.get(slug="admin")
        mod_role = Role.objects.get(slug="moderator")
        learner_role = Role.objects.get(slug="learner")

        self.admin_user = User.objects.create_user(
            username="theme_admin",
            email="theme_admin@example.com",
            password="StrongPassword123!",
            role=admin_role,
            is_staff=True,
        )
        self.mod_user = User.objects.create_user(
            username="theme_mod",
            email="theme_mod@example.com",
            password="StrongPassword123!",
            role=mod_role,
        )
        self.learner_user = User.objects.create_user(
            username="theme_learner",
            email="theme_learner@example.com",
            password="StrongPassword123!",
            role=learner_role,
        )

        self.anon_client = APIClient()
        self.admin_client = APIClient()
        self.mod_client = APIClient()
        self.learner_client = APIClient()

        for user_obj, client in [
            (self.admin_user, self.admin_client),
            (self.mod_user, self.mod_client),
            (self.learner_user, self.learner_client),
        ]:
            tok, _ = Token.objects.get_or_create(user=user_obj)
            client.credentials(HTTP_AUTHORIZATION=f"Token {tok.key}")

    def test_public_config_defaults_and_admin_update_flow(self):
        # Default before any row is created
        pub_res = self.anon_client.get("/api/system/public-config/")
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(
            pub_res.data["appearance"]["primary_color"],
            DEFAULT_PRIMARY_COLOR,
        )
        self.assertEqual(
            pub_res.data["appearance"]["default_primary_color"],
            DEFAULT_PRIMARY_COLOR,
        )

        # Learner and moderator cannot inspect or update admin appearance
        self.assertEqual(self.learner_client.get("/api/admin/appearance/").status_code, 403)
        self.assertEqual(self.mod_client.get("/api/admin/appearance/").status_code, 403)
        self.assertEqual(
            self.mod_client.patch(
                "/api/admin/appearance/",
                {"primary_color": "#0F766E"},
                format="json",
            ).status_code,
            403,
        )

        # Reject invalid hex color
        bad_res = self.admin_client.patch(
            "/api/admin/appearance/",
            {"primary_color": "blue"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(bad_res.status_code, 400)
        self.assertIn("primary_color", bad_res.data)

        # Update valid hex (lowercase gets normalized to uppercase)
        ok_res = self.admin_client.patch(
            "/api/admin/appearance/",
            {"primary_color": "#0f766e"},
            format="json",
        )
        self.assertEqual(ok_res.status_code, 200)
        self.assertEqual(ok_res.data["primary_color"], "#0F766E")
        self.assertEqual(ok_res.data["updated_by_username"], "theme_admin")

        # Public config reflects updated primary color immediately
        pub_after = self.anon_client.get("/api/system/public-config/")
        self.assertEqual(pub_after.status_code, 200)
        self.assertEqual(pub_after.data["appearance"]["primary_color"], "#0F766E")

        # Persists in DB and writes audit log
        cfg = AppSystemConfig.objects.get(key="default")
        self.assertEqual(cfg.primary_color, "#0F766E")
        audit = AdminAuditLog.objects.filter(action="system.theme_update").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.target_type, "system")
        self.assertEqual(audit.details["prev_primary_color"], DEFAULT_PRIMARY_COLOR)
        self.assertEqual(audit.details["primary_color"], "#0F766E")

        # Reset back to default
        reset_res = self.admin_client.patch(
            "/api/admin/appearance/",
            {"primary_color": DEFAULT_PRIMARY_COLOR},
            format="json",
        )
        self.assertEqual(reset_res.status_code, 200)
        self.assertEqual(reset_res.data["primary_color"], DEFAULT_PRIMARY_COLOR)

