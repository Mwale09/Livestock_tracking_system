# 🚀 GPS Tracker Quick Start Checklist

Use this checklist to quickly get your tracker up and running!

## 📋 Pre-Build Checklist

### Hardware Preparation
- [ ] Arduino Uno
- [ ] SIM808 module with GPS antenna
- [ ] SIM808 module with GSM antenna  
- [ ] Buzzer
- [ ] Breadboard
- [ ] Jumper wires (male-to-male, male-to-female)
- [ ] 5V 2A power supply (for SIM808)
- [ ] 220Ω resistor (for buzzer)
- [ ] Econet SIM card (with data and credit)

### SIM Card Preparation
- [ ] Insert SIM in phone and verify it works
- [ ] Disable PIN lock on SIM card
- [ ] Ensure SIM has airtime credit
- [ ] Ensure SIM has data bundle
- [ ] Note down SIM phone number

### Software Preparation
- [ ] Arduino IDE installed
- [ ] TinyGPS++ library installed
- [ ] ArduinoJson library installed
- [ ] USB cable for Arduino (connects to laptop)
- [ ] USB cable for SIM808 (connects to laptop)
- [ ] (Optional later) Wall charger 5V 2A for more reliable power

---

## 🔌 Wiring Checklist

Follow this exact order:

### Step 1: Power Connections (Super Simple Laptop Setup!)
- [ ] **Arduino Power:** USB cable from laptop to Arduino USB port ✅
- [ ] **SIM808 Power:** USB cable from laptop to SIM808 USB port ✅
- [ ] **Connect Ground:** Arduino GND pin → SIM808 GND pin (breadboard rail)
- [ ] **IMPORTANT:** Even though both have USB power, you MUST connect GND pins together!
- [ ] DO NOT power on yet!

**Note:** Laptop USB might not provide enough power during transmission (expect possible resets). This is SAFE and perfect for initial testing! Upgrade to wall charger later if needed.

### Step 2: Arduino to SIM808
- [ ] Arduino Pin 7 → SIM808 TX
- [ ] Arduino Pin 8 → SIM808 RX  
- [ ] Arduino Pin 4 → SIM808 PWR_KEY
- [ ] Arduino GND → SIM808 GND (via breadboard)

### Step 3: Buzzer
- [ ] Arduino Pin 9 → 220Ω resistor → Buzzer (+)
- [ ] Arduino GND → Buzzer (-) (via breadboard)

### Step 4: Antennas & SIM
- [ ] GPS antenna connected to SIM808
- [ ] GSM antenna connected to SIM808
- [ ] SIM card inserted in SIM808 slot

### Step 5: Final Check
- [ ] Double-check all connections
- [ ] Verify no short circuits
- [ ] All GND connections share common ground

---

## 💻 Software Setup Checklist

### Step 1: Get Device Information
Before coding, you need your SIM808 IMEI. Use this simple test code:

1. [ ] Upload basic test code to get IMEI (see below)
2. [ ] Open Serial Monitor (9600 baud)
3. [ ] Note down the 15-digit IMEI number

**Test Code to Get IMEI:**
```cpp
#include <SoftwareSerial.h>
SoftwareSerial sim808(7, 8);

void setup() {
  Serial.begin(9600);
  sim808.begin(9600);
  delay(5000);
  Serial.println("Getting IMEI...");
  sim808.println("AT+GSN");
  delay(2000);
  while(sim808.available()) {
    Serial.write(sim808.read());
  }
}

void loop() {}
```

### Step 2: Register Device in Database
- [ ] Run: `cd backend`
- [ ] Run: `python create_tracker_device.py`
- [ ] Follow prompts to enter device information
- [ ] Note down Device ID, IMEI, Phone number

### Step 3: Configure Arduino Code
Open the main tracker code and update:

- [ ] `const char* DEVICE_ID = "GPS001";` (your device ID)
- [ ] `const char* IMEI = "...";` (your IMEI from step 1)
- [ ] `const char* APN = "internet";` (check with Econet)
- [ ] `const char* SERVER_URL = "...";` (your server IP)
- [ ] `const int SERVER_PORT = 8000;` (your port)
- [ ] `const char* ALERT_PHONE = "+263...";` (your phone number)

### Step 4: Upload Code
- [ ] Connect Arduino to computer via USB
- [ ] Select: Tools → Board → Arduino Uno
- [ ] Select: Tools → Port → (your COM port)
- [ ] Click Upload
- [ ] Wait for "Done uploading"

---

## 🧪 Testing Checklist

### Test 1: Power On
- [ ] Power on Arduino (via USB or external)
- [ ] Power on SIM808 (external 5V 2A supply)
- [ ] Open Serial Monitor (9600 baud)
- [ ] See "GPS Livestock Tracker Starting"
- [ ] See "System Ready"

