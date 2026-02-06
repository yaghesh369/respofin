from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from customers.models import Customer
from .services import generate_recommendation
from .serializers import RecommendationSerializer


class RecommendSingleCustomerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, customer_id):
        customer = Customer.objects.filter(
            id=customer_id,
            owner=request.user
        ).first()

        if not customer:
            return Response(
                {"error": "Customer not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            rec = generate_recommendation(customer)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            RecommendationSerializer(rec).data,
            status=status.HTTP_200_OK
        )


class RecommendBulkCustomersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        customer_ids = request.data.get("customer_ids", [])

        if not isinstance(customer_ids, list):
            return Response(
                {"error": "customer_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        recommended = 0
        skipped = 0

        customers = Customer.objects.filter(
            id__in=customer_ids,
            owner=request.user
        )

        for customer in customers:
            try:
                generate_recommendation(customer)
                recommended += 1
            except ValueError:
                skipped += 1

        return Response({
            "recommended": recommended,
            "skipped": skipped
        })


class RecommendAllCustomersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        customers = Customer.objects.filter(owner=request.user)

        recommended = 0
        skipped = 0

        for customer in customers:
            try:
                generate_recommendation(customer)
                recommended += 1
            except ValueError:
                skipped += 1

        return Response({
            "total_customers": customers.count(),
            "recommended": recommended,
            "skipped": skipped
        })
