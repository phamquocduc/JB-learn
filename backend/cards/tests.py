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


class LegacyCardAPITestCase(APITestCase):
    def setUp(self):
        self.card_b1 = Card.objects.create(
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            display_order=1,
            front_text="~うちに ...(1)",
            meaning="Nhân lúc, khi còn",
            conjugation="Vる + うちに",
            usage_notes="Tranh thủ trước khi trạng thái kết thúc",
            examples="日本にいるうちに、富士山に登りたい。 (Nhân lúc ở Nhật tôi muốn leo núi Phú Sĩ.)",
            source="Shin N3 (Trang 1)",
            is_public=True,
        )
        self.card_b2 = Card.objects.create(
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 2",
            display_order=2,
            front_text="~おかげで",
            meaning="Nhờ có ~",
            conjugation="Vる/Vた + おかげで",
            examples="先生のおかげで合格した。",
            is_public=True,
        )
        self.card_b10 = Card.objects.create(
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 10",
            display_order=10,
            front_text="~に違いない",
            meaning="Chắc chắn là ~",
            examples="犯人は彼に違いない。",
            is_public=True,
        )
        self.vocab_card = Card.objects.create(
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            display_order=1,
            front_text="約束 (やくそく)",
            meaning="Lời hứa, cuộc hẹn",
            extra_data={"kanji": "約束", "reading": "やくそく"},
            is_public=True,
        )

    def test_lesson_filter_does_not_leak_partial_matches(self):
        url = reverse("cards:grammar_list")
        response = self.client.get(url, {"lesson": "bài 1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["grammar"], "~うちに ...(1)")

    def test_distinct_lessons_preserves_display_order(self):
        lessons = Card.objects.grammar().distinct_lessons()
        self.assertEqual(lessons, ["Bài 1", "Bài 2", "Bài 10"])

    def test_grammar_list_search_unicode_and_query_count(self):
        url = reverse("cards:grammar_list")
        with self.assertNumQueries(2):
            response = self.client.get(url, {"search": "NHÂN LÚC"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["front_text"], "~うちに ...(1)")
        self.assertEqual(response.data["lessons"], ["Bài 1", "Bài 2", "Bài 10"])

        res_special = self.client.get(url, {"search": "...(1)"})
        self.assertEqual(res_special.data["total"], 1)

    def test_filter_by_card_type_supports_vocabulary_and_kanji(self):
        url = reverse("cards:grammar_list")
        response = self.client.get(url, {"type": Card.CardType.VOCABULARY})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["front_text"], "約束 (やくそく)")
        self.assertEqual(response.data["results"][0]["extra_data"]["reading"], "やくそく")

    def test_sync_cards_management_command(self):
        with TemporaryDirectory() as tmp_dir:
            csv_file = Path(tmp_dir) / "sample.csv"
            csv_file.write_text(
                '"STT","Bài","Cấu Trúc Ngữ Pháp","Ý Nghĩa","Cách Chia / Nối Thể","Phạm Vi Sử Dụng & Chú Ý","Ví Dụ Minh Họa","Nguồn"\n'
                '"1","Bài 1","~わけだ","Bảo sao mà ~","Vる + わけだ","Kết luận hiển nhiên","暑いわけだ。","Shin N3"\n',
                encoding="utf-8-sig",
            )
            out = StringIO()
            call_command(
                "sync_cards",
                csv=str(csv_file),
                type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N3,
                stdout=out,
            )
            self.assertEqual(Card.objects.grammar().count(), 1)
            synced = Card.objects.grammar().first()
            self.assertEqual(synced.front_text, "~わけだ")
            self.assertEqual(synced.grammar, "~わけだ")
            self.assertEqual(
                Card.objects.by_type(Card.CardType.VOCABULARY).count(), 1
            )

    def test_sync_kanji_cards_creates_kanji_course_and_extra_data(self):
        with TemporaryDirectory() as tmp_dir:
            csv_file = Path(tmp_dir) / "kanji_sample.csv"
            csv_file.write_text(
                '"STT","Bài","Hán Tự","Từ Vựng","Hán Việt","Ý Nghĩa","Cách Đọc / Âm Hán Việt","Ghi Chú","Nguồn"\n'
                '"1","Bài 1","涙","なみだ","LỆ","Nước mắt","なみだ • LỆ","Âm Hán Việt: LỆ — Từ vựng / Cách đọc: なみだ","kanji-n3 (Trang 1)"\n',
                encoding="utf-8-sig",
            )
            out = StringIO()
            call_command(
                "sync_cards",
                csv=str(csv_file),
                type=Card.CardType.KANJI,
                level=Card.JLPTLevel.N3,
                stdout=out,
            )
            kanji_cards = Card.objects.by_type(Card.CardType.KANJI)
            self.assertEqual(kanji_cards.count(), 1)
            synced = kanji_cards.first()
            self.assertEqual(synced.front_text, "涙")
            self.assertEqual(synced.meaning, "Nước mắt")
            self.assertEqual(synced.conjugation, "なみだ • LỆ")
            self.assertEqual(synced.extra_data["reading"], "なみだ")
            self.assertEqual(synced.extra_data["han_viet"], "LỆ")
            self.assertEqual(
                synced.course.title, "Tổng hợp Hán tự & Từ vựng Kanji N3"
            )
            self.assertEqual(synced.course.card_type, Card.CardType.KANJI)


class AuthAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="Password123!",
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.register_url = reverse("cards:auth_register")
        self.login_url = reverse("cards:auth_login")
        self.logout_url = reverse("cards:auth_logout")
        self.me_url = reverse("cards:auth_me")

    def test_user_registration_success(self):
        payload = {
            "username": "new_learner",
            "email": "newlearner@example.com",
            "password": "SecurePassword123!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "new_learner")
        self.assertEqual(response.data["user"]["email"], "newlearner@example.com")
        self.assertTrue(User.objects.filter(username="new_learner").exists())

    def test_user_registration_duplicate_username_case_insensitive(self):
        payload = {
            "username": "TESTUSER",
            "email": "other@example.com",
            "password": "SecurePassword123!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_user_registration_duplicate_email_case_insensitive(self):
        payload = {
            "username": "unique_name",
            "email": "TESTUSER@EXAMPLE.COM",
            "password": "SecurePassword123!",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_user_registration_short_password(self):
        payload = {
            "username": "short_pass_user",
            "email": "short@example.com",
            "password": "short",
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_login_with_username_success(self):
        payload = {"username": "testuser", "password": "Password123!"}
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], self.token.key)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_login_with_username_case_insensitive_success(self):
        payload = {"username": "TESTUSER", "password": "Password123!"}
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], self.token.key)

    def test_login_with_email_case_insensitive_success(self):
        payload = {"username": "TESTUSER@EXAMPLE.COM", "password": "Password123!"}
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], self.token.key)

    def test_login_invalid_password(self):
        payload = {"username": "testuser", "password": "WrongPassword!"}
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)

    def test_login_unknown_user(self):
        payload = {"username": "non_existent_user", "password": "Password123!"}
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Đăng xuất thành công.")
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())

        # Further requests with deleted token should fail
        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_unauthenticated(self):
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_me_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "testuser@example.com")

    def test_current_user_me_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CourseAPITestCase(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            username="user_a",
            email="usera@example.com",
            password="Password123!",
        )
        self.token_a, _ = Token.objects.get_or_create(user=self.user_a)

        self.user_b = User.objects.create_user(
            username="user_b",
            email="userb@example.com",
            password="Password123!",
        )
        self.token_b, _ = Token.objects.get_or_create(user=self.user_b)

        # System public course
        self.system_course = Course.objects.create(
            title="System Public Course N3",
            description="System grammar course",
            level=Card.JLPTLevel.N3,
            card_type=Card.CardType.GRAMMAR,
            is_public=True,
            created_by=None,
        )

        # User A public course
        self.user_a_pub_course = Course.objects.create(
            title="User A Public Course N2",
            description="User A public course",
            level=Card.JLPTLevel.N2,
            card_type=Card.CardType.VOCABULARY,
            is_public=True,
            created_by=self.user_a,
        )

        # User A private course
        self.user_a_priv_course = Course.objects.create(
            title="User A Private Course N1",
            description="User A private notes",
            level=Card.JLPTLevel.N1,
            card_type=Card.CardType.KANJI,
            is_public=False,
            created_by=self.user_a,
        )

        self.courses_url = reverse("cards:course-list")

    def test_guest_list_courses_only_public(self):
        response = self.client.get(self.courses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [c["title"] for c in response.data]
        self.assertIn("System Public Course N3", titles)
        self.assertIn("User A Public Course N2", titles)
        self.assertNotIn("User A Private Course N1", titles)

    def test_guest_course_detail_public_allowed_private_404(self):
        pub_url = reverse("cards:course-detail", kwargs={"pk": self.system_course.pk})
        response = self.client.get(pub_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        priv_url = reverse("cards:course-detail", kwargs={"pk": self.user_a_priv_course.pk})
        response = self.client.get(priv_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_create_course_rejected(self):
        payload = {
            "title": "Guest Course",
            "level": "N3",
            "card_type": "grammar",
            "is_public": True,
        }
        response = self.client.post(self.courses_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_create_public_and_private_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        # Public course
        res_pub = self.client.post(
            self.courses_url,
            {
                "title": "New Public Course",
                "level": "N4",
                "card_type": "grammar",
                "is_public": True,
            },
        )
        self.assertEqual(res_pub.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_pub.data["is_owner"])
        self.assertEqual(res_pub.data["created_by_username"], "user_a")

        # Private course
        res_priv = self.client.post(
            self.courses_url,
            {
                "title": "New Private Course",
                "level": "N5",
                "card_type": "vocabulary",
                "is_public": False,
            },
        )
        self.assertEqual(res_priv.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res_priv.data["is_public"])
        self.assertTrue(res_priv.data["is_owner"])

    def test_course_privacy_isolation_between_users(self):
        # User B list: User A's private course must not appear
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b.key}")
        response = self.client.get(self.courses_url)
        titles = [c["title"] for c in response.data]
        self.assertNotIn("User A Private Course N1", titles)

        # User B direct detail access to User A's private course returns 404
        priv_url = reverse("cards:course-detail", kwargs={"pk": self.user_a_priv_course.pk})
        response_priv = self.client.get(priv_url)
        self.assertEqual(response_priv.status_code, status.HTTP_404_NOT_FOUND)

        # User A list: User A sees own private course
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        response_a = self.client.get(self.courses_url)
        titles_a = [c["title"] for c in response_a.data]
        self.assertIn("User A Private Course N1", titles_a)

        # User A mine filter: returns only User A's courses
        response_mine = self.client.get(self.courses_url, {"mine": "true"})
        self.assertEqual(response_mine.status_code, status.HTTP_200_OK)
        for c in response_mine.data:
            self.assertTrue(c["is_owner"])

    def test_non_owner_update_or_delete_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b.key}")
        url = reverse("cards:course-detail", kwargs={"pk": self.user_a_pub_course.pk})

        res_update = self.client.patch(url, {"title": "Hacked Title"})
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_course_cannot_be_modified_or_deleted_by_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        url = reverse("cards:course-detail", kwargs={"pk": self.system_course.pk})

        res_update = self.client.patch(url, {"title": "Changed System Course"})
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_update_and_delete_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        url = reverse("cards:course-detail", kwargs={"pk": self.user_a_pub_course.pk})

        res_update = self.client.patch(url, {"title": "Updated User A Course"})
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["title"], "Updated User A Course")

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Course.objects.filter(pk=self.user_a_pub_course.pk).exists())