### Test 2: SIM808 Initialization
Watch Serial Monitor for:
- [ ] "Powering on SIM808..."
- [ ] "AT" commands responding with "OK"
- [ ] "SIM808 initialized successfully"
- [ ] No error messages

### Test 3: Network Connection
- [ ] See signal strength check (AT+CSQ)
- [ ] Signal should be > 10
- [ ] "Network registered" message
- [ ] "GPRS connected" message

### Test 4: GPS Fix (Be Patient!)
- [ ] Place GPS antenna near window or outdoors
- [ ] Wait 2-5 minutes for first GPS fix
- [ ] Serial Monitor shows "Waiting for GPS fix..."
- [ ] Then shows "GPS Fixed: Lat=..., Lon=..."
- [ ] Blue LED on SIM808 blinks

### Test 5: Server Communication
Make sure backend is running first:
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

Then check:
- [ ] Backend server is accessible
- [ ] Serial Monitor shows "Sending location to server"
- [ ] Serial Monitor shows "✓ Location sent successfully"
- [ ] Backend logs show incoming POST request
- [ ] No error messages

### Test 6: Web App Verification
- [ ] Open web app in browser
- [ ] Login with your credentials
- [ ] Navigate to Map page
- [ ] See your animal's location marker
- [ ] Location updates every 60 seconds

### Test 7: SMS Functionality
- [ ] Send SMS to tracker: "BUZZER_ON"
- [ ] Buzzer should sound
- [ ] Send SMS: "BUZZER_OFF"
- [ ] Buzzer should stop
- [ ] Disconnect tracker for 5+ minutes
- [ ] Should receive offline alert SMS

### Test 8: Geofence Testing
- [ ] Create geofence in web app (500m radius)
- [ ] Move tracker outside geofence (or simulate)
- [ ] Receive SMS alert
- [ ] See notification in web app
- [ ] Backend logs show geofence violation

---

## 🐛 Troubleshooting Quick Reference

| Problem | Quick Fix |
|---------|-----------|
| "GPS device not found" | Run `create_tracker_device.py` to register device |
| No GPS fix after 5+ min | Move antenna outdoors, check antenna connection |
| "No network" | Check SIM card, verify APN settings, check signal |
| Can't connect to server | Verify server IP, check firewall, test with ngrok |
| Buzzer not working | Check buzzer polarity, verify pin 9 connection |
| Random resets | SIM808 needs more power, use 2A+ power supply |
| SMS not sending | Check SIM credit, verify phone number format |
| High power drain | Normal during GPS fix and GSM transmission |

---

## 📱 Important AT Commands for Debugging

Type these in Serial Monitor (or modify code to test):

```
AT              - Test communication
AT+CSQ          - Check signal (want > 10)
AT+CPIN?        - Check SIM (want "READY")
AT+CREG?        - Network registration
AT+CGPSINF=0    - Get GPS info
AT+CBC          - Battery status
AT+GSN          - Get IMEI
```

---

## ✅ Deployment Checklist

Before taking tracker to field:

### Hardware
- [ ] All connections soldered (not just breadboard)
- [ ] Proper weatherproof enclosure
- [ ] GPS antenna has clear sky view
- [ ] GSM antenna properly mounted
- [ ] Adequate power supply or battery (10,000mAh+)
- [ ] Buzzer is audible from distance
- [ ] All cables secured with zip ties

### Software
- [ ] Code tested for at least 24 hours
- [ ] No memory leaks or crashes
- [ ] Location updates reliable
- [ ] SMS alerts working
- [ ] Server communication stable

### System
- [ ] Device registered in database
- [ ] Geofences configured
- [ ] Alert phone number correct
- [ ] Web app accessible from phone
- [ ] Backup plan for connectivity issues

---

## 🎯 Success Criteria

Your tracker is ready for deployment when:

✅ **GPS**: Gets fix within 5 minutes outdoors  
✅ **Location**: Updates server every 60 seconds  
✅ **Map**: Shows real-time location on web app  
✅ **Geofence**: Triggers alerts when violated  
✅ **SMS**: Sends offline alerts after 5 minutes  
✅ **Buzzer**: Activates on web app command  
✅ **Battery**: Lasts target duration (calculate based on your battery)  
✅ **Reliability**: Runs 24+ hours without issues  

---

## 📞 Need Help?

Check these in order:
1. Serial Monitor output (most issues show here)
2. Django backend logs
3. Browser console (F12 → Console)
4. ARDUINO_GPS_TRACKER_BUILD_GUIDE.md (full documentation)

---

**Good luck with your tracker! 🎉🐄📡**
