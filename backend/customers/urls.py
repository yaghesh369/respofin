from django.urls import path
from .views import CustomerBulkUploadView, CustomerDeleteAllView, CustomerListCreateView, CustomerDetailView

urlpatterns = [
    path("", CustomerListCreateView.as_view()),
    path("<int:pk>/", CustomerDetailView.as_view()),
    path("bulk-upload/", CustomerBulkUploadView.as_view()),
    path("delete-all/", CustomerDeleteAllView.as_view()),
]
