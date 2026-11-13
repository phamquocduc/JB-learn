import logging
import tempfile
from pathlib import Path

from django.db.models import Q
from django.utils import translation
from django.utils.translation import gettext as _
from rest_framework import status, viewsets

from core.i18n import resolve_request_language
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
from shadowing.services.cloudinary import (
    delete_media,
    generate_client_upload_signature,
    is_cloudinary_configured,
    upload_media,
)
from shadowing.services.transcription import (
    extract_youtube_id,
    extract_youtube_transcript,
    generate_exercises_from_segments,
    transcribe_audio_offline,
)
from users.rbac import (
    enforce_guest_access,
    enforce_module_enabled,
    enforce_view_permission,
)

logger = logging.getLogger(__name__)


class ShadowingVideoViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Shadowing Videos with topic/level filtering, search,
    offline transcript extraction, and progress persistence.
    """

    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_module_prefix = "shadowing"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        enforce_guest_access(request)
        enforce_module_enabled("shadowing", request.user)
        has_shadowing_bypass = bool(
            request.user.is_authenticated
            and (
                request.user.has_perm_code("shadowing.create")
                or request.user.has_perm_code("shadowing.edit")
            )
        )
        if self.action in ("list", "retrieve", "topics", "progress"):
            enforce_view_permission(
                request.user,
                (
                    "shadowing.view",
                    "shadowing.view_all",
                    "shadowing.edit",
                    "shadowing.delete",
                ),
            )
        if self.action in ("create", "extract_transcript") and not has_shadowing_bypass:
            enforce_module_enabled("shadowing.extraction", request.user)
        if (
            self.action == "extract_transcript"
            and request.user.is_authenticated
            and not request.user.has_perm_code("shadowing.create")
            and not request.user.has_perm_code("shadowing.create_own")
        ):
            enforce_view_permission(
                request.user,
                ("shadowing.create", "shadowing.create_own"),
                message=_("Vai trò của bạn chưa được cấp quyền thêm hoặc trích xuất bài Shadowing."),
            )

    def get_queryset(self):
        user = self.request.user
        is_detail = self.action in ("retrieve", "update", "partial_update", "destroy", "progress")
        if (
            is_detail
            and user
            and user.is_authenticated
            and any(
                user.has_perm_code(code)
                for code in ("shadowing.view_all", "shadowing.edit", "shadowing.delete")
            )
        ):
            qs = ShadowingVideo.objects.all().select_related("created_by")
        else:
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
                | Q(translations__en__title__icontains=q)
                | Q(translations__en__description__icontains=q)
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

        # Upload media file to Cloudinary if configured (prevents ephemeral storage loss and free server OOM)
        media_file = self.request.FILES.get("media_file") or self.request.FILES.get("file")
        if media_file and is_cloudinary_configured():
            try:
                c_res = upload_media(media_file, folder="shadowing_media", resource_type="auto")
                extra_kwargs["media_url"] = c_res.get("secure_url", "")
                extra_kwargs["cloudinary_public_id"] = c_res.get("public_id", "")
                if not serializer.validated_data.get("thumbnail_url") and c_res.get("thumbnail_url"):
                    extra_kwargs["thumbnail_url"] = c_res["thumbnail_url"]
                if not extra_kwargs.get("duration_seconds") and c_res.get("duration_seconds"):
                    extra_kwargs["duration_seconds"] = c_res["duration_seconds"]
                extra_kwargs["media_file"] = None
            except Exception as exc:
                logger.warning("Cloudinary upload failed, falling back to local file storage: %s", exc)

        serializer.save(**extra_kwargs)

    def perform_destroy(self, instance):
        if instance.cloudinary_public_id:
            delete_media(instance.cloudinary_public_id)
        super().perform_destroy(instance)

    @action(detail=False, methods=["get", "post"], permission_classes=[AllowAny])
    def cloudinary_signature(self, request):
        """
        Returns signed upload parameters allowing client-side direct upload to Cloudinary.
        Bypasses the free prod server entirely to avoid memory limits and request timeouts.
        """
        if not is_cloudinary_configured():
            return Response(
                {
                    "configured": False,
                    "detail": _("Dịch vụ Cloudinary chưa được cấu hình đầy đủ."),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        folder = request.data.get("folder") or request.query_params.get("folder") or "shadowing_media"
        resource_type = request.data.get("resource_type") or request.query_params.get("resource_type") or "video"
        try:
            data = generate_client_upload_signature(folder=folder, resource_type=resource_type)
            return Response({"configured": True, **data}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(
                {"configured": False, "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

        lang = resolve_request_language(request)
        with translation.override(lang):
            for code, label in ShadowingVideo.Topic.choices:
                count = base_qs.filter(topic=code).count()
                topics_data.append(
                    {
                        "id": code,
                        "code": code,
                        "slug": code,
                        "name": str(label),
                        "label": str(label),
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
                msg = _("youtube_url phải là chuỗi hợp lệ.")
                return Response(
                    {"detail": msg, "error": msg},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            youtube_url = youtube_url.strip()

        if not youtube_url and not media_file:
            msg = _("Vui lòng cung cấp youtube_url hoặc tải lên tệp media_file.")
            return Response(
                {"detail": msg, "error": msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if youtube_url:
                youtube_id = extract_youtube_id(youtube_url)
                if not youtube_id:
                    msg = _("Không thể nhận diện YouTube Video ID từ liên kết được cung cấp.")
                    return Response(
                        {"detail": msg, "error": msg},
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
                err_msg = _("Tệp âm thanh / video không hợp lệ hoặc không có dữ liệu âm thanh để xử lý.")
            return Response(
                {"detail": err_msg, "error": err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Transcription extraction failed: %s", exc)
            err_msg = str(exc)
            if any(p in err_msg for p in ("/var/", "/tmp", "Invalid data found")):
                err_msg = _("Tệp âm thanh / video không hợp lệ hoặc không có dữ liệu âm thanh để xử lý.")
            else:
                err_msg = _("Quá trình trích xuất phụ đề thất bại: %(error)s") % {
                    "error": err_msg
                }
            return Response(
                {"detail": err_msg, "error": err_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated])
    def progress(self, request, pk=None):
        """Retrieves or updates user's study progress on this video."""
        video = self.get_object()
        user = request.user

        progress_obj, _created = UserShadowingProgress.objects.get_or_create(
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
                    msg = _("current_segment_index phải là số nguyên không âm.")
                    return Response(
                        {"detail": msg, "error": msg},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if current_segment_index > 2147483647:
                    msg = _("current_segment_index vượt quá giới hạn cho phép.")
                    return Response(
                        {"detail": msg, "error": msg},
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
                                "detail": _(
                                    "Giá trị ratings không hợp lệ. Các giá trị hợp lệ là: 'learned', 'remembered', 'mastered'."
                                ),
                                "error": _("Giá trị ratings không hợp lệ."),
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    # Update or merge ratings
                    progress_obj.ratings.update({str(k): v for k, v in ratings.items()})

            progress_obj.save()

        serializer = UserShadowingProgressSerializer(progress_obj)
        return Response(serializer.data)
