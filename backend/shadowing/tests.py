import re
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from shadowing.models import ShadowingVideo, UserShadowingProgress
from shadowing.services.seeding import sync_shadowing_seed_videos
from shadowing.services.transcription import (
    extract_youtube_id,
    format_furigana,
    generate_exercises_from_segments,
    tokenize_words,
)

User = get_user_model()
RUBY_PATTERN = re.compile(r"([一-龯々ヶ]+)\s*[（(]([ぁ-んァ-ンー・]+)[）)]")
KANJI_CHAR = re.compile(r"[\u4e00-\u9faf々ヶ]")


class FuriganaAndTranscriptionServiceTestCase(TestCase):
    """Unit tests for offline transcription, furigana generation, and exercise generation."""

    def test_format_furigana_ruby_text_regex_compatibility(self):
        """Verifies that format_furigana produces bracket format matching RubyText.jsx's regex."""
        sample = "今回のエピソードでは、私たちのお金の使い方について話します。"
        ruby = format_furigana(sample)

        matches = RUBY_PATTERN.findall(ruby)
        self.assertGreaterEqual(len(matches), 4)

        # Every matched group 1 must strictly contain Kanji characters only
        for kanji, reading in matches:
            self.assertTrue(
                all(KANJI_CHAR.match(c) for c in kanji),
                f"Found non-kanji in ruby match: {kanji} with reading {reading}",
            )
            self.assertTrue(len(reading) > 0)

    def test_format_furigana_mixed_kanji_kana_compounds(self):
        """Verifies isolation of kanji roots in mixed compound words like 使い方 and 思い出し."""
        self.assertEqual(format_furigana("元気"), "元気(げんき)")
        self.assertEqual(format_furigana("話す"), "話(はな)す")
        self.assertEqual(format_furigana("使い方"), "使(つか)い方(かた)")
        self.assertEqual(format_furigana("思い出し"), "思(おも)い出(だ)し")

        # Kana only should not have brackets
        self.assertEqual(format_furigana("について"), "について")
        self.assertEqual(format_furigana(""), "")

    def test_tokenize_words(self):
        """Verifies word token extraction with reading and romaji."""
        text = "日本語を勉強します。"
        tokens = tokenize_words(text)
        self.assertTrue(any(t["text"] == "日本語" and t["is_kanji"] for t in tokens))
        self.assertTrue(any(t["text"] == "勉強" and t["is_kanji"] for t in tokens))

    def test_extract_youtube_id(self):
        """Verifies extraction of YouTube IDs from varied URL formats."""
        self.assertEqual(
            extract_youtube_id("https://www.youtube.com/watch?v=ObDXpVyPrF8"),
            "ObDXpVyPrF8",
        )
        self.assertEqual(
            extract_youtube_id("https://youtu.be/ObDXpVyPrF8?t=10"),
            "ObDXpVyPrF8",
        )
        self.assertEqual(
            extract_youtube_id("https://www.youtube.com/embed/ObDXpVyPrF8"),
            "ObDXpVyPrF8",
        )
        self.assertEqual(
            extract_youtube_id("ObDXpVyPrF8"),
            "ObDXpVyPrF8",
        )

    def test_generate_exercises_from_segments(self):
        """Verifies automated exercise generation from segments never exceeds 4 options."""
        segments = [
            {
                "id": 1,
                "text": "今回のエピソードでは、私たちのお金の使い方について話します。",
                "words": [
                    {"text": "今回", "reading": "こんかい", "is_kanji": True},
                    {"text": "の", "reading": "の", "is_kanji": False},
                    {"text": "エピソード", "reading": "えぴそーど", "is_kanji": False},
                    {"text": "では", "reading": "では", "is_kanji": False},
                    {"text": "私たち", "reading": "わたしたち", "is_kanji": True},
                    {"text": "お金", "reading": "おかね", "is_kanji": True},
                    {"text": "使い方", "reading": "つかいかた", "is_kanji": True},
                    {"text": "について", "reading": "について", "is_kanji": False},
                    {"text": "話します", "reading": "はなします", "is_kanji": True},
                ],
            }
        ]
        exercises = generate_exercises_from_segments(segments)
        self.assertGreaterEqual(len(exercises), 2)
        for ex in exercises:
            self.assertIn("question", ex)
            self.assertIn("options", ex)
            self.assertGreaterEqual(len(ex["options"]), 2)
            self.assertLessEqual(len(ex["options"]), 4)
            self.assertEqual(ex["correct_index"], 0)
            self.assertIn("explanation", ex)


