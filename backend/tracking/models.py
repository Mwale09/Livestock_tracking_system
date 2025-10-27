from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Animal(models.Model):
    """Model representing a livestock animal"""
    BREED_CHOICES = [
        ('holstein', 'Holstein'),
        ('angus', 'Angus'),
        ('hereford', 'Hereford'),
        ('jersey', 'Jersey'),
        ('simmental', 'Simmental'),
        ('other', 'Other'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, help_text="Unique animal ID")
    name = models.CharField(max_length=100)
    breed = models.CharField(max_length=20, choices=BREED_CHOICES)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    birth_date = models.DateField()
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    color = models.CharField(max_length=50, blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='animals')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} ({self.id})"
    
    class Meta:
        ordering = ['-created_at']


class GPSDevice(models.Model):
    """Model representing a GPS tracking device"""
    DEVICE_STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('low_battery', 'Low Battery'),
        ('error', 'Error'),
    ]
    
    device_id = models.CharField(max_length=100, unique=True, help_text="Unique device identifier")
    animal = models.OneToOneField(Animal, on_delete=models.CASCADE, related_name='gps_device')
    imei = models.CharField(max_length=20, unique=True, help_text="Device IMEI number")
    phone_number = models.CharField(max_length=20, help_text="GSM phone number for SMS")
    status = models.CharField(max_length=20, choices=DEVICE_STATUS_CHOICES, default='offline')
    battery_level = models.IntegerField(default=0, help_text="Battery percentage")
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Device {self.device_id} - {self.animal.name}"
    
    @property
    def is_online(self):
        """Check if device is online based on last_seen timestamp"""
        if not self.last_seen:
            return False
        time_diff = timezone.now() - self.last_seen
        return time_diff.total_seconds() < 1800  # 30 minutes threshold


class LocationData(models.Model):
    """Model storing GPS location data for animals"""
    device = models.ForeignKey(GPSDevice, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    altitude = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    speed = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Speed in km/h")
    heading = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Direction in degrees")
    accuracy = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="GPS accuracy in meters")
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.device.animal.name} - {self.latitude}, {self.longitude} at {self.timestamp}"
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]


class DeviceCommand(models.Model):
    """Model for storing commands sent to GPS devices"""
    COMMAND_TYPES = [
        ('buzzer', 'Activate Buzzer'),
        ('sms', 'Send SMS'),
        ('location', 'Request Location'),
        ('status', 'Request Status'),
    ]
    
    COMMAND_STATUS = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]
    
    device = models.ForeignKey(GPSDevice, on_delete=models.CASCADE, related_name='commands')
    command_type = models.CharField(max_length=20, choices=COMMAND_TYPES)
    status = models.CharField(max_length=20, choices=COMMAND_STATUS, default='pending')
    message = models.TextField(blank=True, help_text="Command message or parameters")
    response = models.TextField(blank=True, help_text="Device response if any")
    created_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.device.animal.name} - {self.command_type} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']


class Geofence(models.Model):
    """Model for defining safe zones for animals"""
    name = models.CharField(max_length=100)
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name='geofences')
    center_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    center_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    radius = models.DecimalField(max_digits=8, decimal_places=2, help_text="Radius in meters")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.animal.name}"
    
    class Meta:
        ordering = ['-created_at']


