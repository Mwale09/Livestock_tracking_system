# Arduino Test Sketches

These are simplified test sketches to verify your hardware is working correctly BEFORE uploading the full GPS tracker code.

## 📁 Files

### 1. `01_SIM808_Basic_Test.ino`
**Purpose:** Test basic SIM808 module functionality

**What it tests:**
- AT command communication
- Get IMEI number (you need this!)
- SIM card detection
- Network registration
- Signal strength
- GPS power on
- Send test SMS

**When to use:** 
- First time setting up SIM808
- Troubleshooting connection issues
- Getting IMEI number for registration

**How to use:**
1. Upload sketch to Arduino
2. Open Serial Monitor (9600 baud)
3. Tests run automatically
4. **IMPORTANT:** Note down the IMEI number displayed
5. Use menu options to run individual tests
6. Verify all tests pass before proceeding

### 2. `02_GPS_Location_Test.ino`
**Purpose:** Continuously display GPS location data

**What it shows:**
- Latitude/Longitude
- Altitude
- Speed
- Heading
- Number of satellites
- GPS accuracy (HDOP)
- Google Maps link

**When to use:**
- After basic SIM808 test passes
- To verify GPS antenna placement
- To check GPS accuracy
- To test GPS fix time

**How to use:**
1. Upload sketch to Arduino
2. Open Serial Monitor (9600 baud)
3. Place GPS antenna near window or outdoors
4. Wait 2-5 minutes for first GPS fix
5. Watch location updates every 2 seconds

## 🔄 Testing Workflow

Follow this sequence:

```
1. Wire hardware
   ↓
2. Upload 01_SIM808_Basic_Test.ino
   ↓
3. Note down IMEI from test output
   ↓
4. Verify all basic tests pass
   ↓
5. Upload 02_GPS_Location_Test.ino
   ↓
6. Verify GPS gets fix and shows accurate location
   ↓
7. Register device in database (python create_tracker_device.py)
   ↓
8. Upload full GPS tracker code
   ↓
9. Deploy!
```

## ✅ Expected Results

### For Basic Test (01):
```
========================================
    SIM808 Basic Test
========================================

--- Starting Tests ---

[TEST 1] AT Communication
---------------------------
Sending: AT
Response: AT OK
✓ PASS: SIM808 is responding

[TEST 2] Get IMEI
---------------------------
Sending: AT+GSN
Response: 123456789012345
✓ IMEI: 123456789012345
  IMPORTANT: Note this down for your Arduino code!

[TEST 3] SIM Card Status
---------------------------
Sending: AT+CPIN?
Response: +CPIN: READY OK
✓ PASS: SIM card is ready

[TEST 4] Network Registration
---------------------------
Sending: AT+CREG?
Response: +CREG: 0,1 OK
✓ PASS: Registered on network

[TEST 5] Signal Strength
---------------------------
Sending: AT+CSQ
Response: +CSQ: 18,0 OK
Signal strength: 18 (Good)
✓ PASS: Good signal

[TEST 6] GPS Power
---------------------------
Sending: AT+CGNSPWR=1
Response: OK
✓ PASS: GPS powered on
  Note: GPS fix may take 2-5 minutes outdoors

========================================
    Test Complete!
========================================
```

### For GPS Location Test (02):
```
========================================
✓ GPS FIX ACQUIRED!
----------------------------------------
Latitude:  -17.850000
Longitude: 31.050000
Maps Link: https://maps.google.com/?q=-17.850000,31.050000
Altitude:  1500.50 meters
Speed:     0.00 km/h
Heading:   180.00 degrees
Satellites: 8
HDOP:      1.5 (Excellent)
DateTime:  2026-01-24 12:30:45 UTC
----------------------------------------
Chars Processed: 1250 | Failed checksums: 0
========================================
```

## 🐛 Troubleshooting

### SIM808 not responding (Test 1 fails)
- Check wiring: TX↔RX connections
- Verify power supply (needs 2A)
- Check baud rate (should be 9600)
- Try power cycling

### SIM card not ready (Test 3 fails)
- Check SIM card is properly inserted
- Disable PIN lock on SIM
- Try SIM in phone first to verify it works

### No network registration (Test 4 fails)
- Wait 30-60 seconds after power on
- Check SIM has service (test in phone)
- Verify GSM antenna is connected
- Check signal strength

### Poor signal (Test 5 shows <10)
- Move to better location
- Check GSM antenna connection
- Try outdoors
- Verify antenna is not damaged

### GPS not getting fix (Test 6, Location Test)
- GPS needs clear sky view
- First fix takes 2-5 minutes
- Move GPS antenna outdoors or near window
- Check GPS antenna is connected
- Blue LED on SIM808 should blink

## 💡 Tips

1. **Always run Test 1 first** - It catches 90% of hardware issues
2. **Save your IMEI** - You need it for device registration
3. **Test indoors first** - Verify SIM808 works before going outdoors
4. **Be patient with GPS** - First fix can take up to 5 minutes
5. **Check power supply** - SIM808 needs reliable 2A power
6. **Monitor signal strength** - Should be >10 for reliable operation

## 📝 Checklist Before Full Deploy

- [ ] Test 1: All basic tests pass
- [ ] Test 2: GPS gets fix within 5 minutes
- [ ] IMEI noted down
- [ ] Device registered in database
- [ ] Server URL and port configured
- [ ] Phone number for alerts configured
- [ ] Ready to upload full tracker code!

---

**Good luck with testing!** 🎉
