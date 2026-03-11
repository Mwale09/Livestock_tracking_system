from rest_framework import serializers
from .models import Animal, GPSDevice, LocationData, DeviceCommand, Geofence


class AnimalSerializer(serializers.ModelSerializer):
    gps_device = serializers.SerializerMethodField()
    last_location = serializers.SerializerMethodField()
    
    class Meta:
        model = Animal
        fields = [
            'id', 'name', 'breed', 'gender', 'birth_date', 'weight', 
            'color', 'category', 'image', 'owner', 'created_at', 'updated_at', 'is_active',
            'gps_device', 'last_location'
        ]
        read_only_fields = ['owner', 'created_at', 'updated_at']
    
    def get_gps_device(self, obj):
        try:
            device = obj.gps_device
            return {
                'device_id': device.device_id,
                'status': device.status,
                'battery_level': device.battery_level,
                'last_seen': device.last_seen,
                'is_online': device.is_online
            }
        except GPSDevice.DoesNotExist:
            return None
    
    def get_last_location(self, obj):
        try:
            last_location = obj.gps_device.locations.first()
            if last_location:
                # Basic geofence flag: true if any active geofence is breached for this point
                from .views import check_geofence_violations
                violations = check_geofence_violations(
                    obj.gps_device,
                    last_location.latitude,
                    last_location.longitude,
                )
                return {
                    'latitude': last_location.latitude,
                    'longitude': last_location.longitude,
                    'timestamp': last_location.timestamp,
                    'speed': last_location.speed,
                    'heading': last_location.heading,
                    'geofence_status': 'breach' if violations else 'ok',
                }
        except GPSDevice.DoesNotExist:
            pass
        return None


class GPSDeviceSerializer(serializers.ModelSerializer):
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    is_online = serializers.ReadOnlyField()
    
    class Meta:
        model = GPSDevice
        fields = [
            'device_id', 'animal', 'animal_name', 'imei', 'phone_number',
            'status', 'battery_level', 'last_seen', 'is_online',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class LocationDataSerializer(serializers.ModelSerializer):
    animal_name = serializers.CharField(source='device.animal.name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)
    
    class Meta:
        model = LocationData
        fields = [
            'id', 'device', 'device_id', 'animal_name', 'latitude', 'longitude',
            'altitude', 'speed', 'heading', 'accuracy', 'timestamp', 'created_at'
        ]
        read_only_fields = ['created_at']


class DeviceCommandSerializer(serializers.ModelSerializer):
    animal_name = serializers.CharField(source='device.animal.name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)
    
    class Meta:
        model = DeviceCommand
        fields = [
            'id', 'device', 'device_id', 'animal_name', 'command_type',
            'status', 'message', 'response', 'created_at', 'executed_at'
        ]
        read_only_fields = ['created_at', 'executed_at']


class GeofenceSerializer(serializers.ModelSerializer):
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    
    class Meta:
        model = Geofence
        fields = [
            'id', 'name', 'animal', 'animal_name', 'center_latitude',
            'center_longitude', 'radius', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at']


class LocationHistorySerializer(serializers.Serializer):
    """Serializer for location history queries"""
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    animal_id = serializers.CharField()
    
    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError("End date must be after start date")
        return data


