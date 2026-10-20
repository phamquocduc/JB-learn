from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import Card, Course

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
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
            "date_joined",
        ]
        read_only_fields = fields


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
            raise serializers.ValidationError("Tên người dùng không được để trống.")
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("Tên người dùng này đã tồn tại.")
        return v

    def validate_email(self, value: str) -> str:
        v = value.strip().lower()
        if not v:
            raise serializers.ValidationError("Email không được để trống.")
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("Email này đã được sử dụng.")
        return v

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError("Mật khẩu phải chứa ít nhất 8 ký tự.")
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data: dict) -> User:
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
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
                "Vui lòng nhập tên đăng nhập/email và mật khẩu."
            )

        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()

        if not user or not user.check_password(password):
            raise serializers.ValidationError(
                "Tên đăng nhập/email hoặc mật khẩu không chính xác."
            )

        if not user.is_active:
            raise serializers.ValidationError("Tài khoản đã bị khóa.")

        token, _ = Token.objects.get_or_create(user=user)
        attrs["user"] = user
        attrs["token"] = token.key
        return attrs


class CourseSerializer(serializers.ModelSerializer):
    card_count = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "level",
            "card_type",
            "is_public",
            "card_count",
            "created_by",
            "created_by_username",
            "is_owner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "card_count",
            "created_by",
            "created_by_username",
            "is_owner",
            "created_at",
            "updated_at",
        ]

    def get_card_count(self, obj: Course) -> int:
        if hasattr(obj, "card_count"):
            return obj.card_count
        return obj.cards.count()

    def get_created_by_username(self, obj: Course) -> str:
        return obj.created_by.username if obj.created_by else "Hệ thống"

    def get_is_owner(self, obj: Course) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )


class CardSerializer(serializers.ModelSerializer):
    grammar = serializers.CharField(source="front_text", read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Card
        fields = [
            "id",
            "course",
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
            "source",
            "is_public",
            "created_by",
            "is_owner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "grammar",
            "created_by",
            "is_owner",
            "created_at",
            "updated_at",
        ]

    def get_is_owner(self, obj: Card) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )

    def validate_course(self, course: Course) -> Course:
        if course and not course.is_public:
            request = self.context.get("request")
            if (
                not request
                or not request.user.is_authenticated
                or course.created_by != request.user
            ):
                raise serializers.ValidationError(
                    "Không thể thêm thẻ vào khoá học riêng tư của người khác."
                )
        return course
