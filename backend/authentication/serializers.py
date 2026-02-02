from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone_number', 'address']

class UserSerializer(serializers.ModelSerializer):
    userprofile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'userprofile']
        read_only_fields = ['username']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('userprofile', None)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update UserProfile fields
        if profile_data:
            # Handle case where profile might not exist for older users
            if hasattr(instance, 'userprofile'):
                profile = instance.userprofile
            else:
                profile = UserProfile.objects.create(user=instance)
            
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'address']

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', None)
        address = validated_data.pop('address', None)
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Profile is created by signal, update it
        if phone_number or address:
            profile = user.userprofile
            if phone_number:
                profile.phone_number = phone_number
            if address:
                profile.address = address
            profile.save()
            
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
