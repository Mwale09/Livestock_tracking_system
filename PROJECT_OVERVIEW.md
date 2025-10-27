# Livestock Tracking System - Project Overview

## 🎯 Project Summary

This is a comprehensive real-time livestock tracking system designed to work with Arduino IoT devices. The system provides real-time location tracking, device management, and notification capabilities for livestock monitoring.

## 🏗️ Architecture

### Frontend (React)
- **Location**: `frontend/`
- **Port**: 3000
- **Features**:
  - Real-time map with Leaflet integration
  - Animal management interface
  - Notification system
  - Device status monitoring
  - Quick action buttons (buzzer, SMS)

### Backend (Django)
- **Location**: `backend/`
- **Port**: 8000
- **Features**:
  - REST API with Django REST Framework
  - WebSocket support with Django Channels
  - Real-time location data processing
  - Notification system
  - Device command management

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Redis server (for WebSocket and background tasks)

### 1. Backend Setup
```bash
cd backend
python setup.py  # Automated setup
# OR manual setup:
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd frontend
node setup.js  # Automated setup
# OR manual setup:
npm install
npm start
```

### 3. Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin

## 📱 Key Features Implemented

### ✅ Real-time Location Tracking
- Live GPS tracking on interactive map
- WebSocket-based real-time updates
- Current location display for all animals
- Speed and heading information

### ✅ Device Management
- GPS device status monitoring (online/offline)
- Battery level tracking
- Device command system
- IMEI and phone number management

### ✅ Animal Management
- Complete animal profiles
- Individual tracking history
- Quick action buttons
- Detailed information pages

### ✅ Notification System
- Real-time notifications
- Configurable preferences (email, SMS, push)
- Offline device detection
- Low battery warnings

### ✅ History & Analytics
- Location history with date filtering
- Speed and heading tracking
- Comprehensive statistics

## 🔧 Technical Implementation

### Frontend Components
- **Dashboard**: Overview with stats and recent animals
- **Map**: Real-time tracking with Leaflet
- **Animals**: Management interface with quick actions
- **AnimalDetail**: Individual animal tracking and history
- **Notifications**: Notification management
- **Settings**: User preferences and configuration

### Backend Apps
- **auth**: User authentication and management
- **tracking**: Core tracking functionality
- **notifications**: Notification system

### Database Models
- **Animal**: Livestock information
- **GPSDevice**: Device management
- **LocationData**: GPS coordinates and metadata
- **DeviceCommand**: Command system
- **Notification**: Notification management
- **Geofence**: Safe zone definitions

## 📡 Arduino IoT Integration

### WebSocket Communication
- Endpoint: `ws://localhost:8000/ws/tracking/`
- Real-time location data processing
- Device status updates

### Expected Data Format
```json
{
  "device_id": "DEVICE_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2024-01-01T12:00:00Z",
  "speed": 5.2,
  "heading": 180,
  "battery_level": 85
}
```

### Command System
- **Buzzer Activation**: Triggers device buzzer
- **SMS Request**: Sends location via SMS
- **Status Request**: Requests device status

## 🛠️ Development Workflow

### Adding New Features
1. Backend: Add models, serializers, views, URLs
2. Frontend: Create components, update services
3. Test: Verify functionality end-to-end

### Database Changes
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Frontend Updates
```bash
cd frontend
npm start  # Development server with hot reload
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `GET /api/auth/user/` - Current user info

### Animals
- `GET /api/tracking/animals/` - List animals
- `POST /api/tracking/animals/` - Create animal
- `GET /api/tracking/animals/{id}/` - Animal details
- `POST /api/tracking/animals/{id}/activate_buzzer/` - Activate buzzer
- `POST /api/tracking/animals/{id}/request_sms/` - Request SMS

### Locations
- `GET /api/tracking/locations/current_locations/` - Current locations
- `GET /api/tracking/animals/{id}/location_history/` - Location history

### Notifications
- `GET /api/notifications/notifications/` - List notifications
- `POST /api/notifications/notifications/mark_all_as_read/` - Mark all read
- `GET /api/notifications/settings/` - Get settings
- `POST /api/notifications/settings/` - Update settings

## 🔒 Security Considerations

- User authentication required for all API endpoints
- CORS configured for frontend-backend communication
- Session-based authentication (can be upgraded to JWT)
- Input validation and sanitization

## 🚀 Deployment Notes

### Production Requirements
- PostgreSQL database
- Redis server
- Web server (Nginx/Apache)
- SSL certificates
- Environment variables configuration

### Environment Variables
```bash
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SMS_API_KEY=your-sms-key
EMAIL_HOST=your-smtp-host
```

## 📈 Future Enhancements

### Planned Features
- Mobile app (React Native)
- Advanced analytics dashboard
- Geofence management UI
- Bulk operations
- Data export functionality
- Advanced reporting

### Arduino Integration
- GPS module integration
- GSM module for SMS
- Buzzer control
- Battery monitoring
- Data transmission protocols

## 🐛 Troubleshooting

### Common Issues
1. **WebSocket connection failed**: Check Redis server
2. **CORS errors**: Verify CORS settings in Django
3. **Database errors**: Run migrations
4. **Frontend not loading**: Check npm dependencies

### Debug Mode
- Backend: Set `DEBUG=True` in settings
- Frontend: Check browser console for errors
- WebSocket: Monitor network tab for connection status

## 📞 Support

For issues and questions:
1. Check the README.md for detailed setup instructions
2. Review the API documentation
3. Check browser console and Django logs
4. Create an issue in the repository

---

**Status**: ✅ Complete - All core features implemented and ready for Arduino integration






