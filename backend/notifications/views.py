from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer
from .services import send_notification, send_notifications_batch
from recommendations.services import sanitize_products_for_customer

class NotificationDraftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drafts = Notification.objects.filter(
            customer__owner=request.user,
            status="draft"
        ).select_related("customer").only(
            "id",
            "customer_id",
            "customer__name",
            "customer__email",
            "subject",
            "message",
            "status",
            "sent_at",
            "error_message",
            "created_at",
        )

        return Response(
            NotificationSerializer(drafts, many=True).data
        )

class EditNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            customer__owner=request.user,
            status="draft"
        ).first()

        if not notification:
            return Response(
                {"error": "Draft not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.subject = request.data.get(
            "subject", notification.subject
        )
        notification.message = request.data.get(
            "message", notification.message
        )
        notification.save()

        return Response(
            NotificationSerializer(notification).data
        )


class EditSentNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            customer__owner=request.user,
            status="sent",
        ).first()

        if not notification:
            return Response(
                {"error": "Sent notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "subject" in request.data:
            notification.subject = request.data.get("subject", "")
        if "message" in request.data:
            notification.message = request.data.get("message", "")

        notification.save(update_fields=["subject", "message"])

        return Response(NotificationSerializer(notification).data)


class ResendSentNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            customer__owner=request.user,
            status="sent",
        ).select_related("customer").first()

        if not notification:
            return Response(
                {"error": "Sent notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        send_notification(notification, request.user)

        return Response(
            {
                "status": notification.status,
                "sent_at": notification.sent_at,
                "error_message": notification.error_message,
            },
            status=status.HTTP_200_OK,
        )


class SendNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            customer__owner=request.user,
            status="draft"
        ).select_related("customer").first()

        if not notification:
            return Response(
                {"error": "Draft not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        send_notification(notification, request.user)

        return Response({
            "status": notification.status
        })
class SendAllDraftsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        drafts = list(Notification.objects.filter(
            customer__owner=request.user,
            status="draft"
        ).select_related("customer"))

        total = len(drafts)

        if total == 0:
            return Response({
                "total": 0,
                "sent": 0,
                "failed": 0,
            })

        result = send_notifications_batch(drafts, request.user)

        return Response({
            "total": total,
            "sent": result["sent"],
            "failed": result["failed"],
        })


class DeleteNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        deleted, _ = Notification.objects.filter(
            id=notification_id,
            customer__owner=request.user,
        ).delete()

        if deleted == 0:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"deleted": deleted},
            status=status.HTTP_200_OK,
        )


class DeleteManyNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_ids = request.data.get("notification_ids", [])

        if not isinstance(notification_ids, list):
            return Response(
                {"error": "notification_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not notification_ids:
            return Response(
                {
                    "requested": 0,
                    "deleted": 0,
                },
                status=status.HTTP_200_OK,
            )

        deleted, _ = Notification.objects.filter(
            id__in=notification_ids,
            customer__owner=request.user,
        ).delete()

        return Response(
            {
                "requested": len(notification_ids),
                "deleted": deleted,
            },
            status=status.HTTP_200_OK,
        )


class DeleteAllNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted, _ = Notification.objects.filter(
            customer__owner=request.user,
        ).delete()

        return Response(
            {"deleted": deleted},
            status=status.HTTP_200_OK,
        )


class NotificationSentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from recommendations.models import Recommendation

        sent = list(
            Notification.objects.filter(
                customer__owner=request.user,
                status="sent",
            )
            .select_related("customer")
            .only(
                "id",
                "customer_id",
                "customer__name",
                "customer__email",
                "subject",
                "message",
                "status",
                "sent_at",
                "created_at",
            )
            .order_by("-sent_at")
        )

        customer_ids = list({n.customer_id for n in sent})
        rec_map = {}
        for rec in Recommendation.objects.filter(
            customer_id__in=customer_ids
        ).select_related("customer").only(
            "customer_id",
            "recommended_products",
            "customer__active_product",
        ).order_by("customer_id", "-created_at"):
            rec_map.setdefault(
                rec.customer_id,
                sanitize_products_for_customer(rec.customer, rec.recommended_products),
            )

        data = [
            {
                "id": n.id,
                "customer_id": n.customer_id,
                "customer_name": n.customer.name,
                "customer_email": n.customer.email,
                "subject": n.subject,
                "message": n.message,
                "status": n.status,
                "sent_at": n.sent_at,
                "recommended_products": rec_map.get(n.customer_id, []),
            }
            for n in sent
        ]

        return Response(data)
