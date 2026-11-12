from __future__ import annotations

from users.permissions import ModuleObjectPermission


class IsOwnerOrReadOnly(ModuleObjectPermission):
    """Granular Module -> Actions permission check for Courses & Cards."""

    default_prefix = "cards"
