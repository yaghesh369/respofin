from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/segmentation/", include("segmentation.urls")),
    path("api/recommendations/", include("recommendations.urls")),
    path("api/notifications/", include("notifications.urls")),
]
