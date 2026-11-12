import json

from django.utils import translation
from django.utils.translation import gettext as _
from rest_framework import serializers

from core.i18n import (
    apply_translated_fields,
    is_raw_content_request,
    merge_shadowing_translations,
    normalize_translations_input,
    resolve_request_language,
)
from shadowing.models import ShadowingVideo, UserShadowingProgress
from users.permissions import can_user_delete_object, can_user_edit_object


class TranscriptSegmentSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    start = serializers.FloatField(required=True, min_value=0.0)
    end = serializers.FloatField(required=True, min_value=0.0)
    text = serializers.CharField(required=True, allow_blank=False)
    ruby_text = serializers.CharField(required=False, allow_blank=True, default="")
    meaning = serializers.CharField(required=False, allow_blank=True, default="")
    words = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        if attrs["end"] < attrs["start"]:
            raise serializers.ValidationError(
                _("Thời điểm kết thúc (end) phải lớn hơn thời điểm bắt đầu (start).")
            )
        return attrs


class ShadowingExerciseSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    type = serializers.ChoiceField(
        choices=["multiple_choice", "cloze", "comprehension", "vocabulary", "grammar"],
        default="comprehension",
    )
    segment_id = serializers.IntegerField(required=False, default=1)
    question = serializers.CharField(required=True, allow_blank=False)
    options = serializers.ListField(
        child=serializers.CharField(),
        min_length=2,
        max_length=6,
        required=True,
    )
    correct_index = serializers.IntegerField(required=True, min_value=0)
    explanation = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        options = attrs.get("options", [])
        correct_index = attrs.get("correct_index", 0)
        if correct_index >= len(options):
            raise serializers.ValidationError(
                _(
                    "correct_index (%(index)s) vượt quá số lượng đáp án (%(total)s)."
                )
                % {"index": correct_index, "total": len(options)}
            )
        return attrs


class _ShadowingBaseSerializerMixin(serializers.ModelSerializer):
    """Shared localized helpers for Shadowing list and detail serializers."""

    topic_display = serializers.SerializerMethodField()

    def get_topic_display(self, obj) -> str:
        lang = resolve_request_language(self.context.get("request"))
        with translation.override(lang):
            return str(obj.get_topic_display())


class ShadowingVideoListSerializer(_ShadowingBaseSerializerMixin):
    """Compact summary serializer for video cards and library grids."""

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    media_file_url = serializers.SerializerMethodField()
    total_segments = serializers.IntegerField(read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)
    creator_username = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = ShadowingVideo
        fields = [
            "id",
            "title",
            "description",
            "topic",
            "topic_display",
            "level",
            "level_display",
            "media_source",
            "youtube_url",
            "youtube_id",
            "thumbnail_url",
            "media_file_url",
            "duration_seconds",
            "total_segments",
            "total_exercises",
            "is_public",
            "created_by",
            "creator_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "topic_display",
            "level_display",
            "total_segments",
            "total_exercises",
            "created_by",
            "creator_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
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

    def get_creator_username(self, obj) -> str:
        return obj.created_by.username if obj.created_by else str(_("Hệ thống"))

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )

    def get_can_edit(self, obj) -> bool:
        request = self.context.get("request")
        return can_user_edit_object(getattr(request, "user", None), obj, "shadowing")

    def get_can_delete(self, obj) -> bool:
        request = self.context.get("request")
        return can_user_delete_object(getattr(request, "user", None), obj, "shadowing")

    def get_can_manage(self, obj) -> bool:
        return self.get_can_edit(obj) or self.get_can_delete(obj)

    def get_media_file_url(self, obj):
        if obj.media_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None


class ShadowingVideoDetailSerializer(_ShadowingBaseSerializerMixin):
    """Full detail serializer with full transcript timeline and exercises."""

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    media_file_url = serializers.SerializerMethodField()
    total_segments = serializers.IntegerField(read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)
    creator_username = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    translations = serializers.JSONField(required=False)

    class Meta:
        model = ShadowingVideo
        fields = [
            "id",
            "title",
            "description",
            "topic",
            "topic_display",
            "level",
            "level_display",
            "media_source",
            "youtube_url",
            "youtube_id",
            "media_file",
            "media_file_url",
            "thumbnail_url",
            "duration_seconds",
            "segments",
            "exercises",
            "translations",
            "total_segments",
            "total_exercises",
            "is_public",
            "created_by",
            "creator_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "topic_display",
            "level_display",
            "total_segments",
            "total_exercises",
            "created_by",
            "creator_username",
            "is_owner",
            "can_edit",
            "can_delete",
            "can_manage",
            "created_at",
            "updated_at",
        ]

    def validate_translations(self, value):
        if isinstance(value, str):
            val_str = value.strip()
            if not val_str:
                return {}
            try:
                value = json.loads(val_str)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(
                    _("translations không phải là chuỗi JSON hợp lệ.")
                ) from exc
        try:
            return normalize_translations_input(value)
        except ValueError as exc:
            raise serializers.ValidationError(
                _("translations phải là một đối tượng JSON hợp lệ.")
            ) from exc

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if is_raw_content_request(request):
            return data
        lang = resolve_request_language(request)
        include_source = bool(self.context.get("include_source") or data.get("can_edit"))
        return merge_shadowing_translations(
            data,
            instance,
            lang,
            include_source=include_source,
        )

    def get_creator_username(self, obj) -> str:
        return obj.created_by.username if obj.created_by else str(_("Hệ thống"))

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.created_by_id == request.user.id
        )

    def get_can_edit(self, obj) -> bool:
        request = self.context.get("request")
        return can_user_edit_object(getattr(request, "user", None), obj, "shadowing")

    def get_can_delete(self, obj) -> bool:
        request = self.context.get("request")
        return can_user_delete_object(getattr(request, "user", None), obj, "shadowing")

    def get_can_manage(self, obj) -> bool:
        return self.get_can_edit(obj) or self.get_can_delete(obj)

    def get_media_file_url(self, obj):
        if obj.media_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None

    def validate_segments(self, value):
        if isinstance(value, str):
            val_str = value.strip()
            if not val_str:
                return []
            try:
                value = json.loads(val_str)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(_("segments không phải là chuỗi JSON hợp lệ.")) from exc
        if not isinstance(value, list):
            raise serializers.ValidationError(_("segments phải là danh sách phân đoạn."))
        serializer = TranscriptSegmentSerializer(data=value, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def validate_exercises(self, value):
        if isinstance(value, str):
            val_str = value.strip()
            if not val_str:
                return []
            try:
                value = json.loads(val_str)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(_("exercises không phải là chuỗi JSON hợp lệ.")) from exc
        if not isinstance(value, list):
            raise serializers.ValidationError(_("exercises phải là danh sách bài tập."))

        normalized = []
        for item in value:
            if isinstance(item, dict):
                opts = item.get("options")
                c_idx = item.get("correct_index", 0)
                if isinstance(opts, list) and len(opts) > 6 and isinstance(c_idx, int) and 0 <= c_idx < 6:
                    item = {**item, "options": opts[:6]}
            normalized.append(item)

        serializer = ShadowingExerciseSerializer(data=normalized, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class UserShadowingProgressSerializer(serializers.ModelSerializer):
    """Serializer for tracking user study progress per video."""

    class Meta:
        model = UserShadowingProgress
        fields = [
            "id",
            "video",
            "current_segment_index",
            "ratings",
            "last_studied_at",
        ]
        read_only_fields = ["id", "last_studied_at"]
