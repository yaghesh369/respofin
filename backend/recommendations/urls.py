from django.urls import path
from .views import (
    RecommendSingleCustomerView,
    RecommendBulkCustomersView,
    RecommendAllCustomersView,
)

urlpatterns = [
    path("customer/<int:customer_id>/", RecommendSingleCustomerView.as_view()),
    path("bulk/", RecommendBulkCustomersView.as_view()),
    path("all/", RecommendAllCustomersView.as_view()),
]
