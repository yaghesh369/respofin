from django.db import models
from customers.models import Customer

class Recommendation(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="recommendations"
    )
    segment_label = models.IntegerField()
    recommended_products = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("customer", "segment_label")

    def __str__(self):
        return f"Recommendation for {self.customer.name}"
