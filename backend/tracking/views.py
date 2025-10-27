from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
import json

from .models import Animal, GPSDevice, LocationData, DeviceCommand, Geofence
from .serializers import (
    AnimalSerializer, GPSDeviceSerializer, LocationDataSerializer,
    DeviceCommandSerializer, GeofenceSerializer, LocationHistorySerializer
)


class AnimalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing animals"""
    serializer_class = AnimalSerializer
    permission_classes = [IsAuthenticated]
    queryset = Animal.objects.all()
    
    def get_queryset(self):
        return Animal.objects.filter(owner=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def location_history(self, request, pk=None):
        """Get location history for a specific animal"""
        animal = self.get_object()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            # Default to last 24 hours
            end_date = timezone.now()
            start_date = end_date - timedelta(days=1)
        else:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        try:
            device = animal.gps_device
            locations = device.locations.filter(
                timestamp__gte=start_date,
                timestamp__lte=end_date
            ).order_by('timestamp')
            
            serializer = LocationDataSerializer(locations, many=True)
            return Response(serializer.data)
        except GPSDevice.DoesNotExist:
            return Response(
                {'error': 'No GPS device found for this animal'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def activate_buzzer(self, request, pk=None):
        """Send buzzer activation command to animal's GPS device"""
        animal = self.get_object()
        try:
            device = animal.gps_device
            command = DeviceCommand.objects.create(
                device=device,
                command_type='buzzer',
                message='Activate buzzer'
            )
            # Here you would send the command to the actual device
            # For now, we'll just mark it as sent
            command.status = 'sent'
            command.executed_at = timezone.now()
            command.save()
            
            serializer = DeviceCommandSerializer(command)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except GPSDevice.DoesNotExist:
            return Response(
                {'error': 'No GPS device found for this animal'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def request_sms(self, request, pk=None):
        """Send SMS request command to animal's GPS device"""
        animal = self.get_object()
        message = request.data.get('message', 'Location request')
        
        try:
            device = animal.gps_device
            command = DeviceCommand.objects.create(
                device=device,
                command_type='sms',
                message=message
            )
            # Here you would send the command to the actual device
            command.status = 'sent'
            command.executed_at = timezone.now()
            command.save()
            
            serializer = DeviceCommandSerializer(command)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except GPSDevice.DoesNotExist:
            return Response(
                {'error': 'No GPS device found for this animal'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class GPSDeviceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing GPS devices"""
    serializer_class = GPSDeviceSerializer
    permission_classes = [IsAuthenticated]
    queryset = GPSDevice.objects.all()
    
    def get_queryset(self):
        return GPSDevice.objects.filter(animal__owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def online_devices(self, request):
        """Get all online devices"""
        devices = self.get_queryset().filter(status='online')
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def offline_devices(self, request):
        """Get all offline devices"""
        devices = self.get_queryset().filter(status='offline')
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)


class LocationDataViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing location data"""
    serializer_class = LocationDataSerializer
    permission_classes = [IsAuthenticated]
    queryset = LocationData.objects.all()
    
    def get_queryset(self):
        return LocationData.objects.filter(device__animal__owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def current_locations(self, request):
        """Get current locations of all animals"""
        # Get the latest location for each device
        devices = GPSDevice.objects.filter(animal__owner=request.user)
        current_locations = []
        
        for device in devices:
            latest_location = device.locations.first()
            if latest_location:
                location_data = LocationDataSerializer(latest_location).data
                location_data['animal_name'] = device.animal.name
                location_data['device_id'] = device.device_id
                location_data['is_online'] = device.is_online
                current_locations.append(location_data)
        
        return Response(current_locations)


class DeviceCommandViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing device commands"""
    serializer_class = DeviceCommandSerializer
    permission_classes = [IsAuthenticated]
    queryset = DeviceCommand.objects.all()
    
    def get_queryset(self):
        return DeviceCommand.objects.filter(device__animal__owner=self.request.user)


class GeofenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing geofences"""
    serializer_class = GeofenceSerializer
    permission_classes = [IsAuthenticated]
    queryset = Geofence.objects.all()
    
    def get_queryset(self):
        return Geofence.objects.filter(animal__owner=self.request.user)
    
    def perform_create(self, serializer):
        animal_id = self.request.data.get('animal')
        animal = get_object_or_404(Animal, id=animal_id, owner=self.request.user)
        serializer.save(animal=animal)

