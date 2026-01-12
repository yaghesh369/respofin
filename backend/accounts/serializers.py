from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Invite

class RegisterSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(min_length=8)

    def validate(self, data):
        try:
            invite = Invite.objects.get(token=data["token"], is_used=False)
        except Invite.DoesNotExist:
            raise serializers.ValidationError("Invalid or used invite token")

        data["invite"] = invite
        return data

    def create(self, validated_data):
        invite = validated_data["invite"]

        user = User.objects.create_user(
            username=invite.email,
            email=invite.email,
            password=validated_data["password"],
        )

        invite.is_used = True
        invite.save()

        return user
