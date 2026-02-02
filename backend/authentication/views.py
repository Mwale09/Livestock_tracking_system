from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash

# ... existing imports ...

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if user.check_password(serializer.data.get('old_password')):
            user.set_password(serializer.data.get('new_password'))
            user.save()
            # Keep user logged in after password change
            update_session_auth_hash(request, user)
            return Response({'message': 'Password changed successfully'})
        return Response({'old_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer

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
        request.session.flush()
        login(request, user)
        serializer = UserSerializer(user)
        return Response({
            'message': 'Login successful',
            'user': serializer.data,
            'token': 'dummy-token'
        })
    else:
        return Response(
            {'message': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def logout_view(request):
    """User logout endpoint"""
    logout(request)
    if hasattr(request, 'session'):
        request.session.flush()
    return Response({'message': 'Logout successful'})

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def register_view(request):
    """User registration endpoint"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'Registration successful. Please log in with your new account.',
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
@csrf_exempt
def csrf_token_view(request):
    """Get CSRF token for frontend"""
    token = get_token(request)
    return Response({'csrfToken': token})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    """Get current user information"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update user profile"""
    user = request.user
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if user.check_password(serializer.data.get('old_password')):
            user.set_password(serializer.data.get('new_password'))
            user.save()
            return Response({'message': 'Password changed successfully'})
        return Response({'old_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)