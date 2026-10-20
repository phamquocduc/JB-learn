from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Card, Course

User = get_user_model()


class AdversarialAuthHeadersTestCase(APITestCase):
    """Adversarially probe invalid, malformed, and deleted token auth headers."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="adv_user",
            email="adv_user@example.com",
            password="StrongPassword123!",
        )
        self.token = Token.objects.create(user=self.user)
        self.me_url = reverse("cards:auth_me")
        self.logout_url = reverse("cards:auth_logout")
        self.courses_url = reverse("cards:course-list")
        self.cards_url = reverse("cards:card-list")

    def test_invalid_token_header_rejected_with_401(self):
        """Header with non-existent token key must return 401 Unauthorized, never 500."""
        self.client.credentials(HTTP_AUTHORIZATION="Token invalid_key_does_not_exist_12345")
        
        # Protected endpoints
        res_me = self.client.get(self.me_url)
        self.assertEqual(res_me.status_code, status.HTTP_401_UNAUTHORIZED)

        res_logout = self.client.post(self.logout_url)
        self.assertEqual(res_logout.status_code, status.HTTP_401_UNAUTHORIZED)

        res_post_course = self.client.post(self.courses_url, {"title": "Test Course"})
        self.assertEqual(res_post_course.status_code, status.HTTP_401_UNAUTHORIZED)

        res_post_card = self.client.post(self.cards_url, {"front_text": "Test Card"})
        self.assertEqual(res_post_card.status_code, status.HTTP_401_UNAUTHORIZED)

        # Read endpoints with invalid token: DRF raises AuthenticationFailed -> 401
        res_get_cards = self.client.get(self.cards_url)
        self.assertEqual(res_get_cards.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_malformed_auth_headers_handled_gracefully(self):
        """Malformed auth headers must not cause server crashes (500)."""
        malformed_headers = [
            "Token",                     # Missing token value
            "Token ",                    # Only space
            "Token     ",                # Multiple spaces
            "Bearer valid_or_invalid",   # Wrong auth scheme
            "Basic dXNlcjpwYXNz",        # Basic auth scheme
            "RandomGarbageHeader 123",   # Completely unknown scheme
            "",                          # Empty string
        ]

        for auth_hdr in malformed_headers:
            self.client.credentials(HTTP_AUTHORIZATION=auth_hdr)
            response = self.client.get(self.me_url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Failed on header: {auth_hdr!r}",
            )

    def test_deleted_token_rejected_with_401(self):
        """Request using a token that was deleted from the database must return 401."""
        token_key = self.token.key
        self.token.delete()

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        res_me = self.client.get(self.me_url)
        self.assertEqual(res_me.status_code, status.HTTP_401_UNAUTHORIZED)

        res_logout = self.client.post(self.logout_url)
        self.assertEqual(res_logout.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_double_logout_idempotency_and_revocation(self):
        """First logout succeeds and deletes token; second logout with same token returns 401."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        
        # First logout
        res1 = self.client.post(self.logout_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

        # Second logout with now-revoked token
        res2 = self.client.post(self.logout_url)
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)


