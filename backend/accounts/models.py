from django.db import models
from django.contrib.auth.models import User
import uuid

class Invite(models.Model):
    email = models.EmailField(unique=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email
