#!/usr/bin/env python
"""
Utility script to create a Django superuser on Render without needing shell access.

How it works:
- Uses the same DATABASE settings as the main app (including Render Postgres via DATABASE_URL).
- Reads credentials from environment variables so no passwords are hard-coded in the repo.
- Can be safely run multiple times; it will only create the user if it does not already exist.

Environment variables (set these in your Render dashboard for the backend service):
- DJANGO_SUPERUSER_USERNAME  (e.g. "admin")
- DJANGO_SUPERUSER_EMAIL     (e.g. "admin@example.com")
- DJANGO_SUPERUSER_PASSWORD  (REQUIRED – strong password)
"""

import os

import django


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "livestock_tracking.settings")
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402


User = get_user_model()


def main() -> None:
  username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
  email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
  password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

  if not password:
    print(
      "DJANGO_SUPERUSER_PASSWORD is not set; "
      "skipping automatic superuser creation."
    )
    return

  try:
    user_exists = User.objects.filter(username=username).exists()
  except Exception as exc:  # type: ignore[bare-except]
    # If the database or auth tables are not ready, just log and exit.
    print(f"Could not check for existing superuser ({exc}); exiting.")
    return

  if user_exists:
    print(f"Superuser '{username}' already exists; nothing to do.")
    return

  User.objects.create_superuser(username=username, email=email, password=password)
  print(f"Created superuser '{username}' with email '{email}'.")


if __name__ == "__main__":
  main()

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livestock_tracking.settings')
django.setup()

from django.contrib.auth.models import User
from django.core.management.base import CommandError

def create_admin():
    username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
    email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
    password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

    if not password:
        print("Error: DJANGO_SUPERUSER_PASSWORD environment variable is not set.")
        return

    try:
        if not User.objects.filter(username=username).exists():
            print(f"Creating superuser: {username}")
            User.objects.create_superuser(username=username, email=email, password=password)
            print("Superuser created successfully!")
        else:
            print(f"Superuser '{username}' already exists. Updating password.")
            user = User.objects.get(username=username)
            user.set_password(password)
            user.save()
            print("Superuser password updated successfully!")
    except Exception as e:
        print(f"An error occurred while creating superuser: {e}")

if __name__ == '__main__':
    create_admin()
