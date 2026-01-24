# Arduino + SIM808 GPS Livestock Tracker - Build Guide

## 🎯 Project Objectives

1. ✅ Provide accurate, real-time location tracking of each animal
2. ✅ Develop a user interface that allows farmers to easily view and monitor their cattle
3. ✅ Send notifications when device goes offline (SMS) and to server when online
4. ✅ Alert both server and SMS when livestock crosses geofenced area
5. ✅ Sound an alarm when user activates it on web app

## 📦 Hardware Components You Have

- **Arduino Uno** - Microcontroller board
- **SIM808 Module** - GPS + GSM/GPRS combined module
- **Buzzer** - For alarm/alert sounds
- **Breadboard** - For prototyping
- **Econet SIM Card** - For GSM/GPRS connectivity

## 🔌 Additional Components Needed

- **Jumper wires** (Male-to-Male and Male-to-Female)
- **Power supply** for SIM808 (needs 5V 2A minimum for GSM operation)
- **GPS antenna** (usually comes with SIM808)
- **GSM antenna** (usually comes with SIM808)
- **microSD card** (optional, for logging)
- **Resistor** for buzzer (220Ω recommended)
- **External battery pack** (for portable operation - 7-12V for Arduino)

---

## 📍 PART 1: HARDWARE SETUP

### 1.1 Understanding the SIM808 Module

The SIM808 combines GPS and GSM functionality:
- **GPS**: Receives satellite signals for location tracking
- **GSM**: Sends data via cellular network (GPRS/HTTP) and SMS

**Important Pins:**
- VCC (5V power)
- GND (Ground)
- TX/RX (Serial communication)
- PWR_KEY (Power on/off)
- STATUS (Module status LED)

### 1.2 Wiring Diagram (SUPER SIMPLE LAPTOP SETUP!)

```
        LAPTOP
    USB1  |  USB2
      ↓   |   ↓
   Arduino | SIM808 (Both powered via USB!)
      ↓   |   ↓
      └───┴───┘  Common GND wire (CRITICAL!)

Arduino Uno          SIM808 Module
-----------          --------------
GND       -------->  GND (to breadboard - MUST CONNECT!)
Pin 7     -------->  TX (SIM808)
Pin 8     -------->  RX (SIM808)
Pin 4     -------->  PWR_KEY

Arduino Uno          Buzzer
-----------          ------
Pin 9     ----[220Ω]---> Positive (+)
GND       ------------>  Negative (-)
```

**IMPORTANT POWER NOTES (SUPER BEGINNER-FRIENDLY!):**
- **Arduino:** USB cable from laptop → Arduino USB port ✅
- **SIM808:** USB cable from laptop → SIM808 USB port ✅
- **CRITICAL:** Connect Arduino GND pin to SIM808 GND pin (via breadboard)!
  * Even though both have USB power, GND pins MUST be connected
  * This creates common ground reference for signals

**⚠️ Laptop Power Limitation:**
- May reset during transmission (not enough current)
- This is SAFE and normal - perfect for testing!
- Upgrade to wall charger later if needed ($2-5)

📘 **See LAPTOP_USB_POWER_GUIDE.md for complete instructions!**

### 1.3 Step-by-Step Wiring Instructions

1. **Insert your Econet SIM card** into the SIM808 module (SIM card slot)
   - Make sure PIN lock is disabled on the SIM
   - Test the SIM in a phone first to ensure it has credit and data

2. **Connect GPS antenna** to SIM808 GPS connector

3. **Connect GSM antenna** to SIM808 GSM connector

4. **Wire Arduino to SIM808:**
   ```
   Arduino Pin 7 → SIM808 TX
   Arduino Pin 8 → SIM808 RX
   Arduino GND → SIM808 GND
   Arduino Pin 4 → SIM808 PWR_KEY
   ```

5. **Connect external power supply:**
   ```
   5V 2A Supply → SIM808 VCC
   Supply GND → SIM808 GND (and Arduino GND)
   ```

6. **Wire the buzzer:**
   ```
   Arduino Pin 9 → 220Ω Resistor → Buzzer (+)
   Arduino GND → Buzzer (-)
   ```

### 1.4 Testing the Hardware Connection

Before programming, verify:
- [ ] All connections are secure
- [ ] SIM808 power LED lights up when power is applied
- [ ] GPS antenna is connected (blue LED should blink when searching for satellites)
- [ ] GSM antenna is connected
- [ ] SIM card is properly inserted

