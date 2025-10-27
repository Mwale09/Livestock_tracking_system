#!/usr/bin/env python
"""
Setup script for the Livestock Tracking System backend
"""
import os
import sys
import subprocess
import django
from django.core.management import execute_from_command_line

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"Running: {description}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed: {e.stderr}")
        return False

def setup_backend():
    """Setup the Django backend"""
    print("Setting up Livestock Tracking System Backend...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('manage.py'):
        print("Error: manage.py not found. Please run this script from the backend directory.")
        return False
    
    # Install requirements
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        return False
    
    # Create migrations
    if not run_command("python manage.py makemigrations", "Creating database migrations"):
        return False
    
    # Apply migrations
    if not run_command("python manage.py migrate", "Applying database migrations"):
        return False
    
    # Create superuser (optional)
    print("\nCreating superuser account...")
    print("You can skip this step by pressing Ctrl+C")
    try:
        run_command("python manage.py createsuperuser", "Creating superuser")
    except KeyboardInterrupt:
        print("Skipped superuser creation")
    
    # Collect static files
    if not run_command("python manage.py collectstatic --noinput", "Collecting static files"):
        return False
    
    print("\n" + "=" * 50)
    print("✓ Backend setup completed successfully!")
    print("\nTo start the development server, run:")
    print("  python manage.py runserver")
    print("\nTo access the admin panel:")
    print("  http://localhost:8000/admin")
    
    return True

if __name__ == "__main__":
    setup_backend()