class AdversarialInputValidationTestCase(APITestCase):
    """Adversarially probe boundary conditions, missing fields, extreme lengths, and invalid choices."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="validator_user",
            email="validator@example.com",
            password="StrongPassword123!",
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.courses_url = reverse("cards:course-list")
        self.cards_url = reverse("cards:card-list")

    def test_course_missing_required_title(self):
        """Course creation without title must return 400 Bad Request."""
        res_empty = self.client.post(self.courses_url, {})
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", res_empty.data)

        res_blank = self.client.post(self.courses_url, {"title": ""})
        self.assertEqual(res_blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", res_blank.data)

    def test_course_excessively_long_title(self):
        """Title longer than 255 chars must return 400, never crash MySQL with 500."""
        long_title = "A" * 256
        res = self.client.post(self.courses_url, {"title": long_title})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", res.data)

    def test_course_invalid_level_and_card_type(self):
        """Invalid level or card_type choices must return 400 Bad Request."""
        res_level = self.client.post(
            self.courses_url, {"title": "Valid Title", "level": "N99"}
        )
        self.assertEqual(res_level.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("level", res_level.data)

        res_type = self.client.post(
            self.courses_url, {"title": "Valid Title", "card_type": "invalid_type"}
        )
        self.assertEqual(res_type.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("card_type", res_type.data)

    def test_course_huge_description_supported(self):
        """Large description (up to 20KB) in TextField is cleanly accepted."""
        large_desc = "Mô tả khóa học rất dài. " * 500
        res = self.client.post(
            self.courses_url, {"title": "Khóa học mô tả lớn", "description": large_desc}
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Khóa học mô tả lớn")

    def test_card_missing_required_front_text(self):
        """Card creation without front_text must return 400 Bad Request."""
        res_empty = self.client.post(self.cards_url, {})
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("front_text", res_empty.data)

        res_blank = self.client.post(self.cards_url, {"front_text": ""})
        self.assertEqual(res_blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("front_text", res_blank.data)

    def test_card_excessively_long_front_text(self):
        """front_text longer than 255 chars must return 400."""
        long_front = "B" * 256
        res = self.client.post(self.cards_url, {"front_text": long_front})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("front_text", res.data)

    def test_card_invalid_level_and_type(self):
        """Invalid level or card_type choices must return 400 Bad Request."""
        res_level = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "level": "N99"}
        )
        self.assertEqual(res_level.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("level", res_level.data)

        res_type = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "card_type": "invalid_type"}
        )
        self.assertEqual(res_type.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("card_type", res_type.data)

    def test_card_invalid_course_foreign_key(self):
        """Non-existent or malformed course FK must return 400 Bad Request."""
        # Non-existent ID
        res_nonexistent = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "course": 999999}
        )
        self.assertEqual(res_nonexistent.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("course", res_nonexistent.data)

        # String value for integer PK
        res_str = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "course": "not_an_int"}
        )
        self.assertEqual(res_str.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("course", res_str.data)

    def test_card_excessively_long_lesson_and_source(self):
        """CharField boundary violations (lesson > 100, source > 255) must return 400."""
        res_lesson = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "lesson": "L" * 101}
        )
        self.assertEqual(res_lesson.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lesson", res_lesson.data)

        res_source = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "source": "S" * 256}
        )
        self.assertEqual(res_source.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("source", res_source.data)

    def test_card_negative_display_order_rejected(self):
        """display_order < 0 must be rejected with 400 Bad Request."""
        res = self.client.post(
            self.cards_url, {"front_text": "~てたまらない", "display_order": -1}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("display_order", res.data)



class AdversarialFiltersAndSearchTestCase(APITestCase):
    """Adversarially probe filter combinations and search escaping on /api/cards/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="filter_user",
            email="filter@example.com",
            password="StrongPassword123!",
        )
        self.token = Token.objects.create(user=self.user)
        self.courses_url = reverse("cards:course-list")
        self.cards_url = reverse("cards:card-list")

        # Create sample public and private cards
        self.card_public = Card.objects.create(
            front_text="100% 正解 (100% đúng)",
            meaning="Đúng 100% có ký tự đặc biệt % và dấu ngoặc",
            examples="テストで100%を取った。",
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            is_public=True,
            created_by=None,
        )
        self.card_user = Card.objects.create(
            front_text="~にしては (dù là)",
            meaning="Tuy là ~ nhưng mà...",
            examples="彼_女にしては上出来だ。",
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 2",
            is_public=False,
            created_by=self.user,
        )

    def test_mine_filter_guest_vs_authenticated(self):
        """mine=true for guest must return empty results; for owner returns only their cards."""
        # Unauthenticated guest
        res_guest = self.client.get(self.cards_url, {"mine": "true"})
        self.assertEqual(res_guest.status_code, status.HTTP_200_OK)
        self.assertEqual(res_guest.data["total"], 0)
        self.assertEqual(res_guest.data["results"], [])

        # Authenticated user
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        res_auth = self.client.get(self.cards_url, {"mine": "true"})
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data["total"], 1)
        self.assertEqual(res_auth.data["results"][0]["id"], self.card_user.id)

    def test_search_special_characters_and_sql_wildcards(self):
        """Search query escaping must handle %, _, quotes, backslashes, and SQL injection cleanly."""
        test_queries = [
            "%",                              # SQL wildcard %
            "100%",                           # literal % match
            "_",                              # SQL wildcard _
            "彼_女",                          # literal _ match
            "' OR '1'='1",                   # SQL injection attempt
            "'; DROP TABLE cards_card; --",   # SQL injection attempt
            '" OR ""="',                      # double quote SQL injection
            "\\",                             # single backslash
            "(100% đúng)",                    # parentheses
            "<script>alert(1)</script>",      # XSS payload
            "日本語とベトナム語",               # CJK + Vietnamese
            "   ",                            # whitespace only
            "A" * 1000,                       # very long query
        ]

        for q in test_queries:
            res = self.client.get(self.cards_url, {"search": q})
            self.assertEqual(
                res.status_code,
                status.HTTP_200_OK,
                f"Query {q!r} failed with status {res.status_code}",
            )

        # Verify literal % match finds card_public and not card_user
        res_percent = self.client.get(self.cards_url, {"search": "100%"})
        self.assertEqual(res_percent.data["total"], 1)
        self.assertEqual(res_percent.data["results"][0]["id"], self.card_public.id)

    def test_filter_combinations_and_nonexistent_values(self):
        """Combining filters and passing non-matching enum values must return empty list, not crash."""
        res = self.client.get(
            self.cards_url,
            {"type": "nonexistent_type", "level": "N99", "lesson": "Unknown Lesson"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total"], 0)

    def test_course_filter_non_numeric_query_param(self):
        """Querying ?course=abc or non-numeric course id must return 200 with 0 results or 400, not 500 crash."""
        res = self.client.get(self.cards_url, {"course": "invalid_course_id"})
        self.assertIn(
            res.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
            f"Querying ?course=invalid returned unexpected status {res.status_code}",
        )



class AdversarialSyncCardsTestCase(APITestCase):
    """Adversarially probe zero data loss on sync_cards."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username="sync_user1",
            email="sync1@example.com",
            password="StrongPassword123!",
        )
        self.user2 = User.objects.create_user(
            username="sync_user2",
            email="sync2@example.com",
            password="StrongPassword123!",
        )

        # Custom course and cards for User 1
        self.course_u1 = Course.objects.create(
            title="User 1 Custom Course",
            created_by=self.user1,
            is_public=False,
        )
        self.card_u1_pub = Card.objects.create(
            front_text="U1 Public Card",
            meaning="Meaning 1",
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            course=self.course_u1,
            created_by=self.user1,
            is_public=True,
        )
        self.card_u1_priv = Card.objects.create(
            front_text="U1 Private Card",
            meaning="Meaning 2",
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            course=self.course_u1,
            created_by=self.user1,
            is_public=False,
        )

        # Custom course and cards for User 2
        self.course_u2 = Course.objects.create(
            title="User 2 Custom Course",
            created_by=self.user2,
            is_public=True,
        )
        self.card_u2_pub = Card.objects.create(
            front_text="U2 Public Card",
            meaning="Meaning 3",
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N2,
            course=self.course_u2,
            created_by=self.user2,
            is_public=True,
        )

    def test_sync_cards_zero_data_loss_and_repeated_execution(self):
        """Verify that user-created courses and cards are 100% preserved after multiple sync runs."""
        with TemporaryDirectory() as tmp_dir:
            csv_file = Path(tmp_dir) / "adversarial_sync.csv"
            csv_file.write_text(
                '"STT","Bài","Cấu Trúc Ngữ Pháp","Ý Nghĩa","Cách Chia / Nối Thể","Phạm Vi Sử Dụng & Chú Ý","Ví Dụ Minh Họa","Nguồn"\n'
                '"1","Bài 1","~につれて","Càng... càng...","Vる/N + につれて","Biến đổi tỷ lệ thuận","年をとるにつれて記憶力が衰える。","Shin N3"\n'
                '"2","Bài 1","~にしたがって","Theo như, càng... càng...","Vる/N + にしたがって","Cùng biến đổi","予定にしたがって行動する。","Shin N3"\n',
                encoding="utf-8-sig",
            )

            out = StringIO()
            
            # Execute sync_cards 3 times consecutively
            for run_num in range(1, 4):
                call_command(
                    "sync_cards",
                    csv=str(csv_file),
                    type=Card.CardType.GRAMMAR,
                    level=Card.JLPTLevel.N3,
                    stdout=out,
                )

                # 1. User 1 courses and cards intact
                self.assertTrue(Course.objects.filter(pk=self.course_u1.pk).exists())
                self.assertTrue(Card.objects.filter(pk=self.card_u1_pub.pk).exists())
                self.assertTrue(Card.objects.filter(pk=self.card_u1_priv.pk).exists())

                # 2. User 2 courses and cards intact
                self.assertTrue(Course.objects.filter(pk=self.course_u2.pk).exists())
                self.assertTrue(Card.objects.filter(pk=self.card_u2_pub.pk).exists())

                # 3. Exactly 2 system cards created/maintained, not duplicated
                system_cards = Card.objects.filter(
                    created_by__isnull=True,
                    card_type=Card.CardType.GRAMMAR,
                    level=Card.JLPTLevel.N3,
                )
                self.assertEqual(
                    system_cards.count(),
                    2,
                    f"Run {run_num}: Expected 2 system cards, got {system_cards.count()}",
                )

                # 4. Default course is not duplicated
                self.assertEqual(
                    Course.objects.filter(title="Shinkanzen Master N3 - Ngữ pháp").count(),
                    1,
                )

                # 5. System cards correctly linked to default course
                default_course = Course.objects.get(title="Shinkanzen Master N3 - Ngữ pháp")
                for sc in system_cards:
                    self.assertEqual(sc.course_id, default_course.id)
                    self.assertTrue(sc.is_public)
                    self.assertIsNone(sc.created_by)
