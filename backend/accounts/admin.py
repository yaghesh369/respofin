from django.contrib import admin
from .models import Invite
from django.core.mail import send_mail
from django.conf import settings

@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ("email", "is_used", "created_at")
    actions = ["send_invite_email"]

    def send_invite_email(self, request, queryset):
        for invite in queryset:
            invite_link = f"http://localhost:5173/register/{invite.token}"

            send_mail(
                subject="You're invited to RespoFin",
                message=f"""
You have been invited to RespoFin.

Click the link below to register:
{invite_link}

If you did not expect this email, ignore it.
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invite.email],
                fail_silently=False,
            )

        self.message_user(request, "Invite emails sent successfully.")

    send_invite_email.short_description = "Send invite email"
