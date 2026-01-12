from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from accounts.views import RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/register/", RegisterView.as_view()),
    path("api/login/", TokenObtainPairView.as_view()),
    path("api/token/refresh/", TokenRefreshView.as_view()),
]

# for register
# {
#   "token": "UUID_FROM_EMAIL",
#   "password": "StrongPassword123"
# }

# for login
# POST /api/login/
# {
#   "username": "user@email.com",
#   "password": "StrongPassword123"
# }