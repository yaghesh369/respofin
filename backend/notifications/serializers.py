from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = (
            "customer",
            "status",
            "sent_at",
            "error_message",
            "created_at",
        )
