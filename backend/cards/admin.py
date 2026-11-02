from django.contrib import admin

from .models import Card, CardReview


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "display_order",
        "card_type",
        "level",
        "lesson",
        "front_text",
        "meaning",
    )
    list_filter = ("card_type", "level", "lesson")
    search_fields = ("front_text", "meaning", "examples")
    ordering = ("card_type", "level", "display_order", "id")


@admin.register(CardReview)
class CardReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "card",
        "state",
        "status",
        "interval",
        "ease_factor",
        "repetitions",
        "lapses",
        "due_at",
    )
    list_filter = ("state", "status")
    search_fields = ("user__username", "card__front_text")
    raw_id_fields = ("user", "card")