class CardAPITestCaseExtended(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            username="user_a",
            email="usera@example.com",
            password="Password123!",
        )
        self.token_a, _ = Token.objects.get_or_create(user=self.user_a)

        self.user_b = User.objects.create_user(
            username="user_b",
            email="userb@example.com",
            password="Password123!",
        )
        self.token_b, _ = Token.objects.get_or_create(user=self.user_b)

        # Public course
        self.public_course = Course.objects.create(
            title="Public Course",
            level=Card.JLPTLevel.N3,
            card_type=Card.CardType.GRAMMAR,
            is_public=True,
            created_by=None,
        )

        # User A private course
        self.user_a_priv_course = Course.objects.create(
            title="User A Private Course",
            level=Card.JLPTLevel.N3,
            card_type=Card.CardType.GRAMMAR,
            is_public=False,
            created_by=self.user_a,
        )

        # System card
        self.system_card = Card.objects.create(
            course=self.public_course,
            created_by=None,
            is_public=True,
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            front_text="~うちに",
            meaning="Nhân lúc",
        )

        # User A public card
        self.user_a_pub_card = Card.objects.create(
            course=self.public_course,
            created_by=self.user_a,
            is_public=True,
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            front_text="~おかげで",
            meaning="Nhờ có",
        )

        # User A private card
        self.user_a_priv_card = Card.objects.create(
            course=self.user_a_priv_course,
            created_by=self.user_a,
            is_public=False,
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 2",
            front_text="~せいで",
            meaning="Tại vì (tiêu cực)",
        )

        self.cards_url = reverse("cards:card-list")

    def test_guest_list_cards_only_public(self):
        response = self.client.get(self.cards_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)
        front_texts = [c["front_text"] for c in response.data["results"]]
        self.assertIn("~うちに", front_texts)
        self.assertIn("~おかげで", front_texts)
        self.assertNotIn("~せいで", front_texts)

    def test_guest_card_detail_public_allowed_private_404(self):
        pub_url = reverse("cards:card-detail", kwargs={"pk": self.system_card.pk})
        res_pub = self.client.get(pub_url)
        self.assertEqual(res_pub.status_code, status.HTTP_200_OK)

        priv_url = reverse("cards:card-detail", kwargs={"pk": self.user_a_priv_card.pk})
        res_priv = self.client.get(priv_url)
        self.assertEqual(res_priv.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_create_card_rejected(self):
        payload = {
            "front_text": "~ばかり",
            "meaning": "Toàn là",
            "card_type": "grammar",
            "level": "N3",
            "is_public": True,
        }
        response = self.client.post(self.cards_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_create_public_and_private_cards(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        # Public card
        res_pub = self.client.post(
            self.cards_url,
            {
                "front_text": "~ばかり",
                "meaning": "Toàn là",
                "card_type": "grammar",
                "level": "N3",
                "is_public": True,
                "course": self.public_course.pk,
            },
        )
        self.assertEqual(res_pub.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_pub.data["is_public"])
        self.assertTrue(res_pub.data["is_owner"])

        # Private card
        res_priv = self.client.post(
            self.cards_url,
            {
                "front_text": "~きり",
                "meaning": "Chỉ, kể từ khi",
                "card_type": "grammar",
                "level": "N3",
                "is_public": False,
            },
        )
        self.assertEqual(res_priv.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res_priv.data["is_public"])
        self.assertTrue(res_priv.data["is_owner"])

    def test_card_privacy_isolation_between_users(self):
        # User B cannot see User A's private card in list
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b.key}")
        res_b = self.client.get(self.cards_url)
        front_texts_b = [c["front_text"] for c in res_b.data["results"]]
        self.assertNotIn("~せいで", front_texts_b)

        # User B cannot access User A's private card detail (404)
        priv_url = reverse("cards:card-detail", kwargs={"pk": self.user_a_priv_card.pk})
        res_priv = self.client.get(priv_url)
        self.assertEqual(res_priv.status_code, status.HTTP_404_NOT_FOUND)

        # User A sees own private card in list
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        res_a = self.client.get(self.cards_url)
        front_texts_a = [c["front_text"] for c in res_a.data["results"]]
        self.assertIn("~せいで", front_texts_a)

        # User A filters by mine=true
        res_mine = self.client.get(self.cards_url, {"mine": "true"})
        self.assertEqual(res_mine.data["total"], 2)  # 1 public + 1 private created by user_a
        for c in res_mine.data["results"]:
            self.assertTrue(c["is_owner"])

    def test_cannot_add_card_to_another_users_private_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b.key}")
        payload = {
            "front_text": "Thẻ xâm nhập",
            "card_type": "grammar",
            "level": "N3",
            "course": self.user_a_priv_course.pk,
            "is_public": True,
        }
        response = self.client.post(self.cards_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("course", response.data)

    def test_non_owner_update_or_delete_card_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_b.key}")
        url = reverse("cards:card-detail", kwargs={"pk": self.user_a_pub_card.pk})

        res_update = self.client.patch(url, {"meaning": "Ý nghĩa bị sửa"})
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_card_cannot_be_modified_or_deleted_by_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        url = reverse("cards:card-detail", kwargs={"pk": self.system_card.pk})

        res_update = self.client.patch(url, {"meaning": "Sửa thẻ hệ thống"})
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_card_owner_can_update_and_delete(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token_a.key}")
        url = reverse("cards:card-detail", kwargs={"pk": self.user_a_pub_card.pk})

        res_update = self.client.patch(url, {"meaning": "Ý nghĩa cập nhật"})
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["meaning"], "Ý nghĩa cập nhật")

        res_delete = self.client.delete(url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Card.objects.filter(pk=self.user_a_pub_card.pk).exists())

    def test_sync_cards_preserves_user_cards_and_is_idempotent(self):
        with TemporaryDirectory() as tmp_dir:
            csv_file = Path(tmp_dir) / "test_sync.csv"
            csv_file.write_text(
                '"STT","Bài","Cấu Trúc Ngữ Pháp","Ý Nghĩa","Cách Chia / Nối Thể","Phạm Vi Sử Dụng & Chú Ý","Ví Dụ Minh Họa","Nguồn"\n'
                '"1","Bài 1","~に沿って","Dọc theo, men theo","N + に沿って","Theo quy định/kế hoạch","計画に沿って進める。","Shin N3"\n'
                '"2","Bài 1","~に基づいて","Dựa trên","N + に基づいて","Lấy làm căn cứ","データに基づいて判断する。","Shin N3"\n',
                encoding="utf-8-sig",
            )
            out = StringIO()
            call_command(
                "sync_cards",
                csv=str(csv_file),
                type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N3,
                stdout=out,
            )

            # Check that user_a's cards still exist!
            self.assertTrue(Card.objects.filter(pk=self.user_a_pub_card.pk).exists())
            self.assertTrue(Card.objects.filter(pk=self.user_a_priv_card.pk).exists())

            # Check that system cards were updated
            system_cards = Card.objects.filter(created_by__isnull=True, card_type=Card.CardType.GRAMMAR)
            self.assertEqual(system_cards.count(), 2)

            # Re-run sync to confirm idempotency
            call_command(
                "sync_cards",
                csv=str(csv_file),
                type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N3,
                stdout=out,
            )
            self.assertEqual(
                Card.objects.filter(created_by__isnull=True, card_type=Card.CardType.GRAMMAR).count(),
                2,
            )
            self.assertTrue(Card.objects.filter(pk=self.user_a_pub_card.pk).exists())
            self.assertTrue(Card.objects.filter(pk=self.user_a_priv_card.pk).exists())
            self.assertEqual(
                Course.objects.filter(title="Shinkanzen Master N3 - Ngữ pháp").count(), 1
            )