---

## 💻 PART 2: SOFTWARE SETUP

### 2.1 Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install for Windows
3. Launch Arduino IDE

### 2.2 Install Required Libraries

Open Arduino IDE → Tools → Manage Libraries

Install these libraries:

1. **TinyGPS++** (for GPS parsing)
   - Search: "TinyGPS++"
   - Install by Mikal Hart

2. **SoftwareSerial** (built-in, no install needed)

3. **ArduinoJson** (for JSON formatting)
   - Search: "ArduinoJson"
   - Install by Benoit Blanchon

### 2.3 Arduino Code Structure

Here's the complete Arduino code broken into logical sections:

#### **Complete Arduino Code for GPS Tracker**

```cpp
#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>

// ======================== CONFIGURATION ========================
// Pin Definitions
#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4
#define BUZZER_PIN 9

// Your settings - CHANGE THESE!
const char* DEVICE_ID = "GPS001";           // Your device ID in database
const char* IMEI = "123456789012345";       // Your SIM808 IMEI (get via AT+GSN)
const char* APN = "internet";               // Econet APN (usually "internet")
const char* SERVER_URL = "your-server-ip";  // Replace with your server IP or domain
const int SERVER_PORT = 8000;
const char* ALERT_PHONE = "+263771234567";  // Farmer's phone number for SMS alerts

// Timing Configuration
const unsigned long GPS_UPDATE_INTERVAL = 60000;      // Send location every 60 seconds
const unsigned long GPS_TIMEOUT = 120000;             // GPS fix timeout (2 minutes)
const unsigned long COMMAND_CHECK_INTERVAL = 30000;   // Check for commands every 30 seconds
const unsigned long OFFLINE_SMS_INTERVAL = 300000;    // Send offline SMS after 5 minutes

// ======================== OBJECTS ========================
SoftwareSerial sim808(SIM808_TX, SIM808_RX);
TinyGPSPlus gps;

// ======================== GLOBAL VARIABLES ========================
unsigned long lastGPSUpdate = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastOnlineTime = 0;
bool isOnline = false;
bool gpsFixed = false;
int batteryLevel = 100;
bool buzzerActive = false;

// ======================== SETUP ========================
void setup() {
  Serial.begin(9600);
  sim808.begin(9600);
  
  pinMode(SIM808_PWR, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  Serial.println(F("=== GPS Livestock Tracker Starting ==="));
  
  // Power on SIM808
  powerOnSIM808();
  delay(5000);
  
  // Initialize SIM808
  initializeSIM808();
  
  Serial.println(F("=== System Ready ==="));
}

// ======================== MAIN LOOP ========================
void loop() {
  // Read GPS data continuously
  while (sim808.available() > 0) {
    gps.encode(sim808.read());
  }
  
  // Update GPS location at intervals
  if (millis() - lastGPSUpdate >= GPS_UPDATE_INTERVAL) {
    lastGPSUpdate = millis();
    
    if (gps.location.isValid()) {
      gpsFixed = true;
      sendLocationToServer();
    } else {
      Serial.println(F("Waiting for GPS fix..."));
      gpsFixed = false;
    }
  }
  
  // Check for server commands (buzzer activation)
  if (millis() - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = millis();
    checkForCommands();
  }
  
  // Check if we've been offline too long
  if (!isOnline && (millis() - lastOnlineTime >= OFFLINE_SMS_INTERVAL)) {
    sendOfflineSMS();
    lastOnlineTime = millis(); // Reset timer
  }
  
  // Update battery level
  batteryLevel = getBatteryLevel();
  
  // Handle buzzer
  if (buzzerActive) {
    tone(BUZZER_PIN, 2000); // 2kHz tone
  } else {
    noTone(BUZZER_PIN);
  }
}

// ======================== SIM808 INITIALIZATION ========================
void powerOnSIM808() {
  Serial.println(F("Powering on SIM808..."));
  digitalWrite(SIM808_PWR, HIGH);
  delay(2000);
  digitalWrite(SIM808_PWR, LOW);
  delay(3000);
}

void initializeSIM808() {
  Serial.println(F("Initializing SIM808..."));
  
  // Test AT communication
  sendATCommand("AT", "OK", 2000);
  
  // Disable echo
  sendATCommand("ATE0", "OK", 2000);
  
  // Check signal strength
  sendATCommand("AT+CSQ", "OK", 2000);
  
  // Check SIM card
  sendATCommand("AT+CPIN?", "READY", 5000);
  
  // Get IMEI
  sendATCommand("AT+GSN", "OK", 2000);
  
  // Enable GPS
  sendATCommand("AT+CGNSPWR=1", "OK", 2000);
  
  // Configure GPRS
  setupGPRS();
  
  Serial.println(F("SIM808 initialized successfully!"));
}

void setupGPRS() {
  Serial.println(F("Setting up GPRS..."));
  
  // Set connection type to GPRS
  sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", "OK", 2000);
  
  // Set APN
  String apnCmd = "AT+SAPBR=3,1,\"APN\",\"" + String(APN) + "\"";
  sendATCommand(apnCmd.c_str(), "OK", 2000);
  
  // Open bearer
  sendATCommand("AT+SAPBR=1,1", "OK", 5000);
  
  // Query bearer
  sendATCommand("AT+SAPBR=2,1", "OK", 2000);
}

// ======================== GPS FUNCTIONS ========================
void sendLocationToServer() {
  Serial.println(F("\n=== Sending Location to Server ==="));
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["latitude"] = gps.location.lat();
  doc["longitude"] = gps.location.lng();
  doc["altitude"] = gps.altitude.meters();
  doc["speed"] = gps.speed.kmph();
  doc["heading"] = gps.course.deg();
  doc["accuracy"] = gps.hdop.hdop();
  doc["status"] = "OK";
  doc["battery_level"] = batteryLevel;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print(F("JSON: "));
  Serial.println(jsonPayload);
  
  // Send HTTP POST request
  bool success = sendHTTPPost(jsonPayload);
  
  if (success) {
    Serial.println(F("✓ Location sent successfully"));
    isOnline = true;
    lastOnlineTime = millis();
  } else {
    Serial.println(F("✗ Failed to send location"));
    isOnline = false;
  }
}

bool sendHTTPPost(String payload) {
  // Initialize HTTP
  sendATCommand("AT+HTTPINIT", "OK", 2000);
  
  // Set HTTP parameters
  sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 2000);
  
  // Set URL
  String urlCmd = "AT+HTTPPARA=\"URL\",\"http://" + String(SERVER_URL) + 
                  ":" + String(SERVER_PORT) + "/api/tracking/update_location/\"";
  sendATCommand(urlCmd.c_str(), "OK", 2000);
  
  // Set content type
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 2000);
  
  // Set data length
  String dataCmd = "AT+HTTPDATA=" + String(payload.length()) + ",10000";
  sim808.println(dataCmd);
  delay(1000);
  
  // Send data
  sim808.println(payload);
  delay(2000);
  
  // Execute POST request
  sim808.println("AT+HTTPACTION=1"); // 1 = POST
  delay(5000);
  
  // Read response
  bool success = false;
  unsigned long timeout = millis();
  while (millis() - timeout < 10000) {
    if (sim808.available()) {
      String response = sim808.readString();
      Serial.println(response);
      if (response.indexOf("+HTTPACTION: 1,200") != -1 || 
          response.indexOf("+HTTPACTION: 1,201") != -1) {
        success = true;
        break;
      }
    }
  }
  
  // Terminate HTTP
  sendATCommand("AT+HTTPTERM", "OK", 2000);
  
  return success;
}

// ======================== SMS FUNCTIONS ========================
void sendOfflineSMS() {
  Serial.println(F("Sending offline SMS alert..."));
  
  String message = "ALERT: GPS Tracker ";
  message += DEVICE_ID;
  message += " is OFFLINE. Last location: ";
  
  if (gps.location.isValid()) {
    message += "https://maps.google.com/?q=";
    message += String(gps.location.lat(), 6);
    message += ",";
    message += String(gps.location.lng(), 6);
  } else {
    message += "Unknown";
  }
  
  sendSMS(ALERT_PHONE, message);
}

void sendGeofenceSMS(String geofenceName) {
  Serial.println(F("Sending geofence breach SMS..."));
  
  String message = "ALERT: Animal has left geofence '";
  message += geofenceName;
  message += "'. Location: https://maps.google.com/?q=";
  message += String(gps.location.lat(), 6);
  message += ",";
  message += String(gps.location.lng(), 6);
  
  sendSMS(ALERT_PHONE, message);
}

bool sendSMS(const char* phoneNumber, String message) {
  // Set SMS text mode
  sendATCommand("AT+CMGF=1", "OK", 2000);
  
  // Set phone number
  String phoneCmd = "AT+CMGS=\"" + String(phoneNumber) + "\"";
  sim808.println(phoneCmd);
  delay(1000);
  
  // Send message
  sim808.print(message);
  delay(100);
  
  // Send Ctrl+Z to send SMS
  sim808.write(26);
  delay(5000);
  
  // Check for success
  bool success = false;
  unsigned long timeout = millis();
  while (millis() - timeout < 10000) {
    if (sim808.available()) {
      String response = sim808.readString();
      Serial.println(response);
      if (response.indexOf("+CMGS") != -1) {
        success = true;
        break;
      }
    }
  }
  
  return success;
}

// ======================== COMMAND CHECKING ========================
void checkForCommands() {
  // Check for pending buzzer commands from server
  // This would require polling an endpoint or checking SMS
  
  // Example: Check for SMS commands
  sim808.println("AT+CMGL=\"ALL\"");
  delay(2000);
  
  String response = "";
  unsigned long timeout = millis();
  while (millis() - timeout < 5000 && sim808.available()) {
    response += (char)sim808.read();
  }
  
  // Parse SMS for commands
  if (response.indexOf("BUZZER_ON") != -1) {
    buzzerActive = true;
    Serial.println(F("Buzzer activated via SMS"));
  }
  if (response.indexOf("BUZZER_OFF") != -1) {
    buzzerActive = false;
    Serial.println(F("Buzzer deactivated via SMS"));
  }
  
  // Delete read messages
  sendATCommand("AT+CMGD=1,4", "OK", 2000);
}

// ======================== UTILITY FUNCTIONS ========================
int getBatteryLevel() {
  sim808.println("AT+CBC");
  delay(1000);
  
  String response = "";
  while (sim808.available()) {
    response += (char)sim808.read();
  }
  
  // Parse battery level from response
  // +CBC: 0,70,4.2V
  int commaIndex = response.indexOf(',');
  if (commaIndex != -1) {
    int secondComma = response.indexOf(',', commaIndex + 1);
    if (secondComma != -1) {
      String batteryStr = response.substring(commaIndex + 1, secondComma);
      return batteryStr.toInt();
    }
  }
  
  return 100; // Default value
}

bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
  Serial.print(F("AT Command: "));
  Serial.println(command);
  
  sim808.println(command);
  
  String response = "";
  unsigned long startTime = millis();
  
  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      char c = sim808.read();
      response += c;
    }
    
    if (response.indexOf(expectedResponse) != -1) {
      Serial.print(F("Response: "));
      Serial.println(response);
      return true;
    }
  }
  
  Serial.println(F("Timeout or unexpected response"));
  Serial.println(response);
  return false;
}
```

