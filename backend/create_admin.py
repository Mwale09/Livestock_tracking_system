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
