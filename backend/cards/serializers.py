from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from core.i18n import (
    DEFAULT_LANGUAGE,
    apply_translated_fields,
    is_raw_content_request,
    normalize_translations_input,
    resolve_request_language,
)
from .anki import (
    format_interval_vi,
    get_interval_previews,
    is_card_due,
    normalize_rating,
)
from .models import Card, CardReview, Course
from users.permissions import can_user_delete_object, can_user_edit_object
from users.rbac import get_default_role_record, get_role_visible_modules

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role_slug = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    visible_modules = serializers.SerializerMethodField()
    can_access_admin = serializers.SerializerMethodField()
    preferred_language = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "role_slug",
            "role_name",
            "permissions",
            "visible_modules",
            "can_access_admin",
            "preferred_language",
            "date_joined",
        ]
        read_only_fields = fields

    def get_preferred_language(self, obj) -> str:
        return getattr(obj, "preferred_language", None) or DEFAULT_LANGUAGE

    def get_role_slug(self, obj) -> str:
        return obj.get_effective_role_slug()

    def get_role_name(self, obj) -> str:
        return obj.get_effective_role_name()

    def get_permissions(self, obj) -> list:
        return obj.get_permission_codes()

    def get_visible_modules(self, obj) -> list:
        return get_role_visible_modules(obj.get_effective_role_slug())

    def get_can_access_admin(self, obj) -> bool:
        return obj.has_perm_code("admin.access")


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_username(self, value: str) -> str:
        v = value.strip()
        if not v:
            raise serializers.ValidationError(_("Tên người dùng không được để trống."))
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError(_("Tên người dùng này đã tồn tại."))
        return v

    def validate_email(self, value: str) -> str:
        v = value.strip().lower()
        if not v:
            raise serializers.ValidationError(_("Email không được để trống."))
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(_("Email này đã được sử dụng."))
        return v

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError(_("Mật khẩu phải chứa ít nhất 8 ký tự."))
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data: dict) -> User:
        learner_role = get_default_role_record("learner")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            role=learner_role,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs: dict) -> dict:
        identifier = attrs.get("username", "").strip()
        password = attrs.get("password", "")

        if not identifier or not password:
            raise serializers.ValidationError(
                _("Vui lòng nhập tên đăng nhập/email và mật khẩu.")
            )

        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()

        if not user or not user.check_password(password):
            raise serializers.ValidationError(
                _("Tên đăng nhập/email hoặc mật khẩu không chính xác.")
            )

        if not user.is_active:
            raise serializers.ValidationError(_("Tài khoản đã bị khóa."))

        token, _created = Token.objects.get_or_create(user=user)
        attrs["user"] = user
        attrs["token"] = token.key
        return attrs


class CourseSerializer(serializers.ModelSerializer):
    card_count = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    translations = serializers.JSONField(required=False)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "translations",
            "level",
            "card_type",
            "is_public",
            "card_count",
            "created_by",
            "created_by_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "card_count",
            "created_by",
            "created_by_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]

    def validate_translations(self, value) -> dict:
        try:
            return normalize_translations_input(value)
        except ValueError as exc:
            raise serializers.ValidationError(
                _("Trường translations phải là một đối tượng JSON hợp lệ.")
            ) from exc

    def to_representation(self, instance: Course) -> dict:
        data = super().to_representation(instance)
        request = self.context.get("request")
        if is_raw_content_request(request):
            return data
        lang = resolve_request_language(request)
        include_source = bool(self.context.get("include_source") or data.get("can_edit"))
        return apply_translated_fields(
            data,
            instance,
            lang,
            ("title", "description"),
            include_source=include_source,
        )

    def get_card_count(self, obj: Course) -> int:
        if hasattr(obj, "card_count"):
            return obj.card_count
        return obj.cards.count()

    def get_created_by_username(self, obj: Course) -> str:
        return obj.created_by.username if obj.created_by else str(_("Hệ thống"))

    def get_is_owner(self, obj: Course) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )

    def get_can_edit(self, obj: Course) -> bool:
        request = self.context.get("request")
        return can_user_edit_object(getattr(request, "user", None), obj, "courses")

    def get_can_delete(self, obj: Course) -> bool:
        request = self.context.get("request")
        return can_user_delete_object(getattr(request, "user", None), obj, "courses")

    def get_can_manage(self, obj: Course) -> bool:
        return self.get_can_edit(obj) or self.get_can_delete(obj)


