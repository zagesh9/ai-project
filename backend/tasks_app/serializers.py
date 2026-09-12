"""
Serializers for the auth endpoints.

- RegisterSerializer: creates a new user (email/password/name).
- CustomTokenObtainPairSerializer: extends SimpleJWT's default to include
  the user object in the login response.
- UserSerializer: read-only serialization of the current user.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Validate and create a new user on registration."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
        help_text="At least 8 characters.",
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        help_text="Must match the password field.",
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        )

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "The two password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends SimpleJWT's token obtain serializer so the response includes
    the authenticated user's serialized representation alongside the tokens.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        # Attach the user object (serialized) to the response.
        data["user"] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serialization of a User (used in /auth/me/ and login
    responses).
    """

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "date_joined",
        )
        read_only_fields = fields


class LogoutSerializer(serializers.Serializer):
    """Accepts a refresh token to blacklist on logout."""

    refresh = serializers.CharField()
