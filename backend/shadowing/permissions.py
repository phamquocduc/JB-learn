from __future__ import annotations

from users.permissions import ModuleObjectPermission


class IsOwnerOrReadOnly(ModuleObjectPermission):
    """Granular Module -> Actions permission check for Shadowing Videos."""

    default_prefix = "shadowing"