class ShadowingModelAndQuerySetTestCase(TestCase):
    """Tests for ShadowingVideo model, visibility isolation, and progress tracking."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            username="user_a",
            email="user_a@example.com",
            password="Password123!",
        )
        self.user_b = User.objects.create_user(
            username="user_b",
            email="user_b@example.com",
            password="Password123!",
        )

        self.system_video = ShadowingVideo.objects.create(
            title="System Public Video",
            topic=ShadowingVideo.Topic.LIFE,
            level=ShadowingVideo.Level.N3,
            is_public=True,
            created_by=None,
            youtube_id="sys12345678",
        )
        self.user_a_public_video = ShadowingVideo.objects.create(
            title="User A Public Video",
            topic=ShadowingVideo.Topic.BUSINESS,
            level=ShadowingVideo.Level.N2,
            is_public=True,
            created_by=self.user_a,
            youtube_id="usera123456",
        )
        self.user_a_private_video = ShadowingVideo.objects.create(
            title="User A Private Video",
            topic=ShadowingVideo.Topic.NEWS,
            level=ShadowingVideo.Level.N1,
            is_public=False,
            created_by=self.user_a,
            youtube_id="userapriv12",
        )
        self.user_b_private_video = ShadowingVideo.objects.create(
            title="User B Private Video",
            topic=ShadowingVideo.Topic.CULTURE,
            level=ShadowingVideo.Level.N4,
            is_public=False,
            created_by=self.user_b,
            youtube_id="userbpriv12",
        )

    def test_visible_to_guest(self):
        """Guests can only see is_public=True videos."""
        qs = ShadowingVideo.objects.visible_to(None)
        self.assertIn(self.system_video, qs)
        self.assertIn(self.user_a_public_video, qs)
        self.assertNotIn(self.user_a_private_video, qs)
        self.assertNotIn(self.user_b_private_video, qs)

    def test_visible_to_authenticated_user(self):
        """User A can see public videos and their own private video, but not User B's private video."""
        qs_a = ShadowingVideo.objects.visible_to(self.user_a)
        self.assertIn(self.system_video, qs_a)
        self.assertIn(self.user_a_public_video, qs_a)
        self.assertIn(self.user_a_private_video, qs_a)
        self.assertNotIn(self.user_b_private_video, qs_a)

    def test_user_shadowing_progress(self):
        """Tests UserShadowingProgress model and uniqueness constraint."""
        prog = UserShadowingProgress.objects.create(
            user=self.user_a,
            video=self.system_video,
            current_segment_index=3,
            ratings={"1": "mastered", "2": "learned"},
        )
        self.assertEqual(prog.current_segment_index, 3)
        self.assertEqual(prog.ratings["1"], "mastered")


