from django.urls import path
from rest_framework.routers import DefaultRouter

from shadowing.views import ShadowingVideoViewSet

app_name = "shadowing"

router = DefaultRouter()
router.register("videos", ShadowingVideoViewSet, basename="video")

urlpatterns = [
    path("topics/", ShadowingVideoViewSet.as_view({"get": "topics"}), name="topics"),
] + router.urls
