from django.db import migrations
from django.db.models import Q

SEED_ROLES = [
    {
        "slug": "admin",
        "name": "Quản trị viên",
        "description": "Toàn quyền quản trị hệ thống, người dùng, vai trò, nội dung và bật tắt tính năng.",
        "permissions": [
            "admin.access",
            "system.status.view",
            "system.modules.manage",
            "system.audit.view",
            "users.view",
            "users.manage",
            "roles.manage",
            "courses.manage",
            "cards.manage",
            "shadowing.manage",
            "personal_content.create",
        ],
        "is_system": True,
    },
    {
        "slug": "moderator",
        "name": "Biên tập viên",
        "description": "Quản lý và biên tập toàn bộ khoá học, thẻ học và bài luyện Shadowing trên hệ thống.",
        "permissions": [
            "admin.access",
            "system.status.view",
            "courses.manage",
            "cards.manage",
            "shadowing.manage",
            "personal_content.create",
        ],
        "is_system": True,
    },
    {
        "slug": "learner",
        "name": "Học viên",
        "description": "Tham gia học tập, ôn tập ngắt quãng và tự tạo bộ thẻ cá nhân.",
        "permissions": [
            "personal_content.create",
        ],
        "is_system": True,
    },
]

SEED_MODULES = [
    {
        "key": "auth.registration",
        "name": "Đăng ký tài khoản mới",
        "group": "access",
        "parent_key": "",
        "display_order": 10,
        "description": "Cho phép người học mới tự tạo tài khoản trên ứng dụng.",
    },
    {
        "key": "auth.guest_mode",
        "name": "Học không cần đăng nhập",
        "group": "access",
        "parent_key": "",
        "display_order": 20,
        "description": "Cho phép khách truy cập học các nội dung công khai trước khi đăng nhập.",
    },
    {
        "key": "courses",
        "name": "Khoá học & Bộ thẻ",
        "group": "cards",
        "parent_key": "",
        "display_order": 30,
        "description": "Hiển thị trang danh sách khoá học và duyệt bộ thẻ học tập.",
    },
    {
        "key": "study.cards",
        "name": "Học thẻ & Tra cứu",
        "group": "cards",
        "parent_key": "",
        "display_order": 40,
        "description": "Học thẻ ghi nhớ, luyện nghe thẻ, bảng tra cứu và ôn tập ngắt quãng.",
    },
    {
        "key": "study.personal_cards",
        "name": "Bộ thẻ cá nhân & Tạo thẻ",
        "group": "cards",
        "parent_key": "",
        "display_order": 50,
        "description": "Cho phép học viên tự tạo khoá học mới, thêm thẻ học và quản lý bộ thẻ riêng.",
    },
    {
        "key": "shadowing",
        "name": "Luyện Shadowing",
        "group": "shadowing",
        "parent_key": "",
        "display_order": 60,
        "description": "Thư viện bài nghe và không gian luyện nghe nói tiếng Nhật theo ngữ cảnh.",
    },
    {
        "key": "shadowing.pronunciation",
        "name": "Chế độ Phát âm",
        "group": "shadowing",
        "parent_key": "shadowing",
        "display_order": 70,
        "description": "Thu âm giọng đọc và chấm điểm phát âm từng câu trong phòng luyện Shadowing.",
    },
    {
        "key": "shadowing.listening",
        "name": "Chế độ Luyện nghe điền từ",
        "group": "shadowing",
        "parent_key": "shadowing",
        "display_order": 80,
        "description": "Bài tập nghe câu và chọn từ còn thiếu trong phòng luyện Shadowing.",
    },
    {
        "key": "shadowing.exercise",
        "name": "Chế độ Bài tập trắc nghiệm",
        "group": "shadowing",
        "parent_key": "shadowing",
        "display_order": 90,
        "description": "Câu hỏi trắc nghiệm đọc hiểu nội dung bài Shadowing.",
    },
    {
        "key": "shadowing.extraction",
        "name": "Thêm bài & Trích xuất phụ đề",
        "group": "shadowing",
        "parent_key": "shadowing",
        "display_order": 100,
        "description": "Cho phép học viên thêm đường dẫn YouTube hoặc tải tệp âm thanh để tạo phụ đề.",
    },
]


def seed_rbac_and_modules(apps, schema_editor):
    Role = apps.get_model("users", "Role")
    User = apps.get_model("users", "User")
    AppModuleConfig = apps.get_model("users", "AppModuleConfig")

    roles_by_slug = {}
    for item in SEED_ROLES:
        role_obj, _ = Role.objects.get_or_create(
            slug=item["slug"],
            defaults={
                "name": item["name"],
                "description": item["description"],
                "permissions": item["permissions"],
                "is_system": item["is_system"],
            },
        )
        roles_by_slug[item["slug"]] = role_obj

    for mod in SEED_MODULES:
        AppModuleConfig.objects.get_or_create(
            key=mod["key"],
            defaults={
                "name": mod["name"],
                "group": mod["group"],
                "parent_key": mod["parent_key"],
                "display_order": mod["display_order"],
                "description": mod["description"],
                "is_enabled": True,
                "maintenance_note": "",
            },
        )

    admin_role = roles_by_slug["admin"]
    learner_role = roles_by_slug["learner"]

    admin_qs = User.objects.filter(Q(is_superuser=True) | Q(is_staff=True))
    if admin_qs.exists():
        admin_qs.filter(role__isnull=True).update(role=admin_role)
    elif not User.objects.filter(role=admin_role).exists():
        first_active = User.objects.filter(is_active=True).order_by("id").first()
        if first_active is not None:
            User.objects.filter(pk=first_active.pk).update(
                role=admin_role, is_staff=True
            )

    User.objects.filter(role__isnull=True).update(role=learner_role)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_role_appmoduleconfig_user_role_adminauditlog"),
    ]

    operations = [
        migrations.RunPython(
            seed_rbac_and_modules,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
