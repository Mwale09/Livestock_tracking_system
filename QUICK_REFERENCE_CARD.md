# 📋 GPS Tracker Quick Reference Card

**Print this and keep it with you while building!**

---

## 🔌 Pin Connections

```
Arduino Pin 4  →  SIM808 PWR_KEY
Arduino Pin 7  →  SIM808 TX
Arduino Pin 8  →  SIM808 RX
Arduino Pin 9  →  [220Ω] → Buzzer (+)
Arduino GND    →  Common Ground
```

```
⚡ SUPER SIMPLE LAPTOP POWER (Try This First!):
Laptop USB Port 1  →  Arduino USB port
Laptop USB Port 2  →  SIM808 USB port
Arduino GND pin    →  SIM808 GND pin (CRITICAL!)

⚠️ May reset during transmission (not enough power)
   Safe to test! Upgrade to wall charger if needed.
```

---

## 📱 Important Configuration Values

```cpp
const char* DEVICE_ID = "GPS001";          // Your device ID
const char* IMEI = "123456789012345";      // From AT+GSN
const char* APN = "internet";              // Econet APN
const char* SERVER_URL = "192.168.1.100";  // Your server IP
const int SERVER_PORT = 8000;
const char* ALERT_PHONE = "+263771234567"; // Your phone
```

---

## 🚀 Quick Start Steps

1. **Wire Hardware** (see connections above)
2. **Upload Test Sketch** → `01_SIM808_Basic_Test.ino`
3. **Note IMEI** from serial output
4. **Register Device** → `python create_tracker_device.py`
5. **Update Arduino Code** with your values
6. **Upload Main Code** → `livestock_gps_tracker.ino`
7. **Test & Deploy**

---

## 🧪 Testing Commands

### Via Serial Monitor (9600 baud):
```
AT              - Test communication
AT+CSQ          - Signal strength (want >10)
AT+CPIN?        - Check SIM (want "READY")
AT+GSN          - Get IMEI
AT+CGNSINF      - GPS info
```

### Via SMS to Tracker:
```
BUZZER_ON       - Activate alarm
BUZZER_OFF      - Deactivate alarm
```

---

## 📍 Server Endpoint

**POST** to: `http://YOUR_SERVER:8000/api/tracking/update_location/`

**JSON Format:**
```json
{
  "device_id": "GPS001",
  "latitude": -17.850000,
  "longitude": 31.050000,
  "status": "OK",
  "battery_level": 85
}
```

---

## ⚠️ Critical Reminders

- 💻 **Both from laptop USB** - Arduino + SIM808 (easiest!)
- 🔌 **MUST connect GND pins** - Arduino GND to SIM808 GND (critical!)
- ⚠️ **May reset during transmission** - Normal with laptop power, safe to test
- 📡 **Connect antennas** before powering on
- 🔓 **Disable SIM PIN** lock
- 🌍 **GPS needs sky view** - wait 2-5 min for first fix

---

## 🐛 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| No AT response | Check TX/RX wiring, baud rate |
| GPS no fix | Move outdoors, wait 5 min |
| No network | Check SIM, antenna, signal |
| Random resets | Normal with laptop power - upgrade to wall charger |
| Device not found | Run `create_tracker_device.py` |

---

## 📞 Key Phone Numbers & URLs

- **Tracker SIM:** ________________
- **Alert Phone:** ________________  
- **Server URL:** ________________
- **Server Port:** ________________

---

## ✅ Pre-Power-On Checklist

- [ ] All wiring secure
- [ ] Antennas connected
- [ ] SIM card inserted (PIN disabled)
- [ ] 2A power supply ready
- [ ] Code uploaded
- [ ] Serial Monitor open (9600)

---

## 🎯 Success Indicators

✅ SIM808 status LED on  
✅ GPS LED blinking  
✅ Serial shows "System Ready"  
✅ Signal strength > 10  
✅ GPS fix within 5 minutes  
✅ Location appears on map  

---

## 📊 Expected Serial Output

```
===========================================
   LIVESTOCK GPS TRACKER
   Version 1.0
===========================================
Configuration:
  Device ID: GPS001
  IMEI: 123456789012345
  Server: 192.168.1.100:8000
===========================================

1. Powering on SIM808 module...
   ✓ Power sequence complete

2. Initializing SIM808...
   Testing AT communication... ✓
   Checking signal strength... 18 ✓
   Checking SIM card... ✓
   Registering on network... ✓
   Powering on GPS... ✓

3. Configuring GPRS...
   ✓ GPRS configured

✓ System initialization complete!
===========================================

⏳ Waiting for GPS fix... Satellites: 5
⏳ Waiting for GPS fix... Satellites: 7

--- Location Update Cycle ---

📍 Current Location:
   Lat: -17.850000
   Lon: 31.050000
   Alt: 1500.50 m
   Satellites: 8
   Accuracy: Good

📡 Sending location to server...
   JSON: {"device_id":"GPS001","latitude":-17.850000,...}
   ✓ Location sent successfully!
```

---

## 🔋 Battery Life Estimates

With 10,000mAh battery:
- **Continuous:** ~4 hours
- **With sleep mode:** ~40 hours  
- **With solar panel:** Indefinite

---

## 📁 Important Files

1. `ARDUINO_GPS_TRACKER_BUILD_GUIDE.md` - Full guide
2. `QUICK_START_CHECKLIST.md` - Step-by-step
3. `HARDWARE_WIRING_DIAGRAM.txt` - Visual wiring
4. `arduino_test_sketches/` - Test code
5. `arduino_tracker/livestock_gps_tracker.ino` - Main code
6. `backend/create_tracker_device.py` - Registration

---

## 🆘 Emergency Contacts

- **Project Supervisor:** ________________
- **IT Support:** ________________
- **Hardware Supplier:** ________________

---

## 📝 Notes Space

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

**Version:** 1.0 | **Date:** Jan 24, 2026 | **Project:** Livestock Tracking System
