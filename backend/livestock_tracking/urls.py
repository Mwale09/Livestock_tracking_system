"""
URL configuration for livestock_tracking project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/tracking/', include('tracking.urls')),
    path('api/notifications/', include('notifications.urls')),
]

# Serve media and static files in development and production (fallback for Render)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
