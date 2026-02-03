from django.urls import path
from .views import ProfileView, RegisterView, LoginView, LogoutView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("profile/", ProfileView.as_view()),
]

# already registered
#     {
#   "username": "test2",
#   "email": "test2@gmail.com",
#   "password": "testPass123"
# }
# for login 
# {
#   "username": "test2",
#   "password": "testPass123"
# }
