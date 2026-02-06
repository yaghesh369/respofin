from django.core.mail import EmailMessage
from django.conf import settings
from django.utils.timezone import now
from notifications.models import Notification



def send_notification(notification, user):
    try:
        email = EmailMessage(
            subject=notification.subject,
            body=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[notification.customer.email],
            reply_to=[user.email],
        )

        email.send(fail_silently=False)

        notification.status = "sent"
        notification.sent_at = now()
        notification.error_message = ""

    except Exception as exc:
        notification.status = "failed"
        notification.error_message = str(exc)

    notification.save()
    return notification
