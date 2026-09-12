"""
URL configuration for the tasks_app.

Auth endpoints are mounted here in Milestone 2. Project, board, task,
and comment endpoints will be added in later milestones.
"""

from django.urls import path

from . import views

app_name = "tasks_app"

urlpatterns = [
    # Authentication
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", views.token_refresh_view, name="auth-refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
]
