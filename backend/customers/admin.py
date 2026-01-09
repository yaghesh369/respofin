from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "email",
        "age",
        "income",
        "credit_score",
        "segment_label",
        "created_at",
    )
    search_fields = ("name", "email")
    list_filter = ("segment_label", "gender")
