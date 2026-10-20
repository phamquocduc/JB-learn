from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import Card, Course
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    CardSerializer,
    CourseSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token = serializer.validated_data["token"]
        return Response(
            {
                "token": token,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.auth and hasattr(request.auth, "delete"):
            request.auth.delete()
        elif hasattr(request.user, "auth_token"):
            request.user.auth_token.delete()
        return Response(
            {"detail": "Đăng xuất thành công."},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(
            UserSerializer(request.user).data,
            status=status.HTTP_200_OK,
        )


class CourseViewSet(ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Course.objects.visible_to(self.request.user).select_related("created_by")
        level = self.request.query_params.get("level", "")
        card_type = self.request.query_params.get("card_type", "")
        search = self.request.query_params.get("search", "")
        mine = self.request.query_params.get("mine", "").lower() in ("true", "1", "yes")

        if level:
            qs = qs.by_level(level)
        if card_type:
            qs = qs.by_type(card_type)
        if search:
            qs = qs.search(search)
        if mine:
            if self.request.user.is_authenticated:
                qs = qs.filter(created_by=self.request.user)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CardViewSet(ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def get_base_queryset(self):
        qs = Card.objects.visible_to(self.request.user).select_related(
            "course", "created_by"
        )
        card_type = self.request.query_params.get("type", "")
        level = self.request.query_params.get("level", "")
        course = self.request.query_params.get("course", "")
        mine = self.request.query_params.get("mine", "").lower() in ("true", "1", "yes")

        if card_type:
            qs = qs.by_type(card_type)
        if level:
            qs = qs.by_level(level)
        if course:
            qs = qs.by_course(course)
        if mine:
            if self.request.user.is_authenticated:
                qs = qs.filter(created_by=self.request.user)
            else:
                qs = qs.none()
        return qs

    def get_queryset(self):
        qs = self.get_base_queryset()
        lesson = self.request.query_params.get("lesson", "")
        search = self.request.query_params.get("search", "")
        if lesson:
            qs = qs.by_lesson(lesson)
        if search:
            qs = qs.search(search)
        return qs

    def list(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "total": len(serializer.data),
                "lessons": self.get_base_queryset().distinct_lessons(),
                "results": serializer.data,
            }
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CardListAPIView(APIView):
    """Return study cards (defaults to grammar) with optional lesson, level, and search filters."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        card_type = request.query_params.get("type", Card.CardType.GRAMMAR)
        level = request.query_params.get("level", "")
        lesson = request.query_params.get("lesson", "")
        search = request.query_params.get("search", "")

        base_qs = (
            Card.objects.visible_to(request.user)
            .by_type(card_type)
            .by_level(level)
        )
        filtered_qs = base_qs.by_lesson(lesson).search(search)

        serializer = CardSerializer(
            filtered_qs, many=True, context={"request": request}
        )
        return Response(
            {
                "total": len(serializer.data),
                "lessons": base_qs.distinct_lessons(),
                "results": serializer.data,
            }
        )
