from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'animals', views.AnimalViewSet)
router.register(r'devices', views.GPSDeviceViewSet)
router.register(r'locations', views.LocationDataViewSet)
router.register(r'commands', views.DeviceCommandViewSet)
router.register(r'geofences', views.GeofenceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]


