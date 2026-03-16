from django.urls import path
from .views import (
    RecommendSingleCustomerView,
    RecommendBulkCustomersView,
    RecommendAllCustomersView,
    RecommendationListView,
)

urlpatterns = [
    path("list/", RecommendationListView.as_view()),
    path("customer/<int:customer_id>/", RecommendSingleCustomerView.as_view()),
    path("bulk/", RecommendBulkCustomersView.as_view()),
    path("all/", RecommendAllCustomersView.as_view()),
]
