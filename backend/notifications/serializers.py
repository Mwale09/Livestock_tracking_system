from rest_framework import serializers
from .models import Notification, NotificationSettings


class NotificationSerializer(serializers.ModelSerializer):
    animal_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'priority',
            'is_read', 'is_sent', 'created_at', 'read_at', 'animal_id',
            'device_id', 'location_data', 'animal_name'
        ]
        read_only_fields = ['created_at', 'read_at']
    
    def get_animal_name(self, obj):
        if obj.animal_id:
            from tracking.models import Animal
            try:
                animal = Animal.objects.get(id=obj.animal_id)
                return animal.name
            except Animal.DoesNotExist:
                return None
        return None


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'email_device_offline', 'email_low_battery', 'email_geofence_breach',
            'email_command_response', 'sms_device_offline', 'sms_low_battery',
            'sms_geofence_breach', 'sms_command_response', 'push_device_offline',
            'push_low_battery', 'push_geofence_breach', 'push_command_response',
            'offline_check_interval', 'battery_warning_threshold', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationStatsSerializer(serializers.Serializer):
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    notifications_by_type = serializers.DictField()
    recent_notifications = NotificationSerializer(many=True)






