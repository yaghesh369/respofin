from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)

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
