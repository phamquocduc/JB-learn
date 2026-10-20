from django.contrib import admin

from .models import Card


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
