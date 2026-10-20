from django.conf import settings
from django.db import models
from django.db.models import Min, Q


class CardQuerySet(models.QuerySet):
    def visible_to(self, user):
        if user and user.is_authenticated:
            return self.filter(Q(is_public=True) | Q(created_by=user))
        return self.filter(is_public=True)

    def by_type(self, card_type: str):
        if not card_type:
            return self
        return self.filter(card_type=card_type.strip().lower())

    def grammar(self):
        return self.filter(card_type=Card.CardType.GRAMMAR)

    def by_level(self, level: str):
        if not level:
            return self
        return self.filter(level=level.strip().upper())

    def by_lesson(self, lesson: str):
        if not lesson:
            return self
        return self.filter(lesson__iexact=lesson.strip())

    def by_course(self, course_id):
        if not course_id:
            return self
        if hasattr(course_id, "pk"):
            course_id = course_id.pk
        cleaned = str(course_id).strip()
        if not cleaned:
            return self
        try:
            cid = int(cleaned)
        except (ValueError, TypeError):
            return self.none()
        if cid <= 0:
            return self.none()
        return self.filter(course_id=cid)

    def search(self, query: str):
        if not query:
            return self
        q = query.strip()
        return self.filter(
            Q(front_text__icontains=q)
            | Q(meaning__icontains=q)
            | Q(examples__icontains=q)
        )

    def distinct_lessons(self) -> list[str]:
        return list(
            self.exclude(lesson="")
            .values("lesson")
            .annotate(first_order=Min("display_order"))
            .order_by("first_order")
            .values_list("lesson", flat=True)
        )


class Card(models.Model):
    class CardType(models.TextChoices):
        GRAMMAR = "grammar", "Ngữ pháp"
        VOCABULARY = "vocabulary", "Từ vựng"
        KANJI = "kanji", "Hán tự (Kanji)"

    class JLPTLevel(models.TextChoices):
        N5 = "N5", "JLPT N5"
        N4 = "N4", "JLPT N4"
        N3 = "N3", "JLPT N3"
        N2 = "N2", "JLPT N2"
        N1 = "N1", "JLPT N1"

    course = models.ForeignKey(
        "Course",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cards",
        verbose_name="Khoá học",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cards",
        verbose_name="Người tạo",
    )
    is_public = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Công khai",
    )

    card_type = models.CharField(
        max_length=20,
        choices=CardType.choices,
        default=CardType.GRAMMAR,
        verbose_name="Loại thẻ",
    )
    level = models.CharField(
        max_length=5,
        choices=JLPTLevel.choices,
        default=JLPTLevel.N3,
        verbose_name="Cấp độ JLPT",
    )
    lesson = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Bài học",
    )
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Thứ tự hiển thị",
    )

    front_text = models.CharField(
        max_length=255,
        verbose_name="Mặt trước (Cấu trúc / Từ vựng / Kanji)",
    )
    meaning = models.TextField(
        blank=True,
        default="",
        verbose_name="Ý nghĩa",
    )
    conjugation = models.TextField(
        blank=True,
        default="",
        verbose_name="Cách chia / Cách đọc",
    )
    usage_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Cách dùng & Chú ý",
    )
    examples = models.TextField(
        blank=True,
        default="",
        verbose_name="Ví dụ minh họa",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Dữ liệu mở rộng",
    )
    source = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Nguồn tài liệu",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CardQuerySet.as_manager()

    class Meta:
        verbose_name = "Thẻ học"
        verbose_name_plural = "Danh sách thẻ học"
        ordering = ["display_order", "id"]
        indexes = [
            models.Index(
                fields=["card_type", "level", "display_order"],
                name="cards_type_level_order_idx",
            ),
            models.Index(
                fields=["card_type", "lesson"],
                name="cards_type_lesson_idx",
            ),
        ]

    @property
    def grammar(self) -> str:
        return self.front_text

    def __str__(self) -> str:
        return f"[{self.get_card_type_display()} - {self.level}] {self.front_text}"


class CourseQuerySet(models.QuerySet):
    def visible_to(self, user):
        if user and user.is_authenticated:
            return self.filter(Q(is_public=True) | Q(created_by=user))
        return self.filter(is_public=True)

    def by_level(self, level: str):
        if not level:
            return self
        return self.filter(level=level.strip().upper())

    def by_type(self, card_type: str):
        if not card_type:
            return self
        return self.filter(card_type=card_type.strip().lower())

    def search(self, query: str):
        if not query:
            return self
        q = query.strip()
        return self.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
        )


class Course(models.Model):
    title = models.CharField(
        max_length=255,
        verbose_name="Tên khoá học / Bộ thẻ",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Mô tả khoá học",
    )
    level = models.CharField(
        max_length=5,
        choices=Card.JLPTLevel.choices,
        default=Card.JLPTLevel.N3,
        verbose_name="Cấp độ JLPT",
    )
    card_type = models.CharField(
        max_length=20,
        choices=Card.CardType.choices,
        default=Card.CardType.GRAMMAR,
        verbose_name="Loại thẻ",
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
        related_name="courses",
        verbose_name="Người tạo",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CourseQuerySet.as_manager()

    class Meta:
        verbose_name = "Khoá học / Bộ thẻ"
        verbose_name_plural = "Danh sách khoá học"
        ordering = ["-created_at", "id"]

    def __str__(self) -> str:
        return f"[{self.level} - {self.get_card_type_display()}] {self.title}"
