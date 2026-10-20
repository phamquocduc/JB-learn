from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CardListAPIView,
    CardViewSet,
    CourseViewSet,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
)

app_name = "cards"

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"cards", CardViewSet, basename="card")

urlpatterns = [
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/me/", CurrentUserView.as_view(), name="auth_me"),
    # Legacy grammar endpoint
    path("grammar/", CardListAPIView.as_view(), name="grammar_list"),
    # ViewSets for courses and cards
    path("", include(router.urls)),
]
