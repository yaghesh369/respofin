from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils.timezone import now

from notifications.models import Notification


def _build_reply_to(user):
    return [user.email] if getattr(user, "email", None) else None


def send_notification(notification, user):
    try:
        email = EmailMessage(
            subject=notification.subject,
            body=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[notification.customer.email],
            reply_to=_build_reply_to(user),
        )

        email.send(fail_silently=False)

        notification.status = "sent"
        notification.sent_at = now()
        notification.error_message = ""

    except Exception as exc:
        notification.status = "failed"
        notification.sent_at = None
        notification.error_message = str(exc)

    notification.save(update_fields=["status", "sent_at", "error_message"])
    return notification


def send_notifications_batch(notifications, user):
    if not notifications:
        return {
            "failed": 0,
            "sent": 0,
        }

    sent = 0
    failed = 0
    to_update = []

    connection = get_connection(fail_silently=False)
    reply_to = _build_reply_to(user)

    try:
        connection.open()
    except Exception as exc:
        for notification in notifications:
            notification.status = "failed"
            notification.sent_at = None
            notification.error_message = str(exc)

        Notification.objects.bulk_update(
            notifications,
            ["status", "sent_at", "error_message"],
            batch_size=500,
        )

        return {
            "failed": len(notifications),
            "sent": 0,
        }

    try:
        for notification in notifications:
            try:
                email = EmailMessage(
                    subject=notification.subject,
                    body=notification.message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[notification.customer.email],
                    reply_to=reply_to,
                    connection=connection,
                )
                email.send(fail_silently=False)

                notification.status = "sent"
                notification.sent_at = now()
                notification.error_message = ""
                sent += 1
            except Exception as exc:
                notification.status = "failed"
                notification.sent_at = None
                notification.error_message = str(exc)
                failed += 1

            to_update.append(notification)
    finally:
        try:
            connection.close()
        except Exception:
            pass

    Notification.objects.bulk_update(
        to_update,
        ["status", "sent_at", "error_message"],
        batch_size=500,
    )

    return {
        "failed": failed,
        "sent": sent,
    }
