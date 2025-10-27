import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import LocationData, GPSDevice


class TrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'tracking_updates'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'subscribe_animal':
            animal_id = text_data_json.get('animal_id')
            await self.subscribe_to_animal(animal_id)
        elif message_type == 'location_update':
            await self.handle_location_update(text_data_json)
    
    async def subscribe_to_animal(self, animal_id):
        """Subscribe to updates for a specific animal"""
        self.animal_id = animal_id
        await self.channel_layer.group_add(
            f'animal_{animal_id}',
            self.channel_name
        )
    
    async def handle_location_update(self, data):
        """Handle incoming location data from IoT device"""
        try:
            device_id = data.get('device_id')
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            timestamp = data.get('timestamp')
            
            # Save location data
            await self.save_location_data(device_id, latitude, longitude, timestamp)
            
            # Broadcast to all connected clients
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'location_update',
                    'device_id': device_id,
                    'latitude': latitude,
                    'longitude': longitude,
                    'timestamp': timestamp
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    @database_sync_to_async
    def save_location_data(self, device_id, latitude, longitude, timestamp):
        """Save location data to database"""
        try:
            device = GPSDevice.objects.get(device_id=device_id)
            LocationData.objects.create(
                device=device,
                latitude=latitude,
                longitude=longitude,
                timestamp=timestamp
            )
            # Update device last_seen
            device.last_seen = timestamp
            device.status = 'online'
            device.save()
        except GPSDevice.DoesNotExist:
            pass
    
    # Receive message from room group
    async def location_update(self, event):
        """Send location update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'device_id': event['device_id'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))
    
    async def device_status_update(self, event):
        """Send device status update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'device_status_update',
            'device_id': event['device_id'],
            'status': event['status'],
            'battery_level': event.get('battery_level'),
            'last_seen': event.get('last_seen')
        }))