---

## 🚀 PART 3: DEPLOYMENT & TESTING

### 3.1 Configure Your Settings

Before uploading, change these in the code:

```cpp
const char* DEVICE_ID = "GPS001";           // Your device ID
const char* IMEI = "YOUR_IMEI_HERE";        // Get via AT+GSN command
const char* APN = "internet";               // Check with Econet
const char* SERVER_URL = "192.168.1.100";   // Your server IP
const int SERVER_PORT = 8000;
const char* ALERT_PHONE = "+263771234567";  // Your phone number
```

### 3.2 Upload Code to Arduino

1. Connect Arduino Uno to computer via USB
2. Open Arduino IDE
3. Select: Tools → Board → Arduino Uno
4. Select: Tools → Port → (your Arduino port)
5. Click Upload button
6. Wait for "Done uploading" message

### 3.3 Testing Procedure

#### Step 1: Power On Test
```
1. Connect power to Arduino and SIM808
2. Open Serial Monitor (Tools → Serial Monitor)
3. Set baud rate to 9600
4. You should see initialization messages
```

#### Step 2: GPS Fix Test
```
1. Place GPS antenna near window or outdoors
2. Wait 2-5 minutes for GPS fix (cold start)
3. Serial monitor should show "GPS Fixed" messages
4. You'll see latitude/longitude values
```

