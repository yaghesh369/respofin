from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "owner",
        "segment_label",
        "active_product",
        "is_active",
        "created_at",
    )
    search_fields = ("name", "email", "owner__username")
    list_filter = ("segment_label", "is_active", "active_product")
