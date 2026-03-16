from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from customers.models import Customer
from .models import Recommendation
from .services import generate_recommendation, generate_recommendations_for_customers, sanitize_products_for_customer
from .serializers import RecommendationSerializer


def _is_customer_ready_for_segmentation(customer: Customer):
    return (
        customer.age is not None
        and customer.income is not None
        and customer.credit_score is not None
    )


def _run_auto_segmentation_if_possible(user):
    ready_count = Customer.objects.filter(
        owner=user,
        age__isnull=False,
        income__isnull=False,
        credit_score__isnull=False,
    ).count()

    if ready_count < 3:
        return False

    from segmentation.services import run_segmentation_for_user

    run_segmentation_for_user(user)
    return True


class RecommendSingleCustomerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, customer_id):
        customer = Customer.objects.filter(
            id=customer_id,
            owner=request.user
        ).select_related("owner").first()

        if not customer:
            return Response(
                {"error": "Customer not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        auto_segmented = False

        if customer.segment_label is None and _is_customer_ready_for_segmentation(customer):
            try:
                auto_segmented = _run_auto_segmentation_if_possible(request.user)
            except Exception as exc:
                return Response(
                    {"error": f"Unable to auto-run segmentation: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            if auto_segmented:
                customer.refresh_from_db(fields=["segment_label"])

        if customer.segment_label is None:
            return Response(
                {
                    "error": "Customer is not segmented. Run segmentation first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rec = generate_recommendation(customer)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as exc:
            return Response(
                {"error": f"Unable to generate recommendation: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        payload = RecommendationSerializer(rec).data
        payload["auto_segmented"] = auto_segmented

        return Response(
            payload,
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

        if not customer_ids:
            return Response({
                "recommended": 0,
                "skipped": 0,
            })

        unique_customer_ids = list(dict.fromkeys(customer_ids))

        customers = list(Customer.objects.filter(
            id__in=unique_customer_ids,
            owner=request.user
        ).select_related("owner"))

        found_ids = {customer.id for customer in customers}
        missing_or_unauthorized = len(unique_customer_ids) - len(found_ids)

        eligible_customers = [
            customer
            for customer in customers
            if customer.segment_label is not None
        ]

        auto_segmented = False
        if customers and not eligible_customers:
            try:
                auto_segmented = _run_auto_segmentation_if_possible(request.user)
            except Exception as exc:
                return Response(
                    {"error": f"Unable to auto-run segmentation: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            if auto_segmented:
                customers = list(Customer.objects.filter(
                    id__in=unique_customer_ids,
                    owner=request.user,
                ).select_related("owner"))
                eligible_customers = [
                    customer
                    for customer in customers
                    if customer.segment_label is not None
                ]

        skipped = missing_or_unauthorized + (len(customers) - len(eligible_customers))

        result = generate_recommendations_for_customers(eligible_customers)
        recommended = result["recommended"]
        skipped += result["failed"]

        return Response({
            "recommended": recommended,
            "skipped": skipped,
            "auto_segmented": auto_segmented,
        })


class RecommendAllCustomersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        all_customers = list(
            Customer.objects.filter(owner=request.user).select_related("owner")
        )
        total_customers = len(all_customers)
        eligible_customers = [c for c in all_customers if c.segment_label is not None]

        auto_segmented = False
        if total_customers > 0 and not eligible_customers:
            try:
                auto_segmented = _run_auto_segmentation_if_possible(request.user)
            except Exception as exc:
                return Response(
                    {"error": f"Unable to auto-run segmentation: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            if auto_segmented:
                eligible_customers = list(
                    Customer.objects.filter(owner=request.user, segment_label__isnull=False)
                    .select_related("owner")
                )

        skipped = total_customers - len(eligible_customers)

        result = generate_recommendations_for_customers(eligible_customers)
        recommended = result["recommended"]
        skipped += result["failed"]

        return Response({
            "total_customers": total_customers,
            "recommended": recommended,
            "skipped": skipped,
            "auto_segmented": auto_segmented,
        })


class RecommendationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = list(
            Recommendation.objects.filter(customer__owner=request.user)
            .select_related("customer")
            .only(
                "id",
                "customer_id",
                "customer__name",
                "customer__email",
                "customer__active_product",
                "segment_label",
                "recommended_products",
                "created_at",
            )
            .order_by("customer_id", "-created_at")
        )

        latest_recommendations = []
        seen_customer_ids = set()

        for recommendation in recs:
            if recommendation.customer_id in seen_customer_ids:
                continue

            seen_customer_ids.add(recommendation.customer_id)
            recommendation.recommended_products = sanitize_products_for_customer(
                recommendation.customer,
                recommendation.recommended_products,
            )
            latest_recommendations.append(recommendation)

        return Response(RecommendationSerializer(latest_recommendations, many=True).data)