class CardSerializer(serializers.ModelSerializer):
    grammar = serializers.CharField(source="front_text", read_only=True)
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    translations = serializers.JSONField(required=False)

    class Meta:
        model = Card
        fields = [
            "id",
            "course",
            "course_title",
            "card_type",
            "level",
            "lesson",
            "display_order",
            "front_text",
            "grammar",
            "meaning",
            "conjugation",
            "usage_notes",
            "examples",
            "extra_data",
            "translations",
            "source",
            "is_public",
            "created_by",
            "created_by_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "course_title",
            "grammar",
            "created_by",
            "created_by_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]

    def validate_translations(self, value) -> dict:
        try:
            return normalize_translations_input(value)
        except ValueError as exc:
            raise serializers.ValidationError(
                _("Trường translations phải là một đối tượng JSON hợp lệ.")
            ) from exc

    def to_representation(self, instance: Card) -> dict:
        data = super().to_representation(instance)
        request = self.context.get("request")
        if is_raw_content_request(request):
            return data
        lang = resolve_request_language(request)
        include_source = bool(self.context.get("include_source") or data.get("can_edit"))
        return apply_translated_fields(
            data,
            instance,
            lang,
            ("meaning", "conjugation", "usage_notes", "examples"),
            include_source=include_source,
        )

    def get_created_by_username(self, obj: Card) -> str:
        return obj.created_by.username if obj.created_by else str(_("Hệ thống"))

    def get_course_title(self, obj: Card) -> str:
        if not obj.course:
            return ""
        request = self.context.get("request")
        if not is_raw_content_request(request):
            lang = resolve_request_language(request)
            if lang != DEFAULT_LANGUAGE:
                trans = (obj.course.translations or {}).get(lang)
                if isinstance(trans, dict):
                    t_title = trans.get("title")
                    if isinstance(t_title, str) and t_title.strip():
                        return t_title
        return obj.course.title

    def get_is_owner(self, obj: Card) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )

    def get_can_edit(self, obj: Card) -> bool:
        request = self.context.get("request")
        return can_user_edit_object(getattr(request, "user", None), obj, "cards")

    def get_can_delete(self, obj: Card) -> bool:
        request = self.context.get("request")
        return can_user_delete_object(getattr(request, "user", None), obj, "cards")

    def get_can_manage(self, obj: Card) -> bool:
        return self.get_can_edit(obj) or self.get_can_delete(obj)

    def validate_course(self, course: Course) -> Course:
        if course and not course.is_public:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            has_manage = bool(
                user
                and user.is_authenticated
                and hasattr(user, "has_perm_code")
                and any(
                    user.has_perm_code(code)
                    for code in ("courses.edit", "cards.create", "cards.edit")
                )
            )
            if not has_manage and (
                not user or not user.is_authenticated or course.created_by != user
            ):
                raise serializers.ValidationError(
                    _("Không thể thêm thẻ vào khoá học riêng tư của người khác.")
                )
        return course


class CardReviewSerializer(serializers.ModelSerializer):
    is_due = serializers.SerializerMethodField()
    interval_display = serializers.SerializerMethodField()
    next_intervals = serializers.SerializerMethodField()

    class Meta:
        model = CardReview
        fields = [
            "id",
            "card",
            "state",
            "status",
            "step_index",
            "interval",
            "learning_minutes",
            "ease_factor",
            "repetitions",
            "lapses",
            "due_at",
            "last_reviewed_at",
            "last_rating",
            "is_due",
            "interval_display",
            "next_intervals",
            "updated_at",
        ]
        read_only_fields = fields

    def get_is_due(self, obj: CardReview) -> bool:
        return is_card_due(obj.to_srs_dict())

    def get_interval_display(self, obj: CardReview) -> str:
        if obj.state == CardReview.ReviewState.NEW:
            return str(_("Chưa học"))
        return format_interval_vi(obj.state, obj.interval, obj.learning_minutes)

    def get_next_intervals(self, obj: CardReview) -> dict:
        return get_interval_previews(obj.to_srs_dict())


class CardReviewInputSerializer(serializers.Serializer):
    rating = serializers.JSONField(required=True)
    current_state = serializers.DictField(required=False, allow_null=True)

    def validate_rating(self, value) -> int:
        try:
            return normalize_rating(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

