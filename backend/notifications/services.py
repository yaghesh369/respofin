import math
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils.timezone import now

from notifications.models import Notification


MAX_SEND_WORKERS = max(1, int(getattr(settings, "NOTIFICATION_SEND_WORKERS", 2)))
PARALLEL_SEND_THRESHOLD = max(1, int(getattr(settings, "NOTIFICATION_PARALLEL_THRESHOLD", 30)))


def _build_reply_to(user):
    return [user.email] if getattr(user, "email", None) else None


def _is_provider_limit_error(error_message):
    message = str(error_message or "").lower()
    markers = (
        "daily user sending limit exceeded",
        "sending limit exceeded",
        "quota exceeded",
        "too many recipients",
        "too many messages",
        "5.4.5",
    )
    return any(marker in message for marker in markers)


def _send_notifications_chunk(notifications, user):
    sent = 0
    failed = 0
    stop_reason = None
    stop_message = None

    connection = get_connection(fail_silently=False)
    reply_to = _build_reply_to(user)

    try:
        connection.open()
    except Exception as exc:
        error_message = str(exc)
        is_provider_limit = _is_provider_limit_error(error_message)
        for notification in notifications:
            notification.status = "draft" if is_provider_limit else "failed"
            notification.sent_at = None
            notification.error_message = error_message

        return {
            "failed": len(notifications),
            "sent": 0,
            "stop_message": error_message,
            "stop_reason": "provider_sending_limit" if is_provider_limit else "smtp_connection_failed",
        }

    try:
        for idx, notification in enumerate(notifications):
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
                error_message = str(exc)
                is_provider_limit = _is_provider_limit_error(error_message)
                notification.status = "draft" if is_provider_limit else "failed"
                notification.sent_at = None
                notification.error_message = error_message
                failed += 1

                if is_provider_limit:
                    stop_reason = "provider_sending_limit"
                    stop_message = error_message
                    remaining_notifications = notifications[idx + 1:]
                    for remaining in remaining_notifications:
                        remaining.status = "draft"
                        remaining.sent_at = None
                        remaining.error_message = error_message
                    failed += len(remaining_notifications)
                    break
    finally:
        try:
            connection.close()
        except Exception:
            pass

    return {
        "failed": failed,
        "sent": sent,
        "stop_message": stop_message,
        "stop_reason": stop_reason,
    }


def _chunk_notifications(notifications, chunk_size):
    for start in range(0, len(notifications), chunk_size):
        yield notifications[start:start + chunk_size]


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
    stop_reason = None
    stop_message = None

    if len(notifications) >= PARALLEL_SEND_THRESHOLD:
        worker_count = min(MAX_SEND_WORKERS, len(notifications))
        chunk_size = max(1, math.ceil(len(notifications) / worker_count))

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            future_to_chunk = {
                executor.submit(_send_notifications_chunk, chunk, user): chunk
                for chunk in _chunk_notifications(notifications, chunk_size)
            }

            for future in as_completed(future_to_chunk):
                chunk = future_to_chunk[future]
                try:
                    result = future.result()
                    sent += result["sent"]
                    failed += result["failed"]
                    if not stop_reason and result.get("stop_reason"):
                        stop_reason = result.get("stop_reason")
                        stop_message = result.get("stop_message")
                except Exception as exc:
                    error_message = str(exc)
                    for notification in chunk:
                        notification.status = "failed"
                        notification.sent_at = None
                        notification.error_message = error_message
                    failed += len(chunk)
                    if not stop_reason:
                        stop_reason = "worker_exception"
                        stop_message = error_message
    else:
        result = _send_notifications_chunk(notifications, user)
        sent = result["sent"]
        failed = result["failed"]
        stop_reason = result.get("stop_reason")
        stop_message = result.get("stop_message")

    Notification.objects.bulk_update(
        notifications,
        ["status", "sent_at", "error_message"],
        batch_size=500,
    )

    return {
        "failed": failed,
        "sent": sent,
        "stop_message": stop_message,
        "stop_reason": stop_reason,
    }
