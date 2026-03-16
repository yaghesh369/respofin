from django.urls import path
from .views import (
    DeleteAllNotificationsView,
    DeleteManyNotificationsView,
    DeleteNotificationView,
    EditSentNotificationView,
    NotificationDraftListView,
    NotificationSentListView,
    EditNotificationView,
    ResendSentNotificationView,
    SendNotificationView,
    SendAllDraftsView,
)

urlpatterns = [
    path("drafts/", NotificationDraftListView.as_view()),
    path("sent/", NotificationSentListView.as_view()),
    path("sent/edit/<int:notification_id>/", EditSentNotificationView.as_view()),
    path("sent/resend/<int:notification_id>/", ResendSentNotificationView.as_view()),
    path("edit/<int:notification_id>/", EditNotificationView.as_view()),
    path("send/<int:notification_id>/", SendNotificationView.as_view()),
    path("send-all/", SendAllDraftsView.as_view()),
    path("delete/<int:notification_id>/", DeleteNotificationView.as_view()),
    path("delete-many/", DeleteManyNotificationsView.as_view()),
    path("delete-all/", DeleteAllNotificationsView.as_view()),
]
