from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .anki import (
    compute_anki_queue_summary,
    normalize_srs_state,
    schedule_card_review,
    serialize_srs_state,
)
from .models import Card, CardReview, Course
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    CardReviewInputSerializer,
    CardReviewSerializer,
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
        due = self.request.query_params.get("due", "").lower() in ("true", "1", "yes")
        srs_state = self.request.query_params.get("srs_state", "").strip().lower()

        if lesson:
            qs = qs.by_lesson(lesson)
        if search:
            qs = qs.search(search)
        if due:
            if self.request.user.is_authenticated:
                qs = qs.filter(
                    Q(reviews__due_at__lte=timezone.now())
                    | Q(reviews__due_at__isnull=True),
                    reviews__user=self.request.user,
                    reviews__state__in=[
                        CardReview.ReviewState.LEARNING,
                        CardReview.ReviewState.REVIEW,
                        CardReview.ReviewState.RELEARNING,
                    ],
                )
            else:
                qs = qs.none()
        if srs_state in ("new", "learning", "review", "relearning"):
            if self.request.user.is_authenticated:
                if srs_state == "new":
                    qs = qs.exclude(
                        reviews__user=self.request.user,
                        reviews__state__in=[
                            CardReview.ReviewState.LEARNING,
                            CardReview.ReviewState.REVIEW,
                            CardReview.ReviewState.RELEARNING,
                        ],
                    )
                else:
                    qs = qs.filter(
                        reviews__user=self.request.user,
                        reviews__state=srs_state,
                    )
            elif srs_state != "new":
                qs = qs.none()
        return qs

    def list(self, request: Request, *args, **kwargs) -> Response:
        cards = list(self.filter_queryset(self.get_queryset()))
        now_dt = timezone.now()
        card_ids = [c.id for c in cards]
        srs_states = {}
        raw_reviews_by_id = {}

        if request.user.is_authenticated and card_ids:
            reviews = CardReview.objects.filter(
                user=request.user, card_id__in=card_ids
            )
            for rev in reviews:
                raw_reviews_by_id[rev.card_id] = rev
                srs_states[str(rev.card_id)] = serialize_srs_state(
                    rev.to_srs_dict(), now=now_dt
                )

        if (
            request.query_params.get("due", "").strip().lower() in ("true", "1", "yes")
            and raw_reviews_by_id
        ):
            cards.sort(
                key=lambda c: (
                    0
                    if raw_reviews_by_id.get(c.id)
                    and raw_reviews_by_id[c.id].state
                    in (
                        CardReview.ReviewState.LEARNING,
                        CardReview.ReviewState.RELEARNING,
                    )
                    else 1,
                    raw_reviews_by_id[c.id].due_at.timestamp()
                    if raw_reviews_by_id.get(c.id)
                    and raw_reviews_by_id[c.id].due_at
                    else 0.0,
                    c.id,
                )
            )
            card_ids = [c.id for c in cards]

        serializer = self.get_serializer(cards, many=True)
        srs_summary = compute_anki_queue_summary(card_ids, srs_states, now=now_dt)

        return Response(
            {
                "total": len(serializer.data),
                "lessons": self.get_base_queryset().distinct_lessons(),
                "results": serializer.data,
                "srs_states": srs_states,
                "srs_summary": srs_summary,
            }
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def review(self, request: Request, pk=None) -> Response:
        """Execute Anki spaced repetition step on a card and persist for authenticated users."""
        card = self.get_object()
        input_serializer = CardReviewInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        rating_num = input_serializer.validated_data["rating"]
        client_state = input_serializer.validated_data.get("current_state")
        now_dt = timezone.now()

        if request.user.is_authenticated:
            if rating_num == 0:
                CardReview.objects.filter(user=request.user, card=card).delete()
                serialized = serialize_srs_state(None, now=now_dt)
                serialized["card"] = card.id
                return Response(serialized, status=status.HTTP_200_OK)

            with transaction.atomic():
                existing = (
                    CardReview.objects.select_for_update()
                    .filter(user=request.user, card=card)
                    .first()
                )
                base_raw = (
                    existing.to_srs_dict() if existing is not None else client_state
                )
                next_srs = schedule_card_review(base_raw, rating_num, now=now_dt)

                defaults = {
                    "state": next_srs["state"],
                    "status": next_srs["status"],
                    "step_index": next_srs["step_index"],
                    "interval": next_srs["interval"],
                    "learning_minutes": next_srs["learning_minutes"],
                    "ease_factor": next_srs["ease_factor"],
                    "repetitions": next_srs["repetitions"],
                    "lapses": next_srs["lapses"],
                    "due_at": next_srs["due_at"],
                    "last_reviewed_at": next_srs["last_reviewed_at"],
                    "last_rating": next_srs["last_rating"],
                }
                if existing is not None:
                    for field, val in defaults.items():
                        setattr(existing, field, val)
                    existing.save(update_fields=[*defaults.keys(), "updated_at"])
                    review_obj = existing
                else:
                    review_obj = CardReview.objects.create(
                        user=request.user,
                        card=card,
                        **defaults,
                    )

            return Response(
                CardReviewSerializer(review_obj).data,
                status=status.HTTP_200_OK,
            )

        # Stateless calculation for Guest user
        next_srs = schedule_card_review(client_state, rating_num, now=now_dt)
        serialized = serialize_srs_state(next_srs, now=now_dt)
        serialized["card"] = card.id
        return Response(serialized, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def reviews(self, request: Request) -> Response:
        """Return SRS states map and Anki queue summary for the current user."""
        now_dt = timezone.now()
        base_card_ids = list(
            self.get_base_queryset().values_list("id", flat=True)
        )
        srs_states = {}
        if request.user.is_authenticated and base_card_ids:
            qs = CardReview.objects.filter(
                user=request.user, card_id__in=base_card_ids
            )
            for rev in qs:
                srs_states[str(rev.card_id)] = serialize_srs_state(
                    rev.to_srs_dict(), now=now_dt
                )
        summary = compute_anki_queue_summary(base_card_ids, srs_states, now=now_dt)
        return Response(
            {
                "srs_states": srs_states,
                "srs_summary": summary,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def sync_reviews(self, request: Request) -> Response:
        """Bulk-synchronize client SRS state map into persistent CardReview records."""
        raw_reviews = request.data.get("reviews")
        if not isinstance(raw_reviews, dict):
            return Response(
                {"detail": "Trường 'reviews' phải là một đối tượng (dict)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate_ids = []
        for k in raw_reviews.keys():
            try:
                candidate_ids.append(int(k))
            except (ValueError, TypeError):
                continue

        visible_ids = set(
            Card.objects.visible_to(request.user)
            .filter(id__in=candidate_ids)
            .values_list("id", flat=True)
        )

        now_dt = timezone.now()
        synced_count = 0
        srs_states = {}

        with transaction.atomic():
            existing_map = {
                rev.card_id: rev
                for rev in CardReview.objects.select_for_update().filter(
                    user=request.user, card_id__in=visible_ids
                )
            }
            for cid in visible_ids:
                item = raw_reviews.get(str(cid)) or raw_reviews.get(cid)
                if not item:
                    continue
                if isinstance(item, str):
                    try:
                        norm = schedule_card_review(None, item, now=now_dt)
                        norm["last_reviewed_at"] = None
                    except ValueError:
                        continue
                elif isinstance(item, dict):
                    norm = normalize_srs_state(item)
                else:
                    continue

                if norm["state"] == "new" and norm["status"] == "unseen":
                    continue

                existing = existing_map.get(cid)
                if (
                    existing is not None
                    and existing.last_reviewed_at is not None
                    and (
                        norm["last_reviewed_at"] is None
                        or existing.last_reviewed_at >= norm["last_reviewed_at"]
                    )
                ):
                    srs_states[str(cid)] = serialize_srs_state(
                        existing.to_srs_dict(), now=now_dt
                    )
                    continue

                defaults = {
                    "state": norm["state"],
                    "status": norm["status"],
                    "step_index": norm["step_index"],
                    "interval": norm["interval"],
                    "learning_minutes": norm["learning_minutes"],
                    "ease_factor": norm["ease_factor"],
                    "repetitions": max(1, norm["repetitions"]),
                    "lapses": norm["lapses"],
                    "due_at": norm["due_at"] or now_dt,
                    "last_reviewed_at": norm["last_reviewed_at"] or now_dt,
                    "last_rating": norm["last_rating"],
                }
                if existing is not None:
                    for field, val in defaults.items():
                        setattr(existing, field, val)
                    existing.save(update_fields=[*defaults.keys(), "updated_at"])
                    rev_obj = existing
                else:
                    rev_obj = CardReview.objects.create(
                        user=request.user,
                        card_id=cid,
                        **defaults,
                    )
                synced_count += 1
                srs_states[str(cid)] = serialize_srs_state(
                    rev_obj.to_srs_dict(), now=now_dt
                )

        return Response(
            {
                "synced": synced_count,
                "srs_states": srs_states,
            },
            status=status.HTTP_200_OK,
        )


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

