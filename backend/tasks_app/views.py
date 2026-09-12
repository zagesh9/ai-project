"""
Views for the auth endpoints.

- RegisterView: create a new user.
- LogoutView: blacklist the refresh token.
- MeView: return the current authenticated user.
- Token obtain/refresh: delegated to SimpleJWT's built-in views.
"""

from rest_framework import status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(views.APIView):
    """Register a new user and return their serialized representation."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    Obtain an access + refresh token pair.

    Explicitly set authentication_classes to [] so the global JWT
    authenticator does not run and set request.user=AnonymousUser
    (which would then be rejected by the global IsAuthenticated
    permission before the view's own AllowAny check ran).

    Explicitly set permission_classes to AllowAny so the global
    DEFAULT_PERMISSION_CLASSES (IsAuthenticated) does not block
    unauthenticated login attempts. Uses our custom serializer that
    also returns the user object.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(views.APIView):
    """
    Blacklist the provided refresh token so it can no longer be used to
    obtain new access tokens.

    Requires a valid access token in the Authorization header.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]
        try:
            from rest_framework_simplejwt.tokens import RefreshToken

            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"refresh": "Invalid or already-blacklisted token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Successfully logged out."})


class MeView(views.APIView):
    """Return the currently authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(UserSerializer(request.user).data)


# SimpleJWT built-in refresh view, no customization needed.
token_refresh_view = TokenRefreshView.as_view()
