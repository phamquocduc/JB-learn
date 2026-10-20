import logging
import tempfile
from pathlib import Path

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from shadowing.models import ShadowingVideo, UserShadowingProgress
from shadowing.permissions import IsOwnerOrReadOnly
from shadowing.serializers import (
    ShadowingVideoDetailSerializer,
    ShadowingVideoListSerializer,
    UserShadowingProgressSerializer,
)
from shadowing.services.transcription import (
    extract_youtube_id,
    extract_youtube_transcript,
    generate_exercises_from_segments,
    transcribe_audio_offline,
)

logger = logging.getLogger(__name__)


class ShadowingVideoViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Shadowing Videos with topic/level filtering, search,
    offline transcript extraction, and progress persistence.
    """

    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = ShadowingVideo.objects.visible_to(user).select_related("created_by")

        # Filters
        topic = self.request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic=topic.strip().lower())

        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level.strip().upper())

        media_source = self.request.query_params.get("media_source")
        if media_source:
            qs = qs.filter(media_source=media_source.strip().lower())

        # Filter: mine (only user's videos)
        mine = self.request.query_params.get("mine")
        if mine and mine.lower() in ("true", "1", "yes"):
            if user and user.is_authenticated:
                qs = qs.filter(created_by=user)
            else:
                qs = qs.none()

        # Search keyword
        search = self.request.query_params.get("search")
        if search:
            q = search.strip()
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
            )

        return qs

    def get_serializer_class(self):
        if self.action in ("list",):
            return ShadowingVideoListSerializer
        return ShadowingVideoDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        youtube_url = serializer.validated_data.get("youtube_url", "")
        youtube_id = serializer.validated_data.get("youtube_id", "")
        if youtube_url and not youtube_id:
            youtube_id = extract_youtube_id(youtube_url)

        extra_kwargs = {"created_by": user, "youtube_id": youtube_id}
        if youtube_id and not serializer.validated_data.get("thumbnail_url"):
            extra_kwargs["thumbnail_url"] = f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"

        segments = serializer.validated_data.get("segments") or []
        if not serializer.validated_data.get("duration_seconds") and segments:
            last_end = max((float(s.get("end", 0)) for s in segments if isinstance(s, dict)), default=0.0)
            if last_end > 0:
                extra_kwargs["duration_seconds"] = int(round(last_end))

        serializer.save(**extra_kwargs)

    def perform_update(self, serializer):
        youtube_url = serializer.validated_data.get("youtube_url", "")
        youtube_id = serializer.validated_data.get("youtube_id", "")
        if youtube_url and not youtube_id:
            youtube_id = extract_youtube_id(youtube_url)
            serializer.save(youtube_id=youtube_id)
        else:
            serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def topics(self, request):
        """Returns the list of supported shadowing topics with counts and labels."""
        topics_data = []
        user = request.user
        base_qs = ShadowingVideo.objects.visible_to(user)

        for code, label in ShadowingVideo.Topic.choices:
            count = base_qs.filter(topic=code).count()
            topics_data.append(
                {
                    "id": code,
                    "code": code,
                    "slug": code,
                    "name": label,
                    "label": label,
                    "count": count,
                }
            )

        levels_data = [
            {"code": code, "label": label}
            for code, label in ShadowingVideo.Level.choices
        ]

        return Response(
            {
                "topics": topics_data,
                "levels": levels_data,
            }
        )

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def extract_transcript(self, request):
        """
        Extracts timestamped Japanese transcript segments and exercises
        from either a YouTube URL or an uploaded audio/video file.
        """
        youtube_url = request.data.get("youtube_url") or request.query_params.get("youtube_url")
        media_file = request.FILES.get("media_file") or request.FILES.get("file")

        if youtube_url is not None:
            if not isinstance(youtube_url, str):
                return Response(
                    {
                        "detail": "youtube_url phải là chuỗi hợp lệ.",
                        "error": "youtube_url phải là chuỗi hợp lệ.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            youtube_url = youtube_url.strip()

        if not youtube_url and not media_file:
            return Response(
                {
                    "detail": "Vui lòng cung cấp youtube_url hoặc tải lên tệp media_file.",
                    "error": "Vui lòng cung cấp youtube_url hoặc tải lên tệp media_file.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if youtube_url:
                youtube_id = extract_youtube_id(youtube_url)
                if not youtube_id:
                    return Response(
                        {
                            "detail": "Không thể nhận diện YouTube Video ID từ liên kết được cung cấp.",
                            "error": "Không thể nhận diện YouTube Video ID từ liên kết được cung cấp.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                segments = extract_youtube_transcript(youtube_id)
                exercises = generate_exercises_from_segments(segments)
                duration_seconds = int(round(segments[-1]["end"])) if segments else 0
                return Response(
                    {
                        "media_source": "youtube",
                        "youtube_id": youtube_id,
                        "youtube_url": youtube_url,
                        "duration_seconds": duration_seconds,
                        "segments": segments,
                        "exercises": exercises,
                        "total_segments": len(segments),
                        "total_exercises": len(exercises),
                    }
                )

            # Processing uploaded media file with faster-whisper offline
            suffix = Path(media_file.name).suffix or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                for chunk in media_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name

            try:
                segments = transcribe_audio_offline(tmp_path)
                exercises = generate_exercises_from_segments(segments)
                duration_seconds = int(round(segments[-1]["end"])) if segments else 0
                return Response(
                    {
                        "media_source": "upload",
                        "filename": media_file.name,
                        "duration_seconds": duration_seconds,
                        "segments": segments,
                        "exercises": exercises,
                        "total_segments": len(segments),
                        "total_exercises": len(exercises),
                    }
                )
            finally:
                Path(tmp_path).unlink(missing_ok=True)

        except ValueError as exc:
            err_msg = str(exc)
            if any(p in err_msg for p in ("/var/", "/tmp", "Invalid data found")):
                err_msg = "Tệp âm thanh / video không hợp lệ hoặc không có dữ liệu âm thanh để xử lý."
            return Response(
                {"detail": err_msg, "error": err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Transcription extraction failed: %s", exc)
            err_msg = str(exc)
            if any(p in err_msg for p in ("/var/", "/tmp", "Invalid data found")):
                err_msg = "Tệp âm thanh / video không hợp lệ hoặc không có dữ liệu âm thanh để xử lý."
            else:
                err_msg = f"Quá trình trích xuất phụ đề thất bại: {err_msg}"
            return Response(
                {"detail": err_msg, "error": err_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def progress(self, request, pk=None):
        """Retrieves or updates user's study progress on this video."""
        video = self.get_object()
        user = request.user

        progress_obj, _ = UserShadowingProgress.objects.get_or_create(
            user=user,
            video=video,
        )

        if request.method == "POST":
            current_segment_index = request.data.get("current_segment_index")
            ratings = request.data.get("ratings")
            if current_segment_index is not None:
                if (
                    isinstance(current_segment_index, bool)
                    or not isinstance(current_segment_index, int)
                    or current_segment_index < 0
                ):
                    return Response(
                        {
                            "detail": "current_segment_index phải là số nguyên không âm.",
                            "error": "current_segment_index phải là số nguyên không âm.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if current_segment_index > 2147483647:
                    return Response(
                        {
                            "detail": "current_segment_index vượt quá giới hạn cho phép.",
                            "error": "current_segment_index vượt quá giới hạn cho phép.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                progress_obj.current_segment_index = current_segment_index

            if ratings is not None:
                if isinstance(ratings, dict):
                    valid_ratings = {"learned", "remembered", "mastered"}
                    invalid_values = [v for v in ratings.values() if v not in valid_ratings]
                    if invalid_values:
                        return Response(
                            {
                                "detail": "Giá trị ratings không hợp lệ. Các giá trị hợp lệ là: 'learned', 'remembered', 'mastered'.",
                                "error": "Giá trị ratings không hợp lệ.",
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    # Update or merge ratings
                    progress_obj.ratings.update({str(k): v for k, v in ratings.items()})

            progress_obj.save()

        serializer = UserShadowingProgressSerializer(progress_obj)
        return Response(serializer.data)
