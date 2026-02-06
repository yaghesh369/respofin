from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer
from .services import send_notification

class NotificationDraftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drafts = Notification.objects.filter(
            customer__owner=request.user,
            status="draft"
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
class SendNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
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

        send_notification(notification, request.user)

        return Response({
            "status": notification.status
        })
class SendAllDraftsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        drafts = Notification.objects.filter(
            customer__owner=request.user,
            status="draft"
        )

        sent = 0
        failed = 0

        for notification in drafts:
            result = send_notification(notification, request.user)
            if result.status == "sent":
                sent += 1
            else:
                failed += 1

        return Response({
            "total": drafts.count(),
            "sent": sent,
            "failed": failed
        })
