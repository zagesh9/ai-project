"""
Pytest configuration for the backend.

pytest-django reads DJANGO_SETTINGS_MODULE from pytest.ini. This file
adds shared fixtures available to all test modules under tasks_app/tests/.
"""

import pytest


@pytest.fixture
def api_client():
    """Return a DRF APIClient instance for making authenticated/unauthenticated requests."""
    from rest_framework.test import APIClient

    return APIClient()
