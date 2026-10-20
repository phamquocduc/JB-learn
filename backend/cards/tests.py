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
