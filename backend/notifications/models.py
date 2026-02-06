from django.db import models
from customers.models import Customer


class Notification(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    subject = models.CharField(max_length=255)
    message = models.TextField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="draft"
    )

    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer.email} | {self.status}"