#### Step 3: GSM Connection Test
```
1. Check for "Network registered" message
2. Signal strength should be > 10 (AT+CSQ response)
3. GPRS should connect successfully
```

#### Step 4: Server Communication Test
```
1. Make sure your Django server is running
2. Make sure server is accessible from tracker
3. Watch Serial Monitor for "Location sent successfully"
4. Check Django logs for incoming data
5. Verify location appears on web app map
```

#### Step 5: SMS Test
```
1. Send test SMS to tracker: "BUZZER_ON"
2. Buzzer should activate
3. Send "BUZZER_OFF" to deactivate
4. Test offline SMS by disconnecting server
```

### 3.4 Troubleshooting Common Issues

#### GPS Not Getting Fix
- Ensure GPS antenna is connected
- Move to location with clear sky view
- Wait up to 5 minutes for cold start
- Blue LED on SIM808 should blink

#### GSM Not Connecting
- Check SIM card is inserted correctly
- Verify SIM has credit and data
- Check APN settings for Econet
- Verify GSM antenna is connected
- Check signal strength (AT+CSQ)

#### Can't Send Data to Server
- Verify server IP address is correct
- Check if server is reachable from network
- Test with public IP or ngrok tunnel
- Check firewall settings
- Verify Django server is running

#### High Power Consumption
- SIM808 uses ~2A during transmission
- Use adequate power supply
- Consider power-saving modes
- Implement sleep modes between updates

