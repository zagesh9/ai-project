#!/usr/bin/env python3
"""Kill processes holding db.sqlite3 and delete it, then migrate."""
import os
import subprocess
import sys
import time

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "db.sqlite3")

print("Looking for processes holding db.sqlite3...")
try:
    out = subprocess.check_output(
        ["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV", "/NH"],
        text=True,
    )
    for line in out.strip().splitlines():
        if not line:
            continue
        pid = line.split(",")[1].strip().strip('"')
        try:
            subprocess.run(
                ["taskkill", "/PID", pid, "/F"],
                capture_output=True, text=True, timeout=5
            )
            print(f"  killed PID {pid}")
        except Exception as e:
            print(f"  failed PID {pid}: {e}")
except Exception as e:
    print(f"tasklist failed: {e}")

time.sleep(3)

if os.path.exists(DB):
    os.remove(DB)
    print("Deleted db.sqlite3")
else:
    print("db.sqlite3 not present")

print("Running migrate...")
result = subprocess.run(
    [sys.executable, "manage.py", "migrate"],
    cwd=BASE, capture_output=True, text=True
)
print(result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr)
    sys.exit(result.returncode)
print("Done.")
