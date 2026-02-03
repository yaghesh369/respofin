from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        exclude = ("owner",)

    def create(self, validated_data):
        request = self.context["request"]
        return Customer.objects.create(
            owner=request.user,
            **validated_data
        )
    
class CustomerCSVSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    age = serializers.IntegerField(required=False)
    income = serializers.FloatField(required=False)
    credit_score = serializers.IntegerField(required=False)
    active_product = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

