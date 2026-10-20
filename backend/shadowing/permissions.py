from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission allowing read access to visible items,
    and write/delete access strictly to the owner (created_by == request.user).
    System content (created_by is None) cannot be modified or deleted.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            if getattr(obj, "is_public", True):
                return True
            return bool(
                request.user
                and request.user.is_authenticated
                and getattr(obj, "created_by", None) == request.user
            )

        # Unsafe methods (PUT, PATCH, DELETE)
        created_by = getattr(obj, "created_by", None)
        if created_by is None:
            return False

        return bool(
            request.user
            and request.user.is_authenticated
            and created_by == request.user
        )
