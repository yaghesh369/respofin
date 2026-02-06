from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .services import run_segmentation_for_user
from customers.models import Customer


class RunSegmentationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            result = run_segmentation_for_user(request.user)
            return Response(
                {
                    "status": "segmentation completed",
                    **result
                },
                status=status.HTTP_200_OK
            )
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SegmentationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customers = Customer.objects.filter(
            owner=request.user,
            segment_label__isnull=False
        )

        if not customers.exists():
            return Response(
                {"error": "No segmentation data available"},
                status=status.HTTP_404_NOT_FOUND
            )

        stats = {}
        for c in customers:
            stats.setdefault(c.segment_label, 0)
            stats[c.segment_label] += 1

        return Response({
            "segments": stats,
            "total_customers": customers.count()
        })
