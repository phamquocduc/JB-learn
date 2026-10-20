from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom User model inheriting all default attributes from AbstractUser."""

    class Meta(AbstractUser.Meta):
        verbose_name = "Người dùng"
        verbose_name_plural = "Danh sách người dùng"
        ordering = ["-date_joined", "id"]

    def __str__(self) -> str:
        return self.username
