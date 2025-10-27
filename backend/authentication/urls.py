from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('user/', views.user_view, name='user'),
    path('csrf-token/', views.csrf_token_view, name='csrf_token'),
]