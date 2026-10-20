from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.test import TestCase

from .models import User


class CustomUserModelTests(TestCase):
    def test_auth_user_model_setting_points_to_users_user(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "users.User")
        self.assertIs(get_user_model(), User)
        self.assertTrue(issubclass(User, AbstractUser))

    def test_custom_user_inherits_default_abstract_user_attributes(self):
        user = User.objects.create_user(
            username="tanaka",
            email="tanaka@example.com",
            password="StrongPassword123!",
            first_name="Taro",
            last_name="Tanaka",
        )
        self.assertEqual(user.username, "tanaka")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertEqual(user.first_name, "Taro")
        self.assertEqual(user.last_name, "Tanaka")
        self.assertEqual(user.get_full_name(), "Taro Tanaka")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertIsNotNone(user.date_joined)
        self.assertTrue(user.check_password("StrongPassword123!"))
        self.assertEqual(str(user), "tanaka")