---

## 📱 PART 4: INTEGRATION WITH YOUR SYSTEM

### 4.1 Register Device in Database

You need to create a GPS device entry in your Django system:

**Option 1: Via Django Admin**
```
1. Go to http://127.0.0.1:8000/admin
2. Navigate to Tracking → GPS Devices
3. Click "Add GPS Device"
4. Fill in:
   - Device ID: GPS001
   - IMEI: (your SIM808 IMEI)
   - Phone Number: (SIM card number)
   - Animal: (select animal)
5. Save
```

**Option 2: Via Python Script**

Create `create_tracker_device.py` in backend folder:

```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livestock_tracking.settings')
django.setup()

from tracking.models import Animal, GPSDevice
from django.contrib.auth.models import User

# Get or create user
user, _ = User.objects.get_or_create(
    username='farmer1',
    defaults={'email': 'farmer@example.com'}
)
user.set_password('securepass123')
user.save()

# Create animal
animal, _ = Animal.objects.get_or_create(
    id='COW001',
    defaults={
        'name': 'Bella',
        'breed': 'holstein',
        'gender': 'female',
        'birth_date': '2020-01-01',
        'category': 'cow',
        'owner': user,
        'is_active': True
    }
)

# Create GPS device
device, created = GPSDevice.objects.get_or_create(
    device_id='GPS001',
    defaults={
        'animal': animal,
        'imei': '123456789012345',  # CHANGE THIS TO YOUR IMEI
        'phone_number': '+263771234567',  # CHANGE THIS
        'status': 'offline',
        'battery_level': 100
    }
)

if created:
    print(f"✓ Created GPS device: {device}")
else:
    print(f"✓ GPS device already exists: {device}")

print(f"\nDevice ID: {device.device_id}")
print(f"Animal: {device.animal.name}")
print(f"IMEI: {device.imei}")
```

Run it:
```bash
cd backend
python create_tracker_device.py
```

### 4.2 Configure Geofences

Create geofences in the web app:
```
1. Login to web app
2. Navigate to Geofences section
3. Click "Create Geofence"
4. Select animal (COW001)
5. Click on map to set center
6. Set radius (e.g., 500 meters)
7. Name it (e.g., "Pasture 1")
8. Save
```

### 4.3 Testing Complete System

**Test 1: Location Tracking**
- [ ] Tracker sends location every 60 seconds
- [ ] Location appears on web app map in real-time
- [ ] Location history is recorded

**Test 2: Geofence Alerts**
- [ ] Move tracker outside geofence
- [ ] System creates notification
- [ ] SMS is sent to farmer
- [ ] Alert shows on web app

**Test 3: Offline Detection**
- [ ] Disconnect tracker from power
- [ ] After 5 minutes, SMS is sent
- [ ] Web app shows device as offline

**Test 4: Buzzer Control**
- [ ] Click "Activate Alarm" on web app
- [ ] Tracker receives command
- [ ] Buzzer sounds
- [ ] Can be deactivated from web app

---

## 🔋 PART 5: POWER OPTIMIZATION

### 5.1 Power Consumption

