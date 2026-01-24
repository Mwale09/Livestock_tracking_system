"""
Script to register a GPS tracker device in the database
Run this before deploying your Arduino tracker
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livestock_tracking.settings')
django.setup()

from tracking.models import Animal, GPSDevice
from django.contrib.auth.models import User
from datetime import date

def create_tracker_device():
    print("\n" + "="*60)
    print("GPS TRACKER DEVICE REGISTRATION")
    print("="*60 + "\n")
    
    # Get user input
    print("Please provide the following information:")
    print("-" * 60)
    
    username = input("Username (farmer's username): ").strip()
    
    # Get or create user
    try:
        user = User.objects.get(username=username)
        print(f"✓ Found user: {user.username}")
    except User.DoesNotExist:
        print(f"✗ User '{username}' not found. Creating new user...")
        email = input("Email address: ").strip()
        password = input("Password: ").strip()
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        print(f"✓ Created user: {user.username}")
    
    print("\n" + "-" * 60)
    print("ANIMAL INFORMATION")
    print("-" * 60)
    
    animal_id = input("Animal ID (e.g., COW001): ").strip().upper()
    animal_name = input("Animal name (e.g., Bella): ").strip()
    
    # Get animal category
    print("\nSelect animal category:")
    print("1. Cow")
    print("2. Donkey")
    print("3. Pig")
    print("4. Sheep")
    print("5. Goat")
    category_choice = input("Enter number (1-5): ").strip()
    
    category_map = {
        '1': 'cow',
        '2': 'donkey',
        '3': 'pig',
        '4': 'sheep',
        '5': 'goat'
    }
    category = category_map.get(category_choice, 'cow')
    
    # Get animal breed
    print("\nSelect breed:")
    print("1. Holstein")
    print("2. Angus")
    print("3. Hereford")
    print("4. Jersey")
    print("5. Simmental")
    print("6. Other")
    breed_choice = input("Enter number (1-6): ").strip()
    
    breed_map = {
        '1': 'holstein',
        '2': 'angus',
        '3': 'hereford',
        '4': 'jersey',
        '5': 'simmental',
        '6': 'other'
    }
    breed = breed_map.get(breed_choice, 'other')
    
    # Get gender
    gender = input("Gender (male/female): ").strip().lower()
    if gender not in ['male', 'female']:
        gender = 'female'
    
    # Create or get animal
    animal, created = Animal.objects.get_or_create(
        id=animal_id,
        defaults={
            'name': animal_name,
            'breed': breed,
            'gender': gender,
            'birth_date': date(2020, 1, 1),  # Default date
            'category': category,
            'owner': user,
            'is_active': True
        }
    )
    
    if created:
        print(f"✓ Created animal: {animal.name} ({animal.id})")
    else:
        print(f"✓ Animal already exists: {animal.name} ({animal.id})")
    
    print("\n" + "-" * 60)
    print("GPS DEVICE INFORMATION")
    print("-" * 60)
    
    device_id = input("Device ID (e.g., GPS001): ").strip().upper()
    imei = input("Device IMEI (15 digits from SIM808): ").strip()
    phone_number = input("SIM card phone number (e.g., +263771234567): ").strip()
    
    # Create GPS device
    device, device_created = GPSDevice.objects.get_or_create(
        device_id=device_id,
        defaults={
            'animal': animal,
            'imei': imei,
            'phone_number': phone_number,
            'status': 'offline',
            'battery_level': 100
        }
    )
    
    if device_created:
        print(f"\n✓ Created GPS device successfully!")
    else:
        print(f"\n✓ GPS device already exists. Updating information...")
        device.animal = animal
        device.imei = imei
        device.phone_number = phone_number
        device.save()
        print(f"✓ Updated GPS device successfully!")
    
    # Print summary
    print("\n" + "="*60)
    print("REGISTRATION COMPLETE!")
    print("="*60)
    print(f"\nDevice Details:")
    print(f"  Device ID: {device.device_id}")
    print(f"  IMEI: {device.imei}")
    print(f"  Phone: {device.phone_number}")
    print(f"  Animal: {device.animal.name} ({device.animal.id})")
    print(f"  Owner: {user.username}")
    print(f"  Status: {device.status}")
    print(f"  Battery: {device.battery_level}%")
    
    print(f"\n📝 Update your Arduino code with:")
    print(f"  const char* DEVICE_ID = \"{device.device_id}\";")
    print(f"  const char* IMEI = \"{device.imei}\";")
    print(f"  const char* ALERT_PHONE = \"{device.phone_number}\";")
    
    print("\n" + "="*60)
    print("Next steps:")
    print("1. Update Arduino code with the values above")
    print("2. Upload code to Arduino")
    print("3. Power on the tracker")
    print("4. Check the web app to see location updates")
    print("="*60 + "\n")

if __name__ == '__main__':
    try:
        create_tracker_device()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("Please check your database connection and try again.")
