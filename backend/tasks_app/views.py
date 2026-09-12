"""
Views for auth and project/board/task/comment CRUD.

Auth views (RegisterView, LoginView, LogoutView, MeView, token refresh)
are defined here alongside the CRUD viewsets for projects, boards, tasks,
and comments, plus the dashboard endpoint.
"""

from rest_framework import status, views, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Board, Comment, Project, Task
from .serializers import (
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
    ProjectSerializer,
    BoardSerializer,
    TaskSerializer,
    CommentSerializer,
)


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(views.APIView):
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
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(UserSerializer(request.user).data)


token_refresh_view = TokenRefreshView.as_view()


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

class IsProjectOwnerOrMember(IsAuthenticated):
    """
    Allows access if the requesting user owns the project (for write
    operations) or is a member (for read). In v1, owner == member.
    """

    def has_object_permission(self, request, view, obj):
        # Read access: any authenticated user who owns the project.
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return obj.owner == request.user
        # Write access: owner only.
        return obj.owner == request.user


class IsBoardMember(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return obj.project.owner == request.user


class IsTaskCreatorOrAssigneeOrProjectOwner(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if obj.creator == user:
            return True
        if obj.assignee == user:
            return True
        if obj.board.project.owner == user:
            return True
        return False


class IsTaskCreator(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return obj.creator == request.user


class IsCommentAuthor(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        return obj.author == request.user


# ---------------------------------------------------------------------------
# Project ViewSet
# ---------------------------------------------------------------------------

class ProjectViewSet(viewsets.ModelViewSet):
    """
    CRUD for projects.

    List/Retrieve: only projects owned by the authenticated user.
    Create: authenticated user becomes owner.
    Update/Delete: owner only.
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectOwnerOrMember]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# ---------------------------------------------------------------------------
# Board ViewSet
# ---------------------------------------------------------------------------

class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [IsBoardMember]

    def get_queryset(self):
        return Board.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save()


# ---------------------------------------------------------------------------
# Task ViewSet
# ---------------------------------------------------------------------------

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsTaskCreatorOrAssigneeOrProjectOwner]

    def get_queryset(self):
        return Task.objects.filter(
            board__project__owner=self.request.user
        ).select_related("assignee", "creator", "board", "board__project")

    def perform_create(self, serializer):
        serializer.save()


# ---------------------------------------------------------------------------
# Comment ViewSet (nested under tasks)
# ---------------------------------------------------------------------------

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get("task_pk")
        return Comment.objects.filter(
            task_id=task_id,
            task__board__project__owner=self.request.user,
        ).select_related("author")

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_pk")
        serializer.save(task_id=task_id)

    def perform_destroy(self, instance):
        # Only the comment author can delete.
        if instance.author != self.request.user:
            self.permission_denied(
                self.request, message="You can only delete your own comments."
            )
        instance.delete()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        from django.db.models import Count, Q
        from datetime import date

        total_projects = Project.objects.filter(owner=user).count()
        total_boards = Board.objects.filter(project__owner=user).count()

        tasks_by_status = {}
        for status_choice in Task.Status:
            tasks_by_status[status_choice.value] = Task.objects.filter(
                board__project__owner=user,
                status=status_choice.value,
            ).count()

        my_assigned_tasks_qs = Task.objects.filter(
            assignee=user,
            board__project__owner=user,
        )
        my_assigned_total = my_assigned_tasks_qs.count()
        my_assigned_by_status = {}
        for status_choice in Task.Status:
            my_assigned_by_status[status_choice.value] = my_assigned_tasks_qs.filter(
                status=status_choice.value
            ).count()

        overdue_tasks = Task.objects.filter(
            assignee=user,
            board__project__owner=user,
            due_date__lt=date.today(),
        ).exclude(
            status=Task.Status.DONE
        ).count()

        recent_tasks = (
            Task.objects.filter(board__project__owner=user)
            .select_related("assignee", "creator", "board", "board__project")
            .order_by("-created_at")[:10]
        )
        recent_tasks_data = TaskSerializer(recent_tasks, many=True).data

        return Response({
            "total_projects": total_projects,
            "total_boards": total_boards,
            "tasks_by_status": tasks_by_status,
            "my_assigned_tasks": {
                "total": my_assigned_total,
                "by_status": my_assigned_by_status,
            },
            "overdue_tasks": overdue_tasks,
            "recent_tasks": recent_tasks_data,
        })
