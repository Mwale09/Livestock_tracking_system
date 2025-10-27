from django.contrib import admin
from .models import Animal, GPSDevice, LocationData, DeviceCommand, Geofence


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'breed', 'gender', 'owner', 'is_active', 'created_at']
    list_filter = ['breed', 'gender', 'is_active', 'created_at']
    search_fields = ['id', 'name', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(GPSDevice)
class GPSDeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'animal', 'status', 'battery_level', 'last_seen', 'is_online']
    list_filter = ['status', 'created_at']
    search_fields = ['device_id', 'imei', 'animal__name']
    readonly_fields = ['created_at', 'updated_at', 'is_online']
    ordering = ['-created_at']


@admin.register(LocationData)
class LocationDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'latitude', 'longitude', 'timestamp', 'speed']
    list_filter = ['timestamp', 'device__animal']
    search_fields = ['device__device_id', 'device__animal__name']
    readonly_fields = ['created_at']
    ordering = ['-timestamp']


@admin.register(DeviceCommand)
class DeviceCommandAdmin(admin.ModelAdmin):
    list_display = ['device', 'command_type', 'status', 'created_at', 'executed_at']
    list_filter = ['command_type', 'status', 'created_at']
    search_fields = ['device__device_id', 'device__animal__name']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(Geofence)
class GeofenceAdmin(admin.ModelAdmin):
    list_display = ['name', 'animal', 'center_latitude', 'center_longitude', 'radius', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'animal__name']
    readonly_fields = ['created_at']
    ordering = ['-created_at']






