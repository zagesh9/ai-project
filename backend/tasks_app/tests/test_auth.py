"""
Tests for the authentication endpoints.

Covers register, login, refresh, logout, and /auth/me/ — including
validation errors, duplicate emails, invalid credentials, token
blacklisting, and permission checks.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def register_data(**overrides):
    """Return a valid registration payload."""
    data = {
        "email": "user@example.com",
        "password": "securepassword123",
        "password_confirm": "securepassword123",
        "first_name": "Test",
        "last_name": "User",
    }
    data.update(overrides)
    return data


def login_data(email=None, password=None, **overrides):
    """Return a valid login payload.

    Default to the same email/password used in the ``user`` fixture so
    tests that create a user and then log in actually match. Override
    explicitly when testing wrong-credentials scenarios.
    """
    if email is None:
        email = "existing@example.com"
    if password is None:
        password = "securepassword123"
    data = {"email": email, "password": password}
    data.update(overrides)
    return data


@pytest.fixture
def user(db):
    """A pre-created user for login/logout/me tests."""
    return User.objects.create_user(
        email="existing@example.com",
        password="securepassword123",
        first_name="Existing",
        last_name="User",
    )


@pytest.fixture
def tokens(user):
    """Access + refresh tokens for the given user."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRegister:
    def test_register_success(self, api_client):
        response = api_client.post("/api/v1/auth/register/", register_data())
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "user@example.com"
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"
        assert "password" not in data
        assert "password_confirm" not in data
        # A real user row exists now.
        assert User.objects.filter(email="user@example.com").exists()

    def test_register_duplicate_email(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/register/",
            register_data(email=user.email),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()

    def test_register_password_mismatch(self, api_client):
        response = api_client.post(
            "/api/v1/auth/register/",
            register_data(password_confirm="differentpassword"),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.json()

    def test_register_short_password(self, api_client):
        response = api_client.post(
            "/api/v1/auth/register/",
            register_data(password="short", password_confirm="short"),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.json()

    def test_register_missing_email(self, api_client):
        response = api_client.post(
            "/api/v1/auth/register/",
            register_data(email=""),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()

    def test_register_unauthenticated_allowed(self, api_client):
        """Registration must be open to unauthenticated users."""
        response = api_client.post("/api/v1/auth/register/", register_data())
        assert response.status_code == status.HTTP_201_CREATED


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/login/",
            login_data(email=user.email, password="securepassword123"),
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert "user" in data
        assert data["user"]["email"] == user.email

    def test_login_wrong_password(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/login/",
            login_data(email=user.email, password="wrongpassword"),
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_email(self, api_client):
        response = api_client.post(
            "/api/v1/auth/login/",
            login_data(email="nobody@example.com"),
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_credentials(self, api_client):
        response = api_client.post("/api/v1/auth/login/", {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRefresh:
    def test_refresh_success(self, api_client, tokens):
        response = api_client.post(
            "/api/v1/auth/refresh/",
            {"refresh": tokens["refresh"]},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.json()

    def test_refresh_invalid_token(self, api_client):
        response = api_client.post(
            "/api/v1/auth/refresh/",
            {"refresh": "invalidtoken"},
        )
        assert response.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_refresh_missing_token(self, api_client):
        response = api_client.post("/api/v1/auth/refresh/", {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestLogout:
    def test_logout_success(self, api_client, tokens):
        # Logout requires a valid access token in the Authorization header.
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )
        response = api_client.post(
            "/api/v1/auth/logout/",
            {"refresh": tokens["refresh"]},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["detail"] == "Successfully logged out."

    def test_logout_after_blacklist_refresh_fails(
        self, api_client, tokens, monkeypatch
    ):
        """
        After logout, the same refresh token must no longer be usable
        for refresh.
        """
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )
        # Perform logout.
        api_client.post(
            "/api/v1/auth/logout/",
            {"refresh": tokens["refresh"]},
        )
        # Try to refresh with the now-blacklisted token.
        response = api_client.post(
            "/api/v1/auth/refresh/",
            {"refresh": tokens["refresh"]},
        )
        assert response.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_logout_invalid_token(self, api_client, tokens):
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )
        response = api_client.post(
            "/api/v1/auth/logout/",
            {"refresh": "invalidtoken"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout_missing_token(self, api_client, tokens):
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )
        response = api_client.post("/api/v1/auth/logout/", {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMe:
    def test_me_authenticated(self, api_client, tokens):
        api_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "existing@example.com"
        assert data["first_name"] == "Existing"
        assert data["last_name"] == "User"

    def test_me_unauthenticated(self, api_client):
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
