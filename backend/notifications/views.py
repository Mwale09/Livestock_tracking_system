from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta

from .models import Notification, NotificationSettings
from .serializers import NotificationSerializer, NotificationSettingsSerializer, NotificationStatsSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Notification.objects.all()
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().update(is_read=True, read_at=timezone.now())
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics"""
        queryset = self.get_queryset()
        
        total_notifications = queryset.count()
        unread_notifications = queryset.filter(is_read=False).count()
        
        # Notifications by type
        notifications_by_type = queryset.values('notification_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent notifications (last 10)
        recent_notifications = queryset[:10]
        
        stats_data = {
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'notifications_by_type': {item['notification_type']: item['count'] for item in notifications_by_type},
            'recent_notifications': NotificationSerializer(recent_notifications, many=True).data
        }
        
        serializer = NotificationStatsSerializer(stats_data)
        return Response(serializer.data)


class NotificationSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification settings"""
    serializer_class = NotificationSettingsSerializer
    permission_classes = [IsAuthenticated]
    queryset = NotificationSettings.objects.all()
    
    def get_queryset(self):
        return NotificationSettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        obj, created = NotificationSettings.objects.get_or_create(
            user=self.request.user,
            defaults={
                'email_device_offline': True,
                'email_low_battery': True,
                'email_geofence_breach': True,
                'sms_device_offline': True,
                'sms_geofence_breach': True,
                'push_device_offline': True,
                'push_low_battery': True,
                'push_geofence_breach': True,
                'push_command_response': True,
            }
        )
        return obj
    
    def list(self, request, *args, **kwargs):
        """Get or create notification settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Update notification settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

