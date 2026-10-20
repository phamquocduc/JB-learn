import json

from rest_framework import serializers

from shadowing.models import ShadowingVideo, UserShadowingProgress


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
            raise serializers.ValidationError("Thời điểm kết thúc (end) phải lớn hơn thời điểm bắt đầu (start).")
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
                f"correct_index ({correct_index}) vượt quá số lượng đáp án ({len(options)})."
            )
        return attrs


class ShadowingVideoListSerializer(serializers.ModelSerializer):
    """Compact summary serializer for video cards and library grids."""

    topic_display = serializers.CharField(source="get_topic_display", read_only=True)
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    media_file_url = serializers.SerializerMethodField()
    total_segments = serializers.IntegerField(read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)
    creator_username = serializers.CharField(source="created_by.username", read_only=True)

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
            "created_at",
            "updated_at",
        ]

    def get_media_file_url(self, obj):
        if obj.media_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.media_file.url)
            return obj.media_file.url
        return None


class ShadowingVideoDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with full transcript timeline and exercises."""

    topic_display = serializers.CharField(source="get_topic_display", read_only=True)
    level_display = serializers.CharField(source="get_level_display", read_only=True)
    media_file_url = serializers.SerializerMethodField()
    total_segments = serializers.IntegerField(read_only=True)
    total_exercises = serializers.IntegerField(read_only=True)
    creator_username = serializers.CharField(source="created_by.username", read_only=True)

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
            "total_segments",
            "total_exercises",
            "is_public",
            "created_by",
            "creator_username",
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
            "created_at",
            "updated_at",
        ]

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
                raise serializers.ValidationError("segments không phải là chuỗi JSON hợp lệ.") from exc
        if not isinstance(value, list):
            raise serializers.ValidationError("segments phải là danh sách phân đoạn.")
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
                raise serializers.ValidationError("exercises không phải là chuỗi JSON hợp lệ.") from exc
        if not isinstance(value, list):
            raise serializers.ValidationError("exercises phải là danh sách bài tập.")

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
