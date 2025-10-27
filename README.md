# Livestock Tracking System

A real-time livestock tracking system built with React frontend and Django backend, designed to work with Arduino IoT devices for GPS tracking.

## Features

### Real-time Tracking
- Live location tracking of each animal
- WebSocket-based real-time updates
- Interactive map with Leaflet integration
- Current location display for all animals

### Device Management
- GPS device status monitoring (online/offline)
- Battery level tracking
- Device command system (buzzer activation, SMS requests)
- IMEI and phone number management

### Animal Management
- Complete animal profiles (breed, gender, age, weight, color)
- Individual animal tracking history
- Quick action buttons for device control
- Detailed animal information pages

### Notification System
- Real-time notifications for device status changes
- Configurable notification preferences (email, SMS, push)
- Offline device detection and alerts
- Low battery warnings
- Geofence breach notifications

### History & Analytics
- Location history for individual animals
- Date range filtering for historical data
- Speed and heading tracking
- Comprehensive tracking statistics

## Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Leaflet** - Interactive maps
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - API development
- **Django Channels** - WebSocket support
- **PostgreSQL/SQLite** - Database
- **Redis** - Caching and message broker
- **Celery** - Background tasks

## Project Structure

```
├── frontend/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── App.js
│   └── package.json
├── backend/                 # Django backend
│   ├── livestock_tracking/ # Main Django project
│   ├── auth/               # Authentication app
│   ├── tracking/           # Core tracking app
│   ├── notifications/      # Notification system
│   └── requirements.txt
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Redis server
- PostgreSQL (optional, SQLite works for development)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser:
```bash
python manage.py createsuperuser
```

7. Start the development server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin

## Arduino IoT Integration

The system is designed to work with Arduino-based GPS trackers. The backend provides WebSocket endpoints for real-time communication:

### WebSocket Endpoints
- `ws://localhost:8000/ws/tracking/` - Main tracking WebSocket

### Data Format
The system expects location data in the following format:
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
The system can send commands to devices:
- **Buzzer Activation**: Triggers the device buzzer
- **SMS Request**: Sends location data via SMS
- **Status Request**: Requests current device status

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/register/` - User registration
- `GET /api/auth/user/` - Get current user

### Animals
- `GET /api/tracking/animals/` - List all animals
- `POST /api/tracking/animals/` - Create new animal
- `GET /api/tracking/animals/{id}/` - Get animal details
- `PUT /api/tracking/animals/{id}/` - Update animal
- `DELETE /api/tracking/animals/{id}/` - Delete animal
- `GET /api/tracking/animals/{id}/location_history/` - Get location history
- `POST /api/tracking/animals/{id}/activate_buzzer/` - Activate buzzer
- `POST /api/tracking/animals/{id}/request_sms/` - Request SMS

### Devices
- `GET /api/tracking/devices/` - List all devices
- `GET /api/tracking/devices/online_devices/` - Get online devices
- `GET /api/tracking/devices/offline_devices/` - Get offline devices

### Locations
- `GET /api/tracking/locations/` - List all locations
- `GET /api/tracking/locations/current_locations/` - Get current locations

### Notifications
- `GET /api/notifications/notifications/` - List notifications
- `POST /api/notifications/notifications/{id}/mark_as_read/` - Mark as read
- `POST /api/notifications/notifications/mark_all_as_read/` - Mark all as read
- `GET /api/notifications/notifications/unread_count/` - Get unread count
- `GET /api/notifications/notifications/stats/` - Get notification stats
- `GET /api/notifications/settings/` - Get notification settings
- `POST /api/notifications/settings/` - Update notification settings

## Usage

### Adding Animals
1. Navigate to the Animals page
2. Click "Add Animal" button
3. Fill in animal details (ID, name, breed, gender, etc.)
4. Save the animal

### Assigning GPS Devices
1. Go to the Django admin panel
2. Navigate to GPS Devices
3. Create a new device and assign it to an animal
4. Enter device details (IMEI, phone number, etc.)

### Real-time Tracking
1. Open the Map page to see all animal locations
2. The map updates in real-time as devices send location data
3. Click on markers to see animal details

### Managing Notifications
1. Go to the Notifications page to view all notifications
2. Configure notification preferences in Settings
3. Set up email/SMS providers for notifications

## Development

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Backend static files
cd backend
python manage.py collectstatic
```

## Deployment

### Environment Variables
Set the following environment variables for production:

```bash
SECRET_KEY=your-production-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://host:port
SMS_API_KEY=your-sms-api-key
EMAIL_HOST=your-smtp-host
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password
```

### Docker Deployment
Docker configuration files can be added for containerized deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.