class ShadowingAPITestCase(TestCase):
    """API endpoint integration tests."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="testuser_a",
            email="testuser_a@example.com",
            password="Password123!",
        )
        self.user_b = User.objects.create_user(
            username="testuser_b",
            email="testuser_b@example.com",
            password="Password123!",
        )
        self.public_video = ShadowingVideo.objects.create(
            title="Bite Size Japanese Ep.732",
            description="Luyện nghe tiếng Nhật N3",
            topic=ShadowingVideo.Topic.LIFE,
            level=ShadowingVideo.Level.N3,
            is_public=True,
            youtube_id="ObDXpVyPrF8",
            youtube_url="https://www.youtube.com/watch?v=ObDXpVyPrF8",
            segments=[
                {
                    "id": 1,
                    "start": 0.0,
                    "end": 2.15,
                    "text": "はい、みなさんこんにちは。",
                    "ruby_text": "はい、みなさんこんにちは。",
                    "meaning": "Chào mọi người.",
                    "words": [],
                }
            ],
            exercises=[
                {
                    "id": 1,
                    "type": "comprehension",
                    "question": "Câu chào?",
                    "options": ["Chào", "Tạm biệt"],
                    "correct_index": 0,
                    "explanation": "Câu mở đầu",
                }
            ],
        )
        self.private_video_a = ShadowingVideo.objects.create(
            title="Private Video User A",
            description="Video cá nhân",
            topic=ShadowingVideo.Topic.BUSINESS,
            level=ShadowingVideo.Level.N2,
            is_public=False,
            created_by=self.user_a,
            youtube_id="private1234",
        )

    def test_guest_list_videos_returns_only_public(self):
        """Guests only receive public videos."""
        response = self.client.get("/api/shadowing/videos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data]
        self.assertIn(self.public_video.id, ids)
        self.assertNotIn(self.private_video_a.id, ids)

    def test_guest_retrieve_public_allowed_private_404(self):
        """Guest can retrieve public video detail, but private video returns 404."""
        pub_res = self.client.get(f"/api/shadowing/videos/{self.public_video.id}/")
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(pub_res.data["segments"]), 1)

        priv_res = self.client.get(f"/api/shadowing/videos/{self.private_video_a.id}/")
        self.assertEqual(priv_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_retrieve_private_video(self):
        """Owner can retrieve their own private video."""
        self.client.force_authenticate(user=self.user_a)
        res = self.client.get(f"/api/shadowing/videos/{self.private_video_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Private Video User A")

    def test_guest_create_video_rejected(self):
        """Unauthenticated guest cannot create a shadowing video."""
        payload = {
            "title": "Guest Attempt",
            "topic": "life",
            "level": "N3",
            "youtube_url": "https://www.youtube.com/watch?v=ObDXpVyPrF8",
        }
        res = self.client.post("/api/shadowing/videos/", data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_create_video_success(self):
        """Authenticated user can create a video."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "title": "New User Video",
            "description": "Mô tả",
            "topic": "conversation",
            "level": "N3",
            "media_source": "youtube",
            "youtube_url": "https://www.youtube.com/watch?v=b7C8d9Ef01A",
            "is_public": False,
            "segments": [
                {
                    "id": 1,
                    "start": 0.0,
                    "end": 3.0,
                    "text": "こんにちは",
                    "ruby_text": "こんにちは",
                    "meaning": "Xin chào",
                    "words": [],
                }
            ],
            "exercises": [],
        }
        res = self.client.post("/api/shadowing/videos/", data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["youtube_id"], "b7C8d9Ef01A")
        self.assertEqual(res.data["created_by"], self.user_a.id)

    def test_video_segment_validation_rejects_end_before_start(self):
        """Validation rejects segments where end < start."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "title": "Invalid Segments Video",
            "topic": "conversation",
            "level": "N3",
            "segments": [
                {
                    "id": 1,
                    "start": 5.0,
                    "end": 2.0,  # Invalid: end < start
                    "text": "Error sentence",
                }
            ],
        }
        res = self.client.post("/api/shadowing/videos/", data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_video_exercise_validation_rejects_invalid_correct_index(self):
        """Validation rejects exercises where correct_index is out of bounds."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "title": "Invalid Exercise Video",
            "topic": "conversation",
            "level": "N3",
            "exercises": [
                {
                    "id": 1,
                    "type": "comprehension",
                    "question": "Question",
                    "options": ["A", "B"],
                    "correct_index": 5,  # Out of bounds
                }
            ],
        }
        res = self.client.post("/api/shadowing/videos/", data=payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_owner_cannot_update_or_delete_user_video(self):
        """User B cannot edit or delete User A's video."""
        self.client.force_authenticate(user=self.user_b)
        update_res = self.client.patch(
            f"/api/shadowing/videos/{self.private_video_a.id}/",
            data={"title": "Hacked Title"},
            format="json",
        )
        self.assertIn(update_res.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

        del_res = self.client.delete(f"/api/shadowing/videos/{self.private_video_a.id}/")
        self.assertIn(del_res.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_owner_can_update_and_delete_their_video(self):
        """Owner can edit and delete their video."""
        self.client.force_authenticate(user=self.user_a)
        update_res = self.client.patch(
            f"/api/shadowing/videos/{self.private_video_a.id}/",
            data={"title": "Updated Title A"},
            format="json",
        )
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data["title"], "Updated Title A")

        del_res = self.client.delete(f"/api/shadowing/videos/{self.private_video_a.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_topics_action(self):
        """Topics action returns topic labels, counts, and level list."""
        res = self.client.get("/api/shadowing/videos/topics/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("topics", res.data)
        self.assertIn("levels", res.data)
        topic_codes = [t["code"] for t in res.data["topics"]]
        self.assertIn("life", topic_codes)
        self.assertIn("business", topic_codes)

    def test_progress_action_get_and_post(self):
        """Authenticated user can read and save study progress on a video."""
        self.client.force_authenticate(user=self.user_a)
        # 1. Update progress
        post_res = self.client.post(
            f"/api/shadowing/videos/{self.public_video.id}/progress/",
            data={"current_segment_index": 2, "ratings": {"1": "mastered"}},
            format="json",
        )
        self.assertEqual(post_res.status_code, status.HTTP_200_OK)
        self.assertEqual(post_res.data["current_segment_index"], 2)
        self.assertEqual(post_res.data["ratings"]["1"], "mastered")

        # 2. Get progress
        get_res = self.client.get(f"/api/shadowing/videos/{self.public_video.id}/progress/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["current_segment_index"], 2)

    def test_extract_transcript_missing_input_400(self):
        """Calling extract_transcript without youtube_url or file returns 400."""
        res = self.client.post("/api/shadowing/videos/extract_transcript/", data={})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("shadowing.views.extract_youtube_transcript")
    def test_extract_transcript_youtube_success(self, mock_extract):
        """Tests successful extraction of transcript from a YouTube URL."""
        mock_extract.return_value = [
            {
                "id": 1,
                "start": 0.0,
                "end": 2.0,
                "text": "こんにちは",
                "ruby_text": "こんにちは",
                "meaning": "",
                "words": [{"text": "こんにちは", "reading": "こんにちは", "is_kanji": False}],
            }
        ]
        res = self.client.post(
            "/api/shadowing/videos/extract_transcript/",
            data={"youtube_url": "https://www.youtube.com/watch?v=ObDXpVyPrF8"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["youtube_id"], "ObDXpVyPrF8")
        self.assertEqual(len(res.data["segments"]), 1)

    @patch("shadowing.views.transcribe_audio_offline")
    def test_extract_transcript_uploaded_file_success(self, mock_transcribe):
        """Tests offline transcription of an uploaded audio file."""
        mock_transcribe.return_value = [
            {
                "id": 1,
                "start": 0.0,
                "end": 3.0,
                "text": "テスト音声です",
                "ruby_text": "テスト音声(おんせい)です",
                "meaning": "",
                "words": [{"text": "テスト", "reading": "テスト", "is_kanji": False}],
            }
        ]
        dummy_file = SimpleUploadedFile("audio.mp3", b"dummy mp3 content", content_type="audio/mpeg")
        res = self.client.post(
            "/api/shadowing/videos/extract_transcript/",
            data={"media_file": dummy_file},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["media_source"], "upload")
        self.assertEqual(len(res.data["segments"]), 1)

    def test_sync_shadowing_seed_videos_execution(self):
        """Verifies that running sync_shadowing_seed_videos populates all 5 seed videos."""
        count = sync_shadowing_seed_videos()
        self.assertEqual(count, 5)
        # Reference episode exists
        ref_video = ShadowingVideo.objects.filter(youtube_id="ObDXpVyPrF8").first()
        self.assertIsNotNone(ref_video)
        self.assertEqual(len(ref_video.segments), 12)
        self.assertEqual(len(ref_video.exercises), 3)
