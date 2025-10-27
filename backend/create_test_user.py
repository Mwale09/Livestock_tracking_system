#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livestock_tracking.settings')
django.setup()

from django.contrib.auth.models import User
from tracking.models import Animal, GPSDevice

# Create test user
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User'
    }
)

if created:
    user.set_password('testpass123')
    user.save()
    print(f"Created user: {user.username}")
else:
    print(f"User already exists: {user.username}")

# Create a test animal
animal, created = Animal.objects.get_or_create(
    id='COW001',
    defaults={
        'name': 'Bella',
        'breed': 'holstein',
        'gender': 'female',
        'birth_date': '2020-01-15',
        'weight': 450.5,
        'color': 'Black and White',
        'owner': user
    }
)

if created:
    print(f"Created animal: {animal.name}")
else:
    print(f"Animal already exists: {animal.name}")

# Create a test GPS device
device, created = GPSDevice.objects.get_or_create(
    device_id='GPS001',
    defaults={
        'animal': animal,
        'imei': '123456789012345',
        'phone_number': '+1234567890',
        'status': 'online',
        'battery_level': 85
    }
)

if created:
    print(f"Created GPS device: {device.device_id}")
else:
    print(f"GPS device already exists: {device.device_id}")

print("\nTest user created successfully!")
print("Username: testuser")
print("Password: testpass123")
print("You can now login to the application with these credentials.")





