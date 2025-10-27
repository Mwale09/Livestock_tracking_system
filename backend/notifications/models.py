from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Notification(models.Model):
    """Model for storing notifications"""
    NOTIFICATION_TYPES = [
        ('device_offline', 'Device Offline'),
        ('device_online', 'Device Online'),
        ('low_battery', 'Low Battery'),
        ('geofence_breach', 'Geofence Breach'),
        ('command_response', 'Command Response'),
        ('system_alert', 'System Alert'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Optional fields for specific notification types
    animal_id = models.CharField(max_length=50, null=True, blank=True)
    device_id = models.CharField(max_length=100, null=True, blank=True)
    location_data = models.JSONField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read', '-created_at']),
        ]
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save()


class NotificationSettings(models.Model):
    """Model for user notification preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_settings')
    
    # Email notifications
    email_device_offline = models.BooleanField(default=True)
    email_low_battery = models.BooleanField(default=True)
    email_geofence_breach = models.BooleanField(default=True)
    email_command_response = models.BooleanField(default=False)
    
    # SMS notifications
    sms_device_offline = models.BooleanField(default=True)
    sms_low_battery = models.BooleanField(default=False)
    sms_geofence_breach = models.BooleanField(default=True)
    sms_command_response = models.BooleanField(default=False)
    
    # Push notifications (for future mobile app)
    push_device_offline = models.BooleanField(default=True)
    push_low_battery = models.BooleanField(default=True)
    push_geofence_breach = models.BooleanField(default=True)
    push_command_response = models.BooleanField(default=True)
    
    # Notification frequency
    offline_check_interval = models.IntegerField(default=30, help_text="Minutes between offline checks")
    battery_warning_threshold = models.IntegerField(default=20, help_text="Battery percentage for low battery warning")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification settings for {self.user.username}"






