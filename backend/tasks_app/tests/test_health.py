"""
Tests for the health-check endpoint.

Verifies that the /api/v1/health/ route returns 200 with the expected
payload shape and that the database is reachable.
"""

from django.db import connection

import pytest
from rest_framework import status


def test_health_check_ok(api_client, db):
    """Health endpoint returns 200 when the database is reachable."""
    response = api_client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"


def test_health_check_degraded_when_db_fails(api_client, db, monkeypatch):
    """Health endpoint returns 503 when the database is unreachable."""

    # Save the original cursor method and replace it with one that raises.
    original_cursor = connection.cursor

    def failing_cursor():
        raise Exception("simulated DB failure")

    monkeypatch.setattr(connection, "cursor", failing_cursor)
    try:
        response = api_client.get("/api/v1/health/")
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "unavailable"
    finally:
        # Restore before teardown so Django's connection cleanup doesn't
        # hit the failing cursor.
        connection.cursor = original_cursor
