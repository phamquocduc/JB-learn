from django.conf import settings
from django.db import models
from django.db.models import Q


class ShadowingVideoQuerySet(models.QuerySet):
    """Custom queryset providing visibility isolation and filters."""

    def visible_to(self, user):
        if user and user.is_authenticated:
            return self.filter(Q(is_public=True) | Q(created_by=user))
        return self.filter(is_public=True)

    def by_topic(self, topic: str):
        if not topic:
            return self
        return self.filter(topic=topic.strip().lower())

    def by_level(self, level: str):
        if not level:
            return self
        return self.filter(level=level.strip().upper())

    def by_media_source(self, media_source: str):
        if not media_source:
            return self
        return self.filter(media_source=media_source.strip().lower())


class ShadowingVideo(models.Model):
    """
    Video/Audio entity with timestamped segments and exercises for Japanese shadowing.
    """

    class Topic(models.TextChoices):
        LIFE = "life", "Đời sống & Thường nhật"
        BUSINESS = "business", "Công sở & Kinh doanh"
        CONVERSATION = "conversation", "Giao tiếp tự nhiên"
        NEWS = "news", "Tin tức & Xã hội"
        CULTURE = "culture", "Văn hoá & Đời sống Nhật"

    class Level(models.TextChoices):
        N5 = "N5", "JLPT N5"
        N4 = "N4", "JLPT N4"
        N3 = "N3", "JLPT N3"
        N2 = "N2", "JLPT N2"
        N1 = "N1", "JLPT N1"

    class MediaSource(models.TextChoices):
        YOUTUBE = "youtube", "YouTube"
        UPLOAD = "upload", "Tải lên tệp media"

    title = models.CharField(max_length=255, verbose_name="Tiêu đề video")
    description = models.TextField(blank=True, default="", verbose_name="Mô tả")
    topic = models.CharField(
        max_length=32,
        choices=Topic.choices,
        default=Topic.LIFE,
        db_index=True,
        verbose_name="Chủ đề",
    )
    level = models.CharField(
        max_length=5,
        choices=Level.choices,
        default=Level.N3,
        db_index=True,
        verbose_name="Cấp độ JLPT",
    )
    media_source = models.CharField(
        max_length=16,
        choices=MediaSource.choices,
        default=MediaSource.YOUTUBE,
        db_index=True,
        verbose_name="Nguồn media",
    )
    youtube_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Đường dẫn YouTube",
    )
    youtube_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        verbose_name="YouTube Video ID",
    )
    media_file = models.FileField(
        upload_to="shadowing_media/",
        blank=True,
        null=True,
        verbose_name="Tệp âm thanh / video tải lên",
    )
    thumbnail_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Ảnh bìa thu nhỏ",
    )
    duration_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name="Thời lượng (giây)",
    )
    segments = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Danh sách phân đoạn phụ đề",
    )
    exercises = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Danh sách bài tập tương tác",
    )
    is_public = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Công khai",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shadowing_videos",
        verbose_name="Người tạo",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Thời điểm tạo")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Cập nhật lần cuối")

    objects = ShadowingVideoQuerySet.as_manager()

    class Meta:
        db_table = "shadowing_video"
        ordering = ["-created_at"]
        verbose_name = "Video Shadowing"
        verbose_name_plural = "Danh sách Video Shadowing"
        indexes = [
            models.Index(fields=["topic", "level", "is_public"]),
            models.Index(fields=["created_by", "is_public"]),
            models.Index(fields=["media_source"]),
        ]

    def __str__(self):
        return f"[{self.level} - {self.topic}] {self.title}"

    @property
    def total_segments(self) -> int:
        return len(self.segments) if isinstance(self.segments, list) else 0

    @property
    def total_exercises(self) -> int:
        return len(self.exercises) if isinstance(self.exercises, list) else 0


class UserShadowingProgress(models.Model):
    """Tracks learner progress, current sentence, and rating per video."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shadowing_progress",
        verbose_name="Người học",
    )
    video = models.ForeignKey(
        ShadowingVideo,
        on_delete=models.CASCADE,
        related_name="learner_progress",
        verbose_name="Video Shadowing",
    )
    current_segment_index = models.PositiveIntegerField(
        default=0,
        verbose_name="Vị trí phân đoạn đang học",
    )
    ratings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Đánh giá mức độ ghi nhớ theo phân đoạn",
    )
    last_studied_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Thời điểm học gần nhất",
    )

    class Meta:
        db_table = "shadowing_user_progress"
        unique_together = [("user", "video")]
        verbose_name = "Tiến độ Shadowing người dùng"
        verbose_name_plural = "Danh sách tiến độ Shadowing người dùng"

    def __str__(self):
        return f"{self.user} - {self.video_id} (segment {self.current_segment_index})"
