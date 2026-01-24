"""
Django management command to create mock livestock data with GPS devices and locations
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random
from tracking.models import Animal, GPSDevice, LocationData

# Bulawayo, NUST coordinates (approximately)
NUST_LAT = -20.1500
NUST_LNG = 28.5833

# Categories and their colors (for reference)
CATEGORIES = ['cow', 'donkey', 'pig', 'sheep', 'goat']
BREEDS = {
    'cow': ['holstein', 'angus', 'hereford', 'jersey', 'simmental'],
    'donkey': ['holstein', 'other', 'other', 'other', 'other'],
    'pig': ['holstein', 'other', 'other', 'other', 'other'],
    'sheep': ['holstein', 'other', 'other', 'other', 'other'],
    'goat': ['holstein', 'other', 'other', 'other', 'other'],
}

NAMES = {
    'cow': ['Bessie', 'Daisy', 'Moo', 'Buttercup', 'Clover', 'Bella', 'Luna', 'Maggie'],
    'donkey': ['Eeyore', 'Donkey', 'Jack', 'Jenny', 'Burro', 'Asino'],
    'pig': ['Wilbur', 'Babe', 'Porky', 'Hamlet', 'Piglet', 'Truffle'],
    'sheep': ['Dolly', 'Fleece', 'Wooly', 'Baa', 'Lamb', 'Sheepy'],
    'goat': ['Billy', 'Nanny', 'Goaty', 'Horn', 'Beard', 'Clover'],
}

COLORS = ['Black', 'White', 'Brown', 'Spotted', 'Gray', 'Tan', 'Red']


class Command(BaseCommand):
    help = 'Creates mock livestock data with GPS devices and location data around NUST, Bulawayo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of animals to create (default: 10)',
        )
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Username of the user to assign animals to (default: admin)',
        )

    def handle(self, *args, **options):
        count = options['count']
        username = options['username']

        # Get or create user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User "{username}" does not exist. Please create the user first.')
            )
            return

        self.stdout.write(f'Creating {count} mock animals for user: {user.username}')

        created_animals = []
        created_devices = []

        # Find the highest existing animal and device IDs to avoid conflicts
        existing_animals = Animal.objects.filter(owner=user).order_by('-id')
        existing_devices = GPSDevice.objects.all().order_by('-device_id')
        
        # Get the highest numeric suffix
        max_animal_num = 0
        for animal in existing_animals:
            if animal.id.startswith('ANIMAL'):
                try:
                    num = int(animal.id.replace('ANIMAL', ''))
                    max_animal_num = max(max_animal_num, num)
                except ValueError:
                    pass
        
        max_device_num = 0
        for device in existing_devices:
            if device.device_id.startswith('GPS'):
                try:
                    num = int(device.device_id.replace('GPS', ''))
                    max_device_num = max(max_device_num, num)
                except ValueError:
                    pass

        for i in range(count):
            # Random category
            category = random.choice(CATEGORIES)
            
            # Generate unique animal ID
            animal_num = max_animal_num + i + 1
            animal_id = f'ANIMAL{str(animal_num).zfill(3)}'
            
            # Check if animal already exists (double check)
            if Animal.objects.filter(id=animal_id).exists():
                self.stdout.write(
                    self.style.WARNING(f'Animal {animal_id} already exists, skipping...')
                )
                continue

            name = random.choice(NAMES[category]) + f' {animal_num}'
            breed = random.choice(BREEDS[category])
            gender = random.choice(['male', 'female'])
            birth_date = timezone.now().date() - timedelta(days=random.randint(365, 2555))  # 1-7 years old
            weight = round(random.uniform(50, 500), 2)
            color = random.choice(COLORS)

            animal = Animal.objects.create(
                id=animal_id,
                name=name,
                breed=breed,
                gender=gender,
                birth_date=birth_date,
                weight=weight,
                color=color,
                category=category,
                owner=user,
                is_active=True
            )
            created_animals.append(animal)

            # Generate unique device ID
            device_num = max_device_num + i + 1
            device_id = f'GPS{str(device_num).zfill(3)}'
            
            # Generate unique IMEI (check if exists)
            max_attempts = 100
            for attempt in range(max_attempts):
                imei = ''.join([str(random.randint(0, 9)) for _ in range(15)])
                if not GPSDevice.objects.filter(imei=imei).exists():
                    break
            else:
                self.stdout.write(
                    self.style.ERROR(f'Could not generate unique IMEI after {max_attempts} attempts')
                )
                animal.delete()  # Clean up the animal if we can't create device
                continue
            
            # Generate unique phone number
            for attempt in range(max_attempts):
                phone_number = f'+263{random.randint(700000000, 799999999)}'
                if not GPSDevice.objects.filter(phone_number=phone_number).exists():
                    break
            
            # Check if device_id already exists (double check)
            if GPSDevice.objects.filter(device_id=device_id).exists():
                self.stdout.write(
                    self.style.WARNING(f'Device {device_id} already exists, skipping...')
                )
                animal.delete()  # Clean up the animal
                continue
            
            device = GPSDevice.objects.create(
                device_id=device_id,
                animal=animal,
                imei=imei,
                phone_number=phone_number,
                status='online',
                battery_level=random.randint(60, 100),
                last_seen=timezone.now() - timedelta(minutes=random.randint(0, 30))
            )
            created_devices.append(device)

            # Create location data (around NUST with some variation)
            # Add random offset within ~5km radius
            lat_offset = random.uniform(-0.05, 0.05)  # ~5km
            lng_offset = random.uniform(-0.05, 0.05)
            
            latitude = NUST_LAT + lat_offset
            longitude = NUST_LNG + lng_offset

            # Create multiple location points (last 24 hours)
            # Ensure at least one recent location (within last hour) for current location display
            num_locations = random.randint(5, 15)
            most_recent_time = None
            for j in range(num_locations):
                if j == 0:
                    # First location should be recent (within last hour)
                    location_time = timezone.now() - timedelta(minutes=random.randint(0, 60))
                else:
                    location_time = timezone.now() - timedelta(hours=random.randint(0, 24))
                
                # Track the most recent timestamp
                if most_recent_time is None or location_time > most_recent_time:
                    most_recent_time = location_time
                
                # Ensure timestamp is timezone-aware
                if timezone.is_naive(location_time):
                    location_time = timezone.make_aware(location_time)
                
                LocationData.objects.create(
                    device=device,
                    latitude=latitude + random.uniform(-0.001, 0.001),  # Small movement
                    longitude=longitude + random.uniform(-0.001, 0.001),
                    altitude=random.uniform(1300, 1400),
                    speed=round(random.uniform(0, 5), 2),
                    heading=random.randint(0, 360),
                    accuracy=round(random.uniform(5, 15), 2),
                    timestamp=location_time
                )
            
            # Update device's last_seen to the most recent location timestamp
            if most_recent_time:
                device.last_seen = most_recent_time
                device.status = 'online'
                device.save()

            self.stdout.write(
                self.style.SUCCESS(f'Created: {animal.name} ({category}) with device {device_id}')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {len(created_animals)} animals with GPS devices and location data!'
            )
        )
        self.stdout.write(
            f'All locations are centered around NUST, Bulawayo ({NUST_LAT}, {NUST_LNG})'
        )

