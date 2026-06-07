from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
import json
import math
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        return Animal.objects.filter(owner=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        animal = serializer.save(owner=self.request.user, is_active=True)
        self._handle_device_linking(animal)
        
    def perform_update(self, serializer):
        animal = serializer.save()
        self._handle_device_linking(animal)

    def _handle_device_linking(self, animal):
        """Link device to animal and trigger automation"""
        device_id = self.request.data.get('device_id')
        if device_id:
            try:
                device = GPSDevice.objects.get(device_id=device_id)
                # Link device
                device.animal = animal
                device.save()
                
                # Automation: Configure device with user's phone number
                user_profile = getattr(self.request.user, 'userprofile', None)
                if user_profile and user_profile.phone_number:
                    DeviceCommand.objects.create(
                        device=device,
                        command_type='configuration',
                        message=f'SET_OWNER_NUMBER={user_profile.phone_number}',
                        status='pending'
                    )
            except GPSDevice.DoesNotExist:
                pass
    
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
            ).order_by('-timestamp')  # Newest first so latest is at top of list
            
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
        # Allow access to unassigned devices or devices owned by user to re-link if needed
        # But primarily filter by user
        queryset = GPSDevice.objects.filter(
            Q(animal__owner=self.request.user) | Q(animal__isnull=True)
        )
        return queryset
    
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

    @action(detail=False, methods=['get'])
    def unassigned_devices(self, request):
        """Get all devices not linked to any animal"""
        devices = GPSDevice.objects.filter(animal__isnull=True)
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
            # Use created_at so the newest saved point wins, even if a GPS timestamp
            # in the past or future is wrong.
            latest_location = device.locations.order_by('-created_at').first()
            if latest_location:
                location_data = LocationDataSerializer(latest_location).data
                location_data['animal_name'] = device.animal.name
                location_data['device_id'] = device.device_id
                location_data['is_online'] = device.is_online
                location_data['animal_category'] = device.animal.category
                location_data['animal_id'] = device.animal.id

                # Geofence status: breach if outside any active fence; map draws newest fence.
                geofences = get_active_geofences(device.animal)
                if geofences.exists():
                    breached = any(
                        is_outside_geofence(
                            latest_location.latitude,
                            latest_location.longitude,
                            gf,
                        )
                        for gf in geofences
                    )
                    location_data['geofence_status'] = 'breach' if breached else 'ok'
                    primary = geofences.first()
                    location_data['geofence_center_lat'] = float(primary.center_latitude)
                    location_data['geofence_center_lng'] = float(primary.center_longitude)
                    location_data['geofence_radius_m'] = float(primary.radius)
                    location_data['geofence_name'] = primary.name
                else:
                    location_data['geofence_status'] = 'unknown'

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


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on Earth (in meters)
    using the Haversine formula
    """
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(float(lat1))
    lon1_rad = math.radians(float(lon1))
    lat2_rad = math.radians(float(lat2))
    lon2_rad = math.radians(float(lon2))
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of Earth in meters
    r = 6371000
    
    return c * r


def geofence_distance_meters(latitude, longitude, geofence):
    """Distance in meters from a point to a geofence center."""
    return calculate_distance(
        latitude, longitude,
        geofence.center_latitude, geofence.center_longitude
    )


def is_outside_geofence(latitude, longitude, geofence):
    return geofence_distance_meters(latitude, longitude, geofence) > float(geofence.radius)


def get_active_geofences(animal):
    """Newest active geofence first."""
    return Geofence.objects.filter(animal=animal, is_active=True).order_by('-created_at')


def check_geofence_violations(device, latitude, longitude):
    """
    Check if the current location violates any active geofences for the animal.
    Returns list of violated geofences.
    """
    violations = []
    try:
        if not hasattr(device, 'animal'):
            return []
        animal = device.animal

        for geofence in get_active_geofences(animal):
            distance = geofence_distance_meters(latitude, longitude, geofence)
            if distance > float(geofence.radius):
                violations.append({
                    'geofence': geofence,
                    'distance': distance,
                    'radius': geofence.radius
                })
    except Exception as e:
        print(f"Error checking geofence: {e}")

    return violations


def is_new_geofence_breach(device, geofence, latitude, longitude):
    """
    Alert only when the animal crosses from inside to outside a geofence.
    Avoids repeating alerts on every location ping while still outside.
    """
    if not is_outside_geofence(latitude, longitude, geofence):
        return False

    previous = device.locations.order_by('-created_at')[1:2].first()
    if previous is None:
        return True

    return not is_outside_geofence(previous.latitude, previous.longitude, geofence)


def create_geofence_notification(device, geofence, distance):
    """Create a notification for a new geofence breach (with cooldown)."""
    try:
        from notifications.models import Notification

        animal = device.animal
        owner = animal.owner

        cooldown = timedelta(minutes=30)
        recent_alert = Notification.objects.filter(
            notification_type='geofence_breach',
            device_id=device.device_id,
            location_data__geofence_name=geofence.name,
            created_at__gte=timezone.now() - cooldown,
        ).exists()
        if recent_alert:
            return None

        notification = Notification.objects.create(
            user=owner,
            notification_type='geofence_breach',
            title=f'Geofence Breach: {animal.name}',
            message=f'{animal.name} has left the geofence "{geofence.name}". '
                   f'Current distance: {distance:.2f}m (radius: {geofence.radius}m)',
            priority='high',
            animal_id=animal.id,
            device_id=device.device_id,
            location_data={
                'latitude': float(device.locations.first().latitude) if device.locations.exists() else 0,
                'longitude': float(device.locations.first().longitude) if device.locations.exists() else 0,
                'geofence_name': geofence.name,
                'distance': float(distance)
            }
        )
        return notification
    except Exception as e:
        # If notifications app is not available, just log the error
        print(f"Error creating notification: {e}")
        return None


def broadcast_location_update(device, location_data):
    """Broadcast location update via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'tracking_updates',
                {
                    'type': 'location_update',
                    'device_id': device.device_id,
                    'latitude': float(location_data.latitude),
                    'longitude': float(location_data.longitude),
                    'timestamp': location_data.timestamp.isoformat(),
                    'speed': float(location_data.speed) if location_data.speed else None,
                    'heading': float(location_data.heading) if location_data.heading else None,
                }
            )
            # Also send to animal-specific group
            if hasattr(device, 'animal'):
                async_to_sync(channel_layer.group_send)(
                    f'animal_{device.animal.id}',
                    {
                        'type': 'location_update',
                        'device_id': device.device_id,
                        'latitude': float(location_data.latitude),
                        'longitude': float(location_data.longitude),
                        'timestamp': location_data.timestamp.isoformat(),
                    }
                )
    except Exception as e:
        # If channels is not configured, just continue
        print(f"WebSocket broadcast error (this is OK if channels not configured): {e}")


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])  # Disable authentication (no CSRF check)
@permission_classes([AllowAny])
def update_location(request):
    """
    Endpoint for GPS devices (Arduino + SIM808) to update their location.
    Accepts device_id or imei to identify the device.
    """
    data = request.data
    
    # Get device identifier (device_id, ThingsBoard deviceName, or imei)
    device_id = (
        data.get('device_id')
        or data.get('deviceName')
        or data.get('device_name')
    )
    imei = data.get('imei')
    
    if not device_id and not imei:
        return Response(
            {'error': 'device_id (or deviceName) or imei is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Find the device
    try:
        if device_id:
            device = GPSDevice.objects.get(device_id__iexact=str(device_id).strip())
        else:
            device = GPSDevice.objects.get(imei=imei)
    except GPSDevice.DoesNotExist:
        return Response(
            {
                'error': 'GPS device not found. Register it in Django admin first.',
                'device_id': device_id,
                'imei': imei,
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get location data
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if latitude is None or longitude is None:
        return Response(
            {'error': 'latitude and longitude are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse timestamp (use current time if not provided)
    timestamp_str = data.get('timestamp')
    if timestamp_str:
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            if timezone.is_naive(timestamp):
                timestamp = timezone.make_aware(timestamp)
        except (ValueError, AttributeError):
            timestamp = timezone.now()
    else:
        timestamp = timezone.now()
    
    # Create location data
    location_data = LocationData.objects.create(
        device=device,
        latitude=latitude,
        longitude=longitude,
        altitude=data.get('altitude'),
        speed=data.get('speed'),
        heading=data.get('heading'),
        accuracy=data.get('accuracy'),
        timestamp=timestamp
    )
    
    # Update device status
    # Keep "last_seen" aligned with the same timestamp we stored on the location,
    # so Last Seen and Last Update don't drift apart.
    device.last_seen = timestamp
    device.status = 'online'
    
    # Update status if provided
    status_value = data.get('status', '').upper()
    if status_value in ['OK', 'ONLINE']:
        device.status = 'online'
    elif status_value in ['LOW_BATTERY', 'LOW']:
        device.status = 'low_battery'
    elif status_value in ['ERROR', 'OFFLINE']:
        device.status = 'offline'
    
    # Update battery level if provided
    if 'battery_level' in data:
        battery_level = int(data.get('battery_level'))
        device.battery_level = battery_level
        # Check for low battery
        if battery_level < 20:
            device.status = 'low_battery'
    
    device.save()
    
    # Check geofence state (all active fences) vs new breaches (inside -> outside only)
    geofence_violations = check_geofence_violations(device, latitude, longitude)
    current_violation_messages = [
        f"{v['geofence'].name}: {v['distance']:.2f}m outside (radius: {v['radius']}m)"
        for v in geofence_violations
    ]
    new_breach_messages = []

    for violation in geofence_violations:
        geofence = violation['geofence']
        if is_new_geofence_breach(device, geofence, latitude, longitude):
            create_geofence_notification(device, geofence, violation['distance'])
            new_breach_messages.append(
                f"{geofence.name}: {violation['distance']:.2f}m outside (radius: {geofence.radius}m)"
            )

    # Broadcast location update via WebSocket
    broadcast_location_update(device, location_data)

    serializer = LocationDataSerializer(location_data)
    response_data = {
        'message': 'Location updated successfully',
        'location': serializer.data,
        'device_status': device.status,
        'battery_level': device.battery_level,
        'geofence_status': 'breach' if geofence_violations else 'ok',
    }

    if current_violation_messages:
        response_data['geofence_violations'] = current_violation_messages
    if new_breach_messages:
        response_data['new_geofence_breaches'] = new_breach_messages
        response_data['warning'] = 'New geofence breach detected!'
    
    return Response(response_data, status=status.HTTP_201_CREATED)
