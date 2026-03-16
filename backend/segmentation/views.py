from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count

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
        except Exception as exc:
            return Response(
                {"error": f"Unable to complete segmentation: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SegmentationStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        segment_rows = list(
            Customer.objects.filter(
                owner=request.user,
                segment_label__isnull=False
            )
            .values("segment_label")
            .annotate(count=Count("id"))
            .order_by("segment_label")
        )

        if not segment_rows:
            return Response(
                {"error": "No segmentation data available"},
                status=status.HTTP_404_NOT_FOUND
            )

        stats = {
            row["segment_label"]: row["count"]
            for row in segment_rows
        }

        return Response({
            "segments": stats,
            "total_customers": sum(stats.values())
        })
