from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
import json


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    """User login endpoint"""
    data = request.data
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return Response(
            {'message': 'Username and password are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    if user is not None:
        # Clear any existing session first
        request.session.flush()
        login(request, user)
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': 'dummy-token'  # In production, use JWT tokens
        })
    else:
        return Response(
            {'message': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def logout_view(request):
    """User logout endpoint"""
    logout(request)
    # Clear the session
    request.session.flush()
    return Response({'message': 'Logout successful'})


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def register_view(request):
    """User registration endpoint"""
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    
    if not username or not email or not password:
        return Response(
            {'message': 'Username, email, and password are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'message': 'Username already exists'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(email=email).exists():
        return Response(
            {'message': 'Email already exists'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        return Response({
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': 'dummy-token'  # In production, use JWT tokens
        })
    except Exception as e:
        return Response(
            {'message': f'Registration failed: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def csrf_token_view(request):
    """Get CSRF token for frontend"""
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['GET'])
@permission_classes([AllowAny])
def user_view(request):
    """Get current user information"""
    if not request.user.is_authenticated:
        return Response({
            'authenticated': False,
            'message': 'Not authenticated'
        }, status=status.HTTP_200_OK)
        
    user = request.user
    return Response({
        'authenticated': True,
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'date_joined': user.date_joined,
    })