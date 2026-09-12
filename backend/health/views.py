"""
Minimal health-check endpoint to verify the Django process and database
are up and reachable.
"""

from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """Return 200 with status ok if the app and DB are reachable."""
    status = "ok"
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_ok = True
    except Exception:
        status = "degraded"

    payload = {
        "status": status,
        "database": "ok" if db_ok else "unavailable",
    }
    http_status = 200 if status == "ok" else 503
    return JsonResponse(payload, status=http_status)
