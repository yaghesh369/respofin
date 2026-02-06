from django.urls import path
from .views import RunSegmentationView, SegmentationStatsView

urlpatterns = [
    path("run/", RunSegmentationView.as_view()),
    path("stats/", SegmentationStatsView.as_view()),
]