class AnkiSpacedRepetitionTestCase(APITestCase):
    """Unit and API integration tests for Anki SM-2 / v2 Spaced Repetition Algorithm."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="anki_learner",
            email="anki@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_learner",
            email="other@example.com",
            password="StrongPassword123!",
        )
        self.card1 = Card.objects.create(
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            front_text="~うちに",
            meaning="Nhân lúc",
            is_public=True,
        )
        self.card2 = Card.objects.create(
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N3,
            lesson="Bài 1",
            front_text="約束",
            meaning="Lời hứa",
            is_public=True,
        )
        self.private_other_card = Card.objects.create(
            card_type=Card.CardType.GRAMMAR,
            level=Card.JLPTLevel.N2,
            lesson="Bài 2",
            front_text="~っこない",
            meaning="Không thể nào",
            is_public=False,
            created_by=self.other_user,
        )

    def test_anki_scheduler_learning_graduation_and_sm2_math(self):
        from datetime import timedelta
        from django.utils import timezone
        from .anki import get_interval_previews, schedule_card_review

        t0 = timezone.now()

        # 1. Initial previews on a new card: 1m, 6m, 10m, 4d
        previews_new = get_interval_previews(None, now=t0)
        self.assertEqual(previews_new["again"], "1 phút")
        self.assertEqual(previews_new["hard"], "6 phút")
        self.assertEqual(previews_new["good"], "10 phút")
        self.assertEqual(previews_new["easy"], "4 ngày")

        # 2. Press Good (3) on new card -> advances to step 1 (10m) in learning
        s1 = schedule_card_review(None, "good", now=t0)
        self.assertEqual(s1["state"], "learning")
        self.assertEqual(s1["step_index"], 1)
        self.assertEqual(s1["learning_minutes"], 10)
        self.assertEqual(s1["interval"], 0)
        self.assertEqual(s1["status"], "remembered")

        # 3. Press Good (3) on step 1 -> graduates to review with 1-day interval
        t1 = t0 + timedelta(minutes=10)
        s2 = schedule_card_review(s1, "good", now=t1)
        self.assertEqual(s2["state"], "review")
        self.assertEqual(s2["interval"], 1)
        self.assertAlmostEqual(s2["ease_factor"], 2.5)
        self.assertEqual(s2["status"], "remembered")

        # 4. Review on time with Good (3): 1d * 2.5 = 2.5 -> rounds to 2 or 3 days (min hard_ivl=2)
        t2 = t1 + timedelta(days=1)
        s3 = schedule_card_review(s2, "good", now=t2)
        self.assertEqual(s3["state"], "review")
        self.assertGreaterEqual(s3["interval"], 2)
        self.assertAlmostEqual(s3["ease_factor"], 2.5)

        # 5. Review with Easy (4): ease increases by +0.15 to 2.65, status becomes mastered
        t3 = t2 + timedelta(days=s3["interval"])
        s4 = schedule_card_review(s3, "easy", now=t3)
        self.assertEqual(s4["state"], "review")
        self.assertAlmostEqual(s4["ease_factor"], 2.65)
        self.assertEqual(s4["status"], "mastered")
        self.assertGreater(s4["interval"], s3["interval"])

        # 6. Lapse with Again (1): enters relearning (10m), lapses=1, ease drops by 0.20 to 2.45, interval halved
        t4 = t3 + timedelta(days=s4["interval"])
        s5 = schedule_card_review(s4, "again", now=t4)
        self.assertEqual(s5["state"], "relearning")
        self.assertEqual(s5["lapses"], 1)
        self.assertAlmostEqual(s5["ease_factor"], 2.45)
        self.assertEqual(s5["learning_minutes"], 10)
        self.assertEqual(s5["status"], "learned")
        self.assertEqual(s5["interval"], max(1, int(round(s4["interval"] * 0.5))))

        # 6b. In relearning, Hard (2) uses 1.5x single step (15m), distinct from Again (10m)
        relearn_previews = get_interval_previews(s5, now=t4)
        self.assertEqual(relearn_previews["again"], "10 phút")
        self.assertEqual(relearn_previews["hard"], "15 phút")

        # 7. Graduate from relearning with Good (3) -> returns to review with post-lapse interval
        t5 = t4 + timedelta(minutes=10)
        s6 = schedule_card_review(s5, "good", now=t5)
        self.assertEqual(s6["state"], "review")
        self.assertEqual(s6["interval"], s5["interval"])

    def test_ease_factor_floor_and_overdue_bonus_and_validation(self):
        from datetime import timedelta
        from django.utils import timezone
        from .anki import normalize_rating, schedule_card_review

        now = timezone.now()
        state = {
            "state": "review",
            "status": "remembered",
            "step_index": 0,
            "interval": 10,
            "learning_minutes": 0,
            "ease_factor": 1.35,
            "repetitions": 5,
            "lapses": 2,
            "due_at": now - timedelta(days=10),  # 10 days overdue
        }
        # Hard rating reduces ease by 0.15, clamped at 1.30 minimum
        after_hard = schedule_card_review(state, "hard", now=now)
        self.assertEqual(after_hard["ease_factor"], 1.3)
        self.assertEqual(after_hard["interval"], 12)  # 10 * 1.2

        # Good rating on 10-day overdue card gets overdue bonus: round((10 + 10/2) * 1.35) = 20 days
        after_good = schedule_card_review(state, "good", now=now)
        self.assertEqual(after_good["interval"], 20)

        # Reset rating returns default unseen state
        after_reset = schedule_card_review(state, "unseen", now=now)
        self.assertEqual(after_reset["state"], "new")
        self.assertEqual(after_reset["status"], "unseen")

        # Invalid ratings raise ValueError
        for bad in (None, True, False, "invalid", 99, -1):
            with self.assertRaises(ValueError):
                normalize_rating(bad)

    def test_review_endpoint_authenticated_and_guest_and_due_filtering(self):
        from datetime import timedelta
        from django.utils import timezone
        from .models import CardReview

        review_url = reverse("cards:card-review", kwargs={"pk": self.card1.pk})

        # 1. Guest review calculates statelessly without creating DB rows
        guest_res = self.client.post(review_url, {"rating": "good"}, format="json")
        self.assertEqual(guest_res.status_code, status.HTTP_200_OK)
        self.assertEqual(guest_res.data["state"], "learning")
        self.assertEqual(guest_res.data["learning_minutes"], 10)
        self.assertEqual(CardReview.objects.count(), 0)

        # 2. Authenticated review persists CardReview in DB
        self.client.force_authenticate(user=self.user)
        r1 = self.client.post(review_url, {"rating": "learned"}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data["state"], "learning")
        self.assertEqual(r1.data["status"], "learned")
        self.assertIn("next_intervals", r1.data)
        self.assertEqual(CardReview.objects.filter(user=self.user).count(), 1)

        # 3. Easy rating graduates card immediately to 4-day review
        r2 = self.client.post(review_url, {"rating": "mastered"}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["state"], "review")
        self.assertEqual(r2.data["interval"], 4)
        self.assertEqual(r2.data["status"], "mastered")

        # 4. Card is due in 4 days -> ?due=true returns 0 cards right now
        list_url = reverse("cards:card-list")
        due_now_res = self.client.get(list_url, {"due": "true"})
        self.assertEqual(due_now_res.status_code, status.HTTP_200_OK)
        self.assertEqual(due_now_res.data["total"], 0)

        # 5. Move due_at into the past -> ?due=true returns card1 and srs_summary.due_count == 1
        # Also create a CardReview(state='new') for other_user on card1 to verify no cross-user ORM join exclusion
        CardReview.objects.create(
            user=self.other_user,
            card=self.card1,
            state=CardReview.ReviewState.NEW,
            status=CardReview.StudyStatus.UNSEEN,
        )
        CardReview.objects.filter(user=self.user, card=self.card1).update(
            due_at=timezone.now() - timedelta(hours=2)
        )
        all_res = self.client.get(list_url)
        self.assertEqual(all_res.status_code, status.HTTP_200_OK)
        self.assertEqual(all_res.data["srs_summary"]["due_count"], 1)
        self.assertTrue(all_res.data["srs_states"][str(self.card1.pk)]["is_due"])

        # Add a due learning review on card2 and verify ?due=true orders learning due before review due
        CardReview.objects.create(
            user=self.user,
            card=self.card2,
            state=CardReview.ReviewState.LEARNING,
            status=CardReview.StudyStatus.LEARNED,
            learning_minutes=10,
            due_at=timezone.now() - timedelta(minutes=5),
        )
        due_past_res = self.client.get(list_url, {"due": "true"})
        self.assertEqual(due_past_res.data["total"], 2)
        self.assertEqual(
            [c["id"] for c in due_past_res.data["results"]],
            [self.card2.pk, self.card1.pk],
        )

        # Verify ?srs_state=new returns 0 cards for self.user even though other_user has state='new' on card1
        new_state_res = self.client.get(list_url, {"srs_state": "new"})
        self.assertEqual(new_state_res.data["total"], 0)

        # 6. Resetting cards with 'unseen' deletes the CardReview rows
        CardReview.objects.filter(user=self.user, card=self.card2).delete()
        reset_res = self.client.post(review_url, {"rating": "unseen"}, format="json")
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reset_res.data["state"], "new")
        self.assertEqual(CardReview.objects.filter(user=self.user).count(), 0)

    def test_sync_reviews_endpoint_and_privacy_isolation(self):
        from datetime import timedelta
        from django.utils import timezone
        from .models import CardReview

        sync_url = reverse("cards:card-sync-reviews")
        self.client.force_authenticate(user=self.user)
        now = timezone.now()

        payload = {
            "reviews": {
                str(self.card1.pk): {
                    "state": "review",
                    "status": "mastered",
                    "step_index": 0,
                    "interval": 12,
                    "learning_minutes": 0,
                    "ease_factor": 2.65,
                    "repetitions": 4,
                    "lapses": 0,
                    "last_reviewed_at": (now - timedelta(days=1)).isoformat(),
                },
                str(self.card2.pk): "remembered",
                # Attempt to sync another user's private card (must be ignored)
                str(self.private_other_card.pk): "mastered",
            }
        }
        res = self.client.post(sync_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["synced"], 2)
        self.assertEqual(CardReview.objects.filter(user=self.user).count(), 2)
        self.assertFalse(
            CardReview.objects.filter(
                user=self.user, card=self.private_other_card
            ).exists()
        )

        # Untimestamped legacy backfill must not overwrite existing DB review with real last_reviewed_at
        res2 = self.client.post(
            sync_url,
            {"reviews": {str(self.card1.pk): "learned"}},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["synced"], 0)
        self.assertEqual(
            CardReview.objects.get(user=self.user, card=self.card1).interval,
            12,
        )

        # Deferred offline reset ("unseen" string and {"reset": True} dict) deletes CardReview rows
        res_reset = self.client.post(
            sync_url,
            {
                "reviews": {
                    str(self.card1.pk): {"state": "new", "status": "unseen", "reset": True},
                    str(self.card2.pk): "unseen",
                }
            },
            format="json",
        )
        self.assertEqual(res_reset.status_code, status.HTTP_200_OK)
        self.assertEqual(res_reset.data["synced"], 2)
        self.assertEqual(CardReview.objects.filter(user=self.user).count(), 0)
        self.assertEqual(
            res_reset.data["srs_states"][str(self.card1.pk)]["state"],
            "new",
        )

    def test_sync_cards_from_csv_preserves_card_ids_and_reviews(self):
        import tempfile
        from datetime import timedelta
        from pathlib import Path
        from django.utils import timezone
        from .models import CardReview
        from .services import sync_cards_from_csv

        csv_header = (
            "STT,Bài,Cấu Trúc Ngữ Pháp,Ý Nghĩa,Cách Chia / Nối Thể,"
            "Phạm Vi Sử Dụng & Chú Ý,Ví Dụ Minh Họa,Nguồn\n"
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            csv_file = Path(tmp_dir) / "grammar_n2.csv"
            csv_file.write_text(
                csv_header
                + "1,Bài 1,〜に関して,Liên quan đến,N + に関して,Văn viết,例1,Shin\n"
                + "2,Bài 1,〜に対して,Đối với,N + に対して,,例2,Shin\n"
                + "3,Bài 2,〜によって,Tùy theo,N + によって,,例3,Shin\n",
                encoding="utf-8-sig",
            )

            count1 = sync_cards_from_csv(
                csv_file,
                card_type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N2,
            )
            self.assertEqual(count1, 3)

            synced_cards = list(
                Card.objects.filter(
                    card_type=Card.CardType.GRAMMAR,
                    level=Card.JLPTLevel.N2,
                    created_by__isnull=True,
                ).order_by("display_order")
            )
            c1, c2, c3 = synced_cards
            orig_c1_id, orig_c2_id = c1.id, c2.id

            # User studies c1 (graduated review) and c2 (relearning), plus owns a custom N2 card
            due_c1 = timezone.now() + timedelta(days=4)
            due_c2 = timezone.now() + timedelta(minutes=10)
            CardReview.objects.create(
                user=self.user,
                card=c1,
                state=CardReview.ReviewState.REVIEW,
                status=CardReview.StudyStatus.MASTERED,
                interval=4,
                repetitions=2,
                due_at=due_c1,
                last_reviewed_at=timezone.now(),
                last_rating=4,
            )
            CardReview.objects.create(
                user=self.user,
                card=c2,
                state=CardReview.ReviewState.RELEARNING,
                status=CardReview.StudyStatus.LEARNED,
                interval=1,
                learning_minutes=10,
                lapses=1,
                due_at=due_c2,
                last_reviewed_at=timezone.now(),
                last_rating=1,
            )
            user_custom_card = Card.objects.create(
                created_by=self.user,
                is_public=False,
                card_type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N2,
                lesson="Bài 99",
                front_text="〜カスタム",
                meaning="Thẻ tự tạo",
            )

            # Re-sync CSV: update c1 meaning, move c2 to Bài 2 (Pass 2 match), drop c3, add c4
            csv_file.write_text(
                csv_header
                + "1,Bài 1,〜に関して,Liên quan mật thiết đến,N + に関して,Cập nhật,例1,Shin\n"
                + "2,Bài 2,〜に対して,Đối với / Trái ngược với,N + に対して,,例2,Shin\n"
                + "3,Bài 3,〜にわたって,Trải dài suốt,N + にわたって,,例4,Shin\n",
                encoding="utf-8-sig",
            )

            count2 = sync_cards_from_csv(
                csv_file,
                card_type=Card.CardType.GRAMMAR,
                level=Card.JLPTLevel.N2,
            )
            self.assertEqual(count2, 3)

            # Verify c1 and c2 kept exact PKs and updated content
            c1.refresh_from_db()
            c2.refresh_from_db()
            self.assertEqual(c1.id, orig_c1_id)
            self.assertEqual(c1.meaning, "Liên quan mật thiết đến")
            self.assertEqual(c2.id, orig_c2_id)
            self.assertEqual(c2.lesson, "Bài 2")
            self.assertFalse(Card.objects.filter(id=c3.id).exists())
            self.assertTrue(Card.objects.filter(id=user_custom_card.id).exists())

            # Verify both CardReview rows survived intact without CASCADE deletion
            rev1 = CardReview.objects.get(user=self.user, card_id=orig_c1_id)
            self.assertEqual(rev1.status, CardReview.StudyStatus.MASTERED)
            self.assertEqual(rev1.interval, 4)
            self.assertEqual(rev1.last_rating, 4)

            rev2 = CardReview.objects.get(user=self.user, card_id=orig_c2_id)
            self.assertEqual(rev2.state, CardReview.ReviewState.RELEARNING)
            self.assertEqual(rev2.last_rating, 1)

    def test_relearning_due_logic_and_null_due_at_consistency(self):
        from datetime import timedelta
        from django.utils import timezone
        from .anki import normalize_srs_state, serialize_srs_state
        from .models import CardReview

        # 1. normalize_srs_state defaults learning_minutes when <= 0 for learning and relearning
        norm_relearn = normalize_srs_state({"state": "relearning", "learning_minutes": 0, "step_index": 0})
        self.assertEqual(norm_relearn["learning_minutes"], 10)
        self.assertEqual(serialize_srs_state(norm_relearn)["interval_display"], "10 phút")

        norm_learn_step0 = normalize_srs_state({"state": "learning", "learning_minutes": 0, "step_index": 0})
        self.assertEqual(norm_learn_step0["learning_minutes"], 1)
        norm_learn_step1 = normalize_srs_state({"state": "learning", "learning_minutes": 0, "step_index": 1})
        self.assertEqual(norm_learn_step1["learning_minutes"], 10)

        # 2. Card rated 'again' (1 minute) is not due immediately, then becomes due after 1 minute
        self.client.force_authenticate(user=self.user)
        review_url = reverse("cards:card-review", kwargs={"pk": self.card1.pk})
        list_url = reverse("cards:card-list")

        r_again = self.client.post(review_url, {"rating": "again"}, format="json")
        self.assertEqual(r_again.status_code, status.HTTP_200_OK)
        self.assertEqual(r_again.data["state"], "learning")
        self.assertEqual(r_again.data["last_rating"], 1)
        self.assertEqual(r_again.data["learning_minutes"], 1)
        self.assertFalse(r_again.data["is_due"])

        # Before 1 minute expires: due=true returns 0
        res_before = self.client.get(list_url, {"due": "true"})
        self.assertEqual(res_before.data["total"], 0)

        # After 1 minute expires: due=true returns card1 and srs_states marks is_due=True
        CardReview.objects.filter(user=self.user, card=self.card1).update(
            due_at=timezone.now() - timedelta(seconds=5)
        )
        res_after = self.client.get(list_url, {"due": "1"})
        self.assertEqual(res_after.data["total"], 1)
        self.assertEqual(res_after.data["results"][0]["id"], self.card1.pk)
        self.assertTrue(res_after.data["srs_states"][str(self.card1.pk)]["is_due"])
        self.assertEqual(res_after.data["srs_summary"]["due_count"], 1)

        # 3. CardReview in relearning with due_at=None is treated as due by both srs_summary and ?due=true
        CardReview.objects.create(
            user=self.user,
            card=self.card2,
            state=CardReview.ReviewState.RELEARNING,
            status=CardReview.StudyStatus.LEARNED,
            learning_minutes=10,
            due_at=None,
            last_rating=1,
        )
        res_null_due = self.client.get(list_url, {"due": "true"})
        self.assertEqual(res_null_due.data["total"], 2)
        self.assertEqual(res_null_due.data["srs_summary"]["due_count"], 2)
        self.assertTrue(res_null_due.data["srs_states"][str(self.card2.pk)]["is_due"])


class LearningContentI18nTestCase(APITestCase):
    def setUp(self):
        from users.rbac import ensure_default_rbac_and_modules

        ensure_default_rbac_and_modules()
        self.owner = User.objects.create_user(
            username="i18n_owner",
            email="i18n_owner@example.com",
            password="StrongPassword123!",
        )
        self.viewer = User.objects.create_user(
            username="i18n_viewer",
            email="i18n_viewer@example.com",
            password="StrongPassword123!",
        )
        self.course = Course.objects.create(
            title="Từ vựng N5",
            description="Khoá học nền tảng tiếng Nhật",
            level=Card.JLPTLevel.N5,
            card_type=Card.CardType.VOCABULARY,
            is_public=True,
            created_by=self.owner,
            translations={
                "en": {
                    "title": "N5 Vocabulary Foundation",
                    "description": "Essential beginner Japanese vocabulary course",
                }
            },
        )
        self.card_translated = Card.objects.create(
            course=self.course,
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N5,
            lesson="Bài 1",
            front_text="食べる",
            meaning="Ăn",
            conjugation="Vる",
            usage_notes="Dùng cho bữa ăn hằng ngày",
            examples="ご飯を食べる。 (Ăn cơm.)",
            is_public=True,
            created_by=self.owner,
            translations={
                "en": {
                    "meaning": "To eat",
                    "conjugation": "Verb (ru-verb)",
                    "usage_notes": "Used for daily meals",
                    "examples": "Ex: ご飯を食べる。 (Eat rice.)",
                }
            },
        )
        self.card_untranslated = Card.objects.create(
            course=self.course,
            card_type=Card.CardType.VOCABULARY,
            level=Card.JLPTLevel.N5,
            lesson="Bài 1",
            front_text="飲む",
            meaning="Uống",
            is_public=True,
            created_by=self.owner,
        )

    def test_anki_intervals_and_auth_errors_switch_by_accept_language(self):
        from .anki import serialize_srs_state

        res_login_en = self.client.post(
            reverse("cards:auth_login"),
            {"username": "nobody", "password": "wrong"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(res_login_en.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Incorrect username/email or password", str(res_login_en.data))

        self.client.force_authenticate(user=self.viewer)
        review_url = reverse("cards:card-review", kwargs={"pk": self.card_translated.pk})
        r_en = self.client.post(
            review_url,
            {"rating": "again"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(r_en.status_code, status.HTTP_200_OK)
        self.assertEqual(r_en.data["interval_display"], "1 min")
        self.assertEqual(r_en.data["next_intervals"]["again"], "1 min")

        from django.utils import translation

        with translation.override("en"):
            unseen_en = serialize_srs_state(None)
            self.assertEqual(unseen_en["interval_display"], "Unseen")

    def test_course_and_card_translations_overlay_fallback_raw_and_search(self):
        list_url = reverse("cards:card-list")
        course_url = reverse("cards:course-list")

        # 1. Authenticated editor gets English overlay + untouched Vietnamese source_values
        self.client.force_authenticate(user=self.owner)
        res_en = self.client.get(list_url, HTTP_ACCEPT_LANGUAGE="en")
        self.assertEqual(res_en.status_code, status.HTTP_200_OK)
        cards_by_id = {row["id"]: row for row in res_en.data["results"]}

        t_card = cards_by_id[self.card_translated.pk]
        self.assertEqual(t_card["front_text"], "食べる")
        self.assertEqual(t_card["meaning"], "To eat")
        self.assertEqual(t_card["course_title"], "N5 Vocabulary Foundation")
        self.assertEqual(t_card["source_values"]["meaning"], "Ăn")

        # Card without English translation falls back automatically to Vietnamese
        f_card = cards_by_id[self.card_untranslated.pk]
        self.assertEqual(f_card["meaning"], "Uống")

        # 2. ?raw=1 returns original Vietnamese base strings even with Accept-Language: en
        res_raw = self.client.get(list_url, {"raw": "1"}, HTTP_ACCEPT_LANGUAGE="en")
        raw_by_id = {row["id"]: row for row in res_raw.data["results"]}
        self.assertEqual(raw_by_id[self.card_translated.pk]["meaning"], "Ăn")
        self.assertNotIn("source_values", raw_by_id[self.card_translated.pk])

        # 3. Search hits nested English JSONField translation (`translations.en`)
        res_search_card = self.client.get(
            list_url,
            {"search": "To eat"},
            HTTP_ACCEPT_LANGUAGE="en",
        )
        self.assertEqual(res_search_card.data["total"], 1)
        self.assertEqual(res_search_card.data["results"][0]["id"], self.card_translated.pk)

        res_search_course = self.client.get(
            course_url,
            {"search": "Foundation"},
            HTTP_ACCEPT_LANGUAGE="en",
        )
        course_rows = res_search_course.data["results"] if isinstance(res_search_course.data, dict) else res_search_course.data
        self.assertEqual(len(course_rows), 1)
        self.assertEqual(course_rows[0]["title"], "N5 Vocabulary Foundation")

    def test_translate_learning_content_management_command(self):
        import json

        with TemporaryDirectory() as tmpdir:
            export_path = Path(tmpdir) / "bundle_en.json"
            out = StringIO()
            call_command(
                "translate_learning_content",
                "export",
                "--lang",
                "en",
                "--missing-only",
                "--file",
                str(export_path),
                stdout=out,
            )
            bundle = json.loads(export_path.read_text(encoding="utf-8"))
            self.assertEqual(len(bundle["courses"]), 0)
            self.assertEqual(len(bundle["cards"]), 1)
            self.assertEqual(bundle["cards"][0]["id"], self.card_untranslated.pk)

            # Populate translation and run dry-run first, then real import
            bundle["cards"][0]["translation"]["meaning"] = "To drink"
            export_path.write_text(json.dumps(bundle, ensure_ascii=False), encoding="utf-8")

            call_command(
                "translate_learning_content",
                "import",
                "--lang",
                "en",
                "--dry-run",
                "--file",
                str(export_path),
                stdout=out,
            )
            self.card_untranslated.refresh_from_db()
            self.assertEqual(self.card_untranslated.translations, {})

            call_command(
                "translate_learning_content",
                "import",
                "--lang",
                "en",
                "--file",
                str(export_path),
                stdout=out,
            )
            self.card_untranslated.refresh_from_db()
            self.assertEqual(
                self.card_untranslated.translations.get("en", {}).get("meaning"),
                "To drink",
            )
            self.assertEqual(self.card_untranslated.front_text, "飲む")
            self.assertEqual(self.card_untranslated.meaning, "Uống")



