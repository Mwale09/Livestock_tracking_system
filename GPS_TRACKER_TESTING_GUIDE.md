# GPS Tracker Testing Guide (XOD Simulation)

## System Status: ✅ READY FOR TESTING

Your livestock tracking system is now fully ready to receive data from your simulated GPS tracker (Arduino Uno + SIM808) via XOD.

## What's Been Implemented

### ✅ Location Update Endpoint
- **URL**: `http://127.0.0.1:8000/api/tracking/update_location/`
- **Method**: POST
- **Authentication**: None required (for GPS devices)
- **Features**:
  - Accepts location data from GPS devices
  - Updates device status and battery level
  - Checks geofence violations automatically
  - Creates notifications for breaches
  - Broadcasts updates via WebSocket for real-time map updates

### ✅ Geofence Monitoring
- Automatic geofence violation detection
- Distance calculation using Haversine formula
- Notification creation for breaches
- Real-time alerts

### ✅ WebSocket Integration
- Real-time location updates on the map
- Device status updates
- Battery level monitoring

## Setup Steps

### 1. Create Test Device (If Not Already Done)

Run the test user creation script:

```bash
cd backend
python create_test_user.py
```

This creates:
- **User**: testuser / testpass123
- **Animal**: COW001 (Bella)
- **GPS Device**: GPS001 (IMEI: 123456789012345)

### 2. Test the Endpoint with Postman/cURL

#### Using device_id:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS001",
    "latitude": -17.85,
    "longitude": 31.05,
    "status": "OK",
    "battery_level": 85
  }' \
  http://127.0.0.1:8000/api/tracking/update_location/
```

#### Using IMEI:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "imei": "123456789012345",
    "latitude": -17.85,
    "longitude": 31.05,
    "status": "OK",
    "battery_level": 85
  }' \
  http://127.0.0.1:8000/api/tracking/update_location/
```

#### Full Example with All Fields:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS001",
    "latitude": -17.85,
    "longitude": 31.05,
    "altitude": 1500.5,
    "speed": 0.0,
    "heading": 180.0,
    "accuracy": 10.5,
    "status": "OK",
    "battery_level": 85,
    "timestamp": "2024-01-15T10:30:00Z"
  }' \
  http://127.0.0.1:8000/api/tracking/update_location/
```

### 3. XOD Configuration

In your XOD simulation, configure the HTTP POST node to send data to:

**Endpoint**: `http://127.0.0.1:8000/api/tracking/update_location/`

**JSON Payload Format**:
```json
{
  "device_id": "GPS001",
  "latitude": -17.85,
  "longitude": 31.05,
  "status": "OK",
  "battery_level": 85
}
```

**Required Fields**:
- `device_id` OR `imei` (one of these is required)
- `latitude` (decimal degrees, e.g., -17.85)
- `longitude` (decimal degrees, e.g., 31.05)

**Optional Fields**:
- `status`: "OK", "ONLINE", "LOW_BATTERY", "LOW", "ERROR", "OFFLINE"
- `battery_level`: 0-100 (integer)
- `altitude`: meters (decimal)
- `speed`: km/h (decimal)
- `heading`: degrees 0-360 (decimal)
- `accuracy`: meters (decimal)
- `timestamp`: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")

### 4. Testing Geofence Violations

1. **Create a Geofence** (via web interface or admin):
   - Go to the web app
   - Navigate to Geofences
   - Create a geofence for your test animal
   - Set center coordinates and radius

2. **Send Location Outside Geofence**:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{
       "device_id": "GPS001",
       "latitude": -18.0,
       "longitude": 31.1,
       "status": "OK"
     }' \
     http://127.0.0.1:8000/api/tracking/update_location/
   ```

3. **Check Notifications**:
   - A notification will be created automatically
   - Check the Notifications page in the web app
   - The response will include geofence violation details

## Expected Response

### Success Response:
```json
{
  "message": "Location updated successfully",
  "location": {
    "id": 1,
    "device": 1,
    "device_id": "GPS001",
    "animal_name": "Bella",
    "latitude": "-17.8500000",
    "longitude": "31.0500000",
    "timestamp": "2024-01-15T10:30:00Z",
    ...
  },
  "device_status": "online",
  "battery_level": 85
}
```

### Response with Geofence Violation:
```json
{
  "message": "Location updated successfully",
  "location": {...},
  "device_status": "online",
  "battery_level": 85,
  "geofence_violations": [
    "Pasture 1: 1250.50m outside (radius: 500.00m)"
  ],
  "warning": "Geofence breach detected!"
}
```

### Error Responses:

**Device Not Found**:
```json
{
  "error": "GPS device not found. Please register the device first."
}
```

**Missing Required Fields**:
```json
{
  "error": "latitude and longitude are required"
}
```

## Arduino + SIM808 Integration Notes

When you build your actual hardware tracker, your Arduino code should:

1. **Get GPS coordinates** from SIM808 module
2. **Format JSON payload** with device_id or IMEI
3. **Send HTTP POST** to the endpoint
4. **Handle response** (optional, for error checking)

### Example Arduino Code Structure:
```cpp
// Pseudo-code structure
void sendLocationUpdate() {
  float lat = getGPSLatitude();
  float lon = getGPSLongitude();
  int battery = getBatteryLevel();
  
  String json = "{";
  json += "\"device_id\":\"GPS001\",";
  json += "\"latitude\":" + String(lat) + ",";
  json += "\"longitude\":" + String(lon) + ",";
  json += "\"battery_level\":" + String(battery);
  json += "}";
  
  httpPost("http://127.0.0.1:8000/api/tracking/update_location/", json);
}
```

## Testing Checklist

- [ ] Backend server is running (`python manage.py runserver`)
- [ ] Test device is created (run `create_test_user.py`)
- [ ] Test endpoint with Postman/cURL
- [ ] Verify location appears on map in web app
- [ ] Create a geofence
- [ ] Test geofence violation detection
- [ ] Check notifications are created
- [ ] Test with XOD simulation
- [ ] Verify WebSocket updates work (real-time map updates)

## Troubleshooting

### "GPS device not found" Error
- Make sure you've created a GPS device in the system
- Check that `device_id` or `imei` matches exactly
- Run `create_test_user.py` to create test device

### Location Not Appearing on Map
- Check WebSocket connection in browser console
- Verify the location was saved (check admin panel)
- Refresh the map page

### Geofence Not Triggering
- Ensure geofence is active (`is_active=True`)
- Verify geofence is assigned to the correct animal
- Check that location is actually outside the geofence radius

## Next Steps

1. **Test with XOD**: Simulate your tracker sending location updates
2. **Create Geofences**: Set up safe zones for your animals
3. **Monitor Notifications**: Check that alerts are working
4. **Build Hardware**: When ready, integrate with actual Arduino + SIM808

## Support

If you encounter any issues:
1. Check Django server logs for errors
2. Verify device exists in database
3. Test endpoint with Postman first
4. Check browser console for WebSocket errors

---

**You're all set! Your system is ready to receive GPS tracking data.** 🎉