- **Active mode**: ~500mA (Arduino) + 2A peak (SIM808) = ~2.5A
- **GPS off**: ~100mA (Arduino) + 10mA (SIM808 sleep)

### 5.2 Battery Life Calculations

With 10,000mAh battery:
- Continuous operation: ~4 hours
- With sleep mode (10% duty cycle): ~40 hours

### 5.3 Power Saving Code Modifications

Add to your code:

```cpp
// Put Arduino to sleep between updates
#include <avr/sleep.h>
#include <avr/power.h>

void enterSleep() {
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  sleep_enable();
  sleep_mode();
  sleep_disable();
}

// Turn off GPS when not needed
void gpsOff() {
  sendATCommand("AT+CGNSPWR=0", "OK", 2000);
}

void gpsOn() {
  sendATCommand("AT+CGNSPWR=1", "OK", 2000);
}
```

---

## 📊 PART 6: MONITORING & MAINTENANCE

### 6.1 What to Monitor

- GPS fix quality (HDOP value)
- Signal strength (CSQ value)
- Battery level
- Data transmission success rate
- Location update frequency

### 6.2 Serial Monitor Output

Good output looks like:
```
=== GPS Livestock Tracker Starting ===
Powering on SIM808...
Initializing SIM808...
AT Command: AT
Response: OK
GPS Fixed: Lat=-17.850000, Lon=31.050000
Sending location to server...
✓ Location sent successfully
Battery: 85%
Signal: 18
```

### 6.3 Debugging Tips

**Enable verbose logging:**
```cpp
#define DEBUG_MODE 1

#ifdef DEBUG_MODE
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif
```

---

## 🎯 NEXT STEPS & IMPROVEMENTS

### Phase 1 (Current): Basic Functionality
- [x] GPS location tracking
- [x] Send data to server via GPRS
- [x] SMS notifications
- [x] Buzzer control
- [x] Geofence detection

### Phase 2: Enhancements
- [ ] Solar panel integration
- [ ] Waterproof enclosure
- [ ] Multiple sensor support (temperature, heart rate)
- [ ] Low power mode with wake-on-SMS
- [ ] Local storage on microSD card

### Phase 3: Advanced Features
- [ ] Multiple tracker coordination
- [ ] Predictive movement analysis
- [ ] Health monitoring sensors
- [ ] Mesh networking between trackers

---

## 📞 SUPPORT & RESOURCES

### Useful AT Commands for SIM808

```
AT                  - Test command
AT+CSQ              - Signal quality
AT+CPIN?            - Check SIM status
AT+CREG?            - Network registration
AT+CGPSINF=0        - Get GPS information
AT+CGNSPWR=1        - Power on GPS
AT+CBC              - Battery status
AT+SAPBR=2,1        - Query GPRS bearer
AT+GSN              - Get IMEI
```

### Common Error Codes

- `+CME ERROR: 3` - Operation not allowed
- `+CME ERROR: 10` - SIM not inserted
- `+CME ERROR: 13` - SIM failure
- `+CME ERROR: 14` - SIM busy
- `+CME ERROR: 515` - Please wait, init or command processing

### Resources

- **SIM808 Documentation**: Search for "SIM808 Hardware Design Guide"
- **TinyGPS++ Library**: https://github.com/mikalhart/TinyGPSPlus
- **Arduino Reference**: https://www.arduino.cc/reference/en/
- **AT Command Manual**: SIM808_AT_Command_Manual

---

## ✅ FINAL CHECKLIST

Before deploying:

- [ ] All wiring connections are secure
- [ ] SIM card has data and credit
- [ ] GPS antenna has clear sky view
- [ ] Power supply provides adequate current (2A+)
- [ ] Code is uploaded successfully
- [ ] Device is registered in database
- [ ] Server is accessible from network
- [ ] Geofences are configured
- [ ] Phone number for alerts is correct
- [ ] Tested in controlled environment
- [ ] Enclosure is weatherproof (for outdoor use)
- [ ] Backup power source available

---

## 🎉 SUCCESS!

Once everything is working:
1. Your tracker will send location every 60 seconds
2. Web app will show real-time location on map
3. You'll get SMS alerts when animal leaves geofence
4. You'll get SMS alerts when tracker goes offline
5. You can activate buzzer remotely from web app

**Congratulations on building your GPS livestock tracker!** 🐄📡

---

*Last Updated: January 24, 2026*
*Project: Final Year Livestock Tracking System*
