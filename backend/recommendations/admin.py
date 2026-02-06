from django.contrib import admin
from .models import Recommendation

@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "segment_label",
        "created_at",
    )
    list_filter = ("segment_label",)
