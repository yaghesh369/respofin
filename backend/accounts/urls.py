from django.urls import path
from .views import RegisterView, LoginView, LogoutView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
]

# already registered
#     {
#   "username": "test1",
#   "email": "test1@gmail.com",
#   "password": "testPass123"
# }
# for login 
# {
#   "username": "test1",
#   "password": "testPass123"
# }
