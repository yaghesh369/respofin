from django.urls import path
from .views import AnalyticsView, AnalyticsPDFView

urlpatterns = [
    path("", AnalyticsView.as_view()),
    path("download-pdf/", AnalyticsPDFView.as_view()),
]
