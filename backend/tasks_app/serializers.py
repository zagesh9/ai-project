"""
Serializers for auth and project/board/task/comment CRUD.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Board, Comment, Project, Task, User

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
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
        fields = ("email", "password", "password_confirm", "first_name", "last_name")

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({
                "password_confirm": "The two password fields didn't match."
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "is_staff", "date_joined")
        read_only_fields = fields


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserBriefSerializer(read_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="owner",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Project
        fields = ("id", "name", "description", "owner", "owner_id",
                  "created_at", "updated_at")
        read_only_fields = ("id", "owner", "created_at", "updated_at")

    def create(self, validated_data):
        # owner is set from request.user in the view, not from payload.
        validated_data.pop("owner_id", None)
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Board
# ---------------------------------------------------------------------------

class BoardSerializer(serializers.ModelSerializer):
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source="project",
        write_only=True,
    )

    class Meta:
        model = Board
        fields = ("id", "name", "project", "project_id",
                  "position", "created_at", "updated_at")
        read_only_fields = ("id", "project", "created_at", "updated_at")


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------

class TaskSerializer(serializers.ModelSerializer):
    board = BoardSerializer(read_only=True)
    board_id = serializers.PrimaryKeyRelatedField(
        queryset=Board.objects.all(),
        source="board",
        write_only=True,
    )
    assignee = UserBriefSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assignee",
        write_only=True,
        required=False,
        allow_null=True,
    )
    created_by = UserBriefSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="creator",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "status", "priority",
            "due_date", "assignee", "assignee_id",
            "board", "board_id",
            "created_by", "created_by_id",
            "position", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "board", "created_by", "created_at", "updated_at",
        )

    def create(self, validated_data):
        validated_data.pop("assignee_id", None)
        validated_data.pop("created_by_id", None)
        validated_data["creator"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="author",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Comment
        fields = ("id", "content", "author", "author_id",
                  "created_at", "updated_at")
        read_only_fields = ("id", "author", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data.pop("author_id", None)
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
