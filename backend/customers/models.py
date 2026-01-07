from django.db import models

# Create your models here.
class Customer(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    age = models.IntegerField()
    gender = models.CharField(max_length=10)
    income = models.FloatField()
    credit_score = models.IntegerField()
    account_balance = models.FloatField()
    transaction_frequency = models.IntegerField()
    existing_products = models.TextField()
    segment_label = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
