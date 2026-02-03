from django.db import models
from django.contrib.auth.models import User

class Customer(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customers"
    )

    # Basic identity
    name = models.CharField(max_length=255)
    email = models.EmailField()

    # ML features
    age = models.PositiveIntegerField(null=True, blank=True)
    income = models.FloatField(null=True, blank=True)
    credit_score = models.IntegerField(null=True, blank=True)

    # Business context
    active_product = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    # ML output
    segment_label = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("owner", "email")

    def __str__(self):
        return f"{self.name} ({self.owner.username})"
