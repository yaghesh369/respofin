from django.urls import path
from .views import (
    NotificationDraftListView,
    EditNotificationView,
    SendNotificationView,
    SendAllDraftsView,
)

urlpatterns = [
    path("drafts/", NotificationDraftListView.as_view()),
    path("edit/<int:notification_id>/", EditNotificationView.as_view()),
    path("send/<int:notification_id>/", SendNotificationView.as_view()),
    path("send-all/", SendAllDraftsView.as_view()),
]
