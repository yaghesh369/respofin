from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView


def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("", health_check),
    path("health/", health_check),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/auth/token/refresh/", TokenRefreshView.as_view()),
    path("api/customers/", include("customers.urls")),
    path("api/segmentation/", include("segmentation.urls")),
    path("api/recommendations/", include("recommendations.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/analytics/", include("analytics.urls")),

]
