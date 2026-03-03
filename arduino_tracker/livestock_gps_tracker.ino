/*
 * ============================================================================
 * LIVESTOCK GPS TRACKER - Main Code
 * ============================================================================
 *
 * Hardware: Arduino Uno + SIM808 Module + Buzzer
 * Purpose: Real-time livestock tracking with geofence alerts
 *
 * Features:
 * - GPS location tracking and transmission to server
 * - SMS alerts when offline or geofence breach
 * - Remote buzzer activation from web app
 * - Battery level monitoring
 * - Automatic reconnection on network loss
 *
 * ============================================================================
 * CONFIGURATION - UPDATE THESE VALUES!
 * ============================================================================
 */

#include <SoftwareSerial.h>
// #include <TinyGPS++.h>  // REMOVED - using manual AT+CGNSINF parsing for
// reliability

// ======================== PIN CONFIGURATION ========================
#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4
#define BUZZER_PIN 9

// ======================== YOUR SETTINGS - CHANGE THESE!
// ========================
const char *DEVICE_ID = "GPS001";     // From database registration
const char *IMEI = "865067025786099"; // Get from basic test (AT+GSN)
const char *APN = "econet.net";       // Econet APN (confirm with carrier)
const char *SERVER_URL = "https://livestock-tracking-system.onrender.com/api/"
                         "tracking/update_location/"; // Your Django server IP
const int SERVER_PORT = 443;                          // Django server port
const char *ALERT_PHONE = "+263714265736"; // Farmer's phone for SMS alerts

// ======================== TIMING CONFIGURATION ========================
const unsigned long GPS_UPDATE_INTERVAL =
    60000;                                // Send location every 60 seconds
const unsigned long GPS_TIMEOUT = 120000; // GPS fix timeout (2 minutes)
const unsigned long COMMAND_CHECK_INTERVAL =
    30000; // Check for commands every 30 seconds
const unsigned long OFFLINE_SMS_INTERVAL =
    300000;                                  // Send offline SMS after 5 minutes
const unsigned long BUZZER_DURATION = 10000; // Buzzer sounds for 10 seconds

// ======================== OBJECTS ========================
SoftwareSerial sim808(SIM808_TX, SIM808_RX);
// TinyGPSPlus gps; // REMOVED

// ======================== GLOBAL VARIABLES ========================
unsigned long lastGPSUpdate = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastOnlineTime = 0;
unsigned long buzzerStartTime = 0;
bool isOnline = false;
bool buzzerActive = false;
bool systemInitialized = false;
int batteryLevel = 100;

// GPS Data Variables
float currentLat = 0.0;
float currentLng = 0.0;
float currentAlt = 0.0;
float currentSpeed = 0.0;
int currentSats = 0;
bool gpsValid = false;

// Shared buffers to avoid heap fragmentation and stack overflow
char responseBuffer[151]; // Reduced from 201 to save RAM
char payloadBuffer[251];  // Reduced from 300 to save RAM

// ======================== SETUP ========================
void setup() {
  // Initialize serial communications
  Serial.begin(9600);
  sim808.begin(9600);

  // Configure pins
  pinMode(SIM808_PWR, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Welcome message
  printWelcome();

  // Power on SIM808
  powerOnSIM808();
  // Give SIM808 and SIM card time to settle (longer = more reliable, especially
  // evening/poor signal)
  delay(8000);

  // Initialize SIM808 module
  if (initializeSIM808()) {
    systemInitialized = true;
    Serial.println(F("\n✓ System initialization complete!"));
    playSuccessBeep();
    Serial.println(F("===========================================\n"));
  } else {
    Serial.println(F("\n✗ System initialization failed!"));
    Serial.println(F("Check hardware and try again."));
    Serial.println(F("===========================================\n"));
  }
}

// ======================== MAIN LOOP ========================
void loop() {
  if (!systemInitialized) {
    // If initialization failed, try again every 30 seconds
    delay(30000);
    Serial.println(F("Retrying initialization..."));
    if (initializeSIM808()) {
      systemInitialized = true;
    }
    return;
  }

  // Read GPS data continuously (No longer needed for TinyGPS++)
  /*
  while (sim808.available() > 0) {
    char c = sim808.read();
    gps.encode(c);
  }
  */

  // Update GPS location at intervals
  if (millis() - lastGPSUpdate >= GPS_UPDATE_INTERVAL) {
    lastGPSUpdate = millis();

    Serial.println(F("\n--- GPS Update Cycle ---"));
    if (getGPSLocation()) {
      Serial.println(F("   ✓ Location updated"));
      printGPSInfo();
      sendLocationToServer();
    } else {
      Serial.println(F("   ⏳ Waiting for GPS fix (No valid coordinates yet)"));
    }
  }

  // Check for server commands (buzzer activation)
  if (millis() - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = millis();
    checkForCommands();
  }

  // Check if we've been offline too long
  if (!isOnline && (millis() - lastOnlineTime >= OFFLINE_SMS_INTERVAL)) {
    Serial.println(F("\n⚠ Device offline too long - sending SMS alert"));
    sendOfflineSMS();
    lastOnlineTime = millis(); // Reset timer to avoid spam
  }

  // Update battery level periodically
  static unsigned long lastBatteryCheck = 0;
  if (millis() - lastBatteryCheck >= 300000) { // Every 5 minutes
    lastBatteryCheck = millis();
    batteryLevel = getBatteryLevel();
  }

  // Handle buzzer
  handleBuzzer();

  // Small delay to prevent overwhelming the processor
  delay(100);
}

// ======================== INITIALIZATION FUNCTIONS ========================

void printWelcome() {
  Serial.println(F("\n\n==========================================="));
  Serial.println(F("   LIVESTOCK GPS TRACKER"));
  Serial.print(F("   RAM: "));
  Serial.print(freeMemory());
  Serial.println(F(" bytes free"));
  Serial.println(F("==========================================="));
  Serial.println(F("\nConfiguration:"));
  Serial.print(F("  Device ID: "));
  Serial.println(DEVICE_ID);
  Serial.print(F("  IMEI: "));
  Serial.println(IMEI);
  Serial.print(F("  Server: "));
  Serial.print(SERVER_URL);
  Serial.print(F(":"));
  Serial.println(SERVER_PORT);
  Serial.print(F("  Alert Phone: "));
  Serial.println(ALERT_PHONE);
  Serial.println(F("\n==========================================="));
  Serial.println(F("Serial Monitor: 9600 baud"));
  Serial.println(F("Starting system initialization..."));
  Serial.println(F("===========================================\n"));
}

void powerOnSIM808() {
  Serial.println(F("1. Powering on SIM808 module..."));
  digitalWrite(SIM808_PWR, HIGH);
  delay(2000);
  digitalWrite(SIM808_PWR, LOW);
  delay(3000);
  Serial.println(F("   ✓ Power sequence complete"));
}

// Power on GPS; accepts OK or "already on" so init does not fail when GPS is
// on.
bool powerOnGPS() {
  const int GPS_PWR_ATTEMPTS = 3;
  const unsigned long GPS_PWR_TIMEOUT = 4000;

  for (int i = 0; i < GPS_PWR_ATTEMPTS; i++) {
    flushSIM808Buffer();
    delay(200);
    sendATCommandGetResponse("AT+CGNSPWR=1", GPS_PWR_TIMEOUT);
    if (strstr(responseBuffer, "OK")) {
      return true;
    }
    // Some modules don't return OK when GPS is already on; no ERROR = assume OK
    if (!strstr(responseBuffer, "ERROR") && strlen(responseBuffer) > 0) {
      return true;
    }
    delay(1500);
  }
  return false;
}

bool initializeSIM808() {
  Serial.println(F("\n2. Initializing SIM808..."));

  // FORCE GPS OFF to stop NMEA flooding IMMEDIATELY!
  // This is the most common cause of hangs during startup.
  sendATCommand("AT+CGNSPWR=0", "OK", 2000);
  flushSIM808Buffer();
  delay(500);

  // Test AT communication
  Serial.print(F("   Testing AT communication... "));
  if (!sendATCommand("AT", "OK", 2000)) {
    Serial.println(F("✗ Failed"));
    return false;
  }
  Serial.println(F("✓"));

  // Disable echo
  Serial.print(F("   Disabling echo... "));
  sendATCommand("ATE0", "OK", 2000);
  Serial.println(F("✓"));
  delay(400);

  // Check signal strength
  Serial.print(F("   Checking signal strength... "));
  sendATCommandGetResponse("AT+CSQ", 2000);
  char *csqPtr = strstr(responseBuffer, "+CSQ: ");
  if (csqPtr) {
    int signalValue = atoi(csqPtr + 6);
    Serial.print(signalValue);
    if (signalValue >= 10) {
      Serial.println(F(" ✓"));
    } else {
      Serial.println(F(" ⚠ Weak"));
    }
  } else {
    Serial.println(F("?"));
  }

  // Drain any leftover bytes from AT+CSQ so next command gets clean response
  flushSIM808Buffer();
  delay(800);

  // Check SIM card - use same get-response-then-check logic as diagnostic
  // (sendATCommand was sometimes missing READY; getResponse + indexOf is
  // reliable)
  Serial.print(F("   Checking SIM card... "));
  bool simReady = false;
  for (int i = 0; i < 8; i++) {
    flushSIM808Buffer();
    delay(200); // Short pause after flush so module is ready
    sendATCommandGetResponse("AT+CPIN?", 10000);
    if (strstr(responseBuffer, "READY")) {
      simReady = true;
      break;
    }
    delay(2000); // Wait before retry when SIM is slow
    Serial.print(F("."));
  }

  if (!simReady) {
    Serial.println(F("✗ Failed - Check SIM card"));
    flushSIM808Buffer();
    delay(200);
    Serial.print(F("   Last response: "));
    sendATCommandGetResponse("AT+CPIN?", 5000);
    Serial.println(responseBuffer);
    return false;
  }
  Serial.println(F("✓"));

  // Drain buffer before network check
  flushSIM808Buffer();
  delay(2000); // Let network state settle (basic test has 1s between steps)

  // Network registration - can take longer in evening / congested network
  Serial.print(F("   Registering on network... "));
  bool registered = false;
  const int CREG_ATTEMPTS = 25; // ~60+ seconds total
  const unsigned long CREG_TIMEOUT = 3000;

  for (int i = 0; i < CREG_ATTEMPTS; i++) {
    flushSIM808Buffer();
    sendATCommandGetResponse("AT+CREG?", CREG_TIMEOUT);

    if (strstr(responseBuffer, "+CREG: 0,1") ||
        strstr(responseBuffer, "+CREG: 0,5")) {
      registered = true;
      Serial.println(F("✓"));
      delay(500);
      break;
    }
    if (strstr(responseBuffer, "+CREG: 0,2")) {
      Serial.print(F("s")); // searching
    } else {
      Serial.print(F("."));
    }
    delay(3000); // 3 seconds between attempts (network can be slow)
  }

  if (!registered) {
    Serial.println(F("✗ Failed - No network"));
    Serial.print(F("   Last response: "));
    sendATCommandGetResponse("AT+CREG?", 3000);
    Serial.println(responseBuffer);
    return false;
  }

  // Configure GPRS first (before GPS is on - so serial is quiet and APN gets a
  // response)
  Serial.println(F("\n3. Configuring GPRS..."));
  if (!setupGPRS()) {
    Serial.println(F("   ✗ GPRS setup failed"));
    return false;
  }
  Serial.println(F("   ✓ GPRS configured"));

  flushSIM808Buffer();
  delay(500);

  // Power on GPS after GPRS (so NMEA doesn't flood the line during SAPBR
  // commands)
  Serial.print(F("   Powering on GPS... "));
  if (!powerOnGPS()) {
    Serial.println(F("✗ Failed"));
    return false;
  }
  Serial.println(F("✓"));

  return true;
}

bool setupGPRS() {
  flushSIM808Buffer();
  delay(300);

  // Close any existing bearer (reset state)
  sendATCommand("AT+SAPBR=0,1", "OK", 2000);
  delay(500);

  // Ensure GPRS is attached
  sendATCommand("AT+CGATT=1", "OK", 3000);
  delay(500);

  // Set connection type to GPRS (retry in case buffer had GPS data)
  Serial.print(F("   Bearer type... "));
  for (int i = 0; i < 3; i++) {
    if (sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", "OK", 3000)) {
      Serial.println(F("✓"));
      break;
    }
    if (i == 2)
      return false;
    flushSIM808Buffer();
    delay(500);
  }

  flushSIM808Buffer();
  delay(600);

  // Set APN
  Serial.print(F("   APN... "));
  bool apnOk = false;
  for (int i = 0; i < 3; i++) {
    flushSIM808Buffer();
    delay(200);

    sim808.print(F("AT+SAPBR=3,1,\"APN\",\""));
    sim808.print(APN);
    sim808.println(F("\""));

    unsigned long startTime = millis();
    memset(responseBuffer, 0, sizeof(responseBuffer));
    int idx = 0;
    while (millis() - startTime < 6000) {
      while (sim808.available()) {
        char c = (char)sim808.read();
        if (idx < sizeof(responseBuffer) - 1) {
          responseBuffer[idx++] = c;
          responseBuffer[idx] = '\0';
        }
      }
      if (strstr(responseBuffer, "OK")) {
        apnOk = true;
        break;
      }
      if (strstr(responseBuffer, "ERROR")) {
        break;
      }
      delay(20);
    }

    if (apnOk) {
      Serial.println(F("✓"));
      break;
    }
    if (i == 2) {
      Serial.println(F("✗"));
      Serial.print(F("   Last APN response: "));
      Serial.println(responseBuffer);
      return false;
    }
    delay(500);
  }
  if (!apnOk)
    return false;

  // Open bearer
  Serial.print(F("   Opening bearer... "));
  sendATCommand("AT+SAPBR=1,1", "OK", 15000);
  delay(2000);
  Serial.println(F("✓"));

  sendATCommand("AT+SAPBR=2,1", "OK", 2000);

  return true;
}

// ======================== GPS FUNCTIONS ========================

void printGPSInfo() {
  if (!gpsValid) {
    Serial.println(F("   No valid GPS data available."));
    return;
  }

  Serial.println(F("\n📍 Current Location:"));
  Serial.print(F("   Lat: "));
  Serial.println(currentLat, 6);
  Serial.print(F("   Lon: "));
  Serial.println(currentLng, 6);

  Serial.print(F("   Alt: "));
  Serial.print(currentAlt);
  Serial.println(F(" m"));

  Serial.print(F("   Speed: "));
  Serial.print(currentSpeed);
  Serial.println(F(" km/h"));

  Serial.print(F("   Satellites: "));
  Serial.println(currentSats);

  Serial.print(F("   Status: "));
  Serial.println(F("FIXED"));
}

bool getGPSLocation() {
  flushSIM808Buffer();
  sendATCommandGetResponse("AT+CGNSINF", 2000);

  // Response format: +CGNSINF: <GNSS run status>,<Fix status>,<UTC date &
  // time>,<Latitude>,<Longitude>,<MSL Altitude>,<Speed Over Ground>,<Course
  // Over Ground>,<Fix Mode>,<Reserved1>,<HDOP>,<PDOP>,<VDOP>,<Reserved2>,<GNSS
  // Satellites Used>,<GNSS Satellites Viewed>,<Glonass Satellites
  // Used>,<Reserved3>,<C/N0 max>,<HPA>,<VPA> Example: +CGNSINF:
  // 1,1,20231026102534.000, -1.234567, 31.123456, 1200.5, 0.00, , 1,
  // , 1.0, 1.3, 0.9, , 8, 11, , , 42, ,

  char *ptr = strstr(responseBuffer, "+CGNSINF: ");
  if (!ptr)
    return false;

  ptr += 10; // Skip "+CGNSINF: "

  // 1. GNSS run status
  int runStatus = atoi(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr)
    return false;
  ptr++;

  // 2. Fix status
  int fixStatus = atoi(ptr);
  if (fixStatus == 0) {
    gpsValid = false;
    Serial.print(F("   (Module Raw: "));
    Serial.print(responseBuffer);
    Serial.println(F(")"));
    return false;
  }

  ptr = strchr(ptr, ','); // Skip Fix status
  if (!ptr)
    return false;
  ptr++;

  ptr = strchr(ptr, ','); // Skip UTC date & time
  if (!ptr)
    return false;
  ptr++;

  // 4. Latitude
  currentLat = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr)
    return false;
  ptr++;

  // 5. Longitude
  currentLng = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr)
    return false;
  ptr++;

  // 6. Altitude
  currentAlt = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr)
    return false;
  ptr++;

  // 7. Speed
  currentSpeed = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr)
    return false;
  ptr++;

  // Skip Course, Fix Mode, etc. until Satellites Used
  for (int i = 0; i < 7; i++) {
    ptr = strchr(ptr, ',');
    if (!ptr)
      break;
    ptr++;
  }

  if (ptr) {
    currentSats = atoi(ptr);
  }

  gpsValid = (currentLat != 0.0 && currentLng != 0.0);
  return gpsValid;
}

void sendLocationToServer() {
  if (!gpsValid)
    return;

  Serial.println(F("\n📡 Sending location to server..."));

  // Create JSON payload manually into payloadBuffer
  char latStr[12], lngStr[12], altStr[10], speedStr[10];
  dtostrf(currentLat, 0, 6, latStr);
  dtostrf(currentLng, 0, 6, lngStr);
  dtostrf(currentAlt, 0, 2, altStr);
  dtostrf(currentSpeed, 0, 2, speedStr);

  snprintf(payloadBuffer, sizeof(payloadBuffer),
           "{\"device_id\":\"%s\",\"latitude\":%s,\"longitude\":%s,\"status\":"
           "\"OK\",\"battery_level\":%d,\"altitude\":%s,\"speed\":%s,"
           "\"satellites\":%d}",
           DEVICE_ID, latStr, lngStr, batteryLevel, altStr, speedStr,
           currentSats);

  Serial.print(F("   JSON: "));
  Serial.println(payloadBuffer);

  // Send HTTP POST request
  bool success = sendHTTPPost(payloadBuffer);

  if (success) {
    Serial.println(F("   ✓ Location sent successfully!"));
    isOnline = true;
    lastOnlineTime = millis();
  } else {
    Serial.println(F("   ✗ Failed to send location"));
    isOnline = false;
  }
}

bool sendHTTPPost(const char *payload) {
  // Initialize HTTP
  sendATCommand("AT+HTTPTERM", "OK", 1000); // Terminate any previous session
  delay(500);
  sendATCommand("AT+HTTPINIT", "OK", 2000);

  // Set HTTP parameters
  sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 2000);

  // Set URL
  sim808.print(F("AT+HTTPPARA=\"URL\",\""));
  sim808.print(SERVER_URL);
  sim808.println(F("\""));
  sendATCommandGetResponse("", 2000); // Read response into buffer

  // Set content type
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 2000);

  // Enable SSL and Redirects for Render HTTPS
  sendATCommand("AT+HTTPPARA=\"REDIR\",1", "OK", 2000);
  sendATCommand("AT+HTTPPARA=\"SSL\",1", "OK", 2000);

  // Set data length
  sim808.print(F("AT+HTTPDATA="));
  sim808.print(strlen(payload));
  sim808.println(F(",10000"));
  delay(2000);

  // Send data
  sim808.println(payload);
  delay(3000);

  // Execute POST request
  sim808.println("AT+HTTPACTION=1"); // 1 = POST
  delay(5000);

  // Read response
  bool success = false;
  unsigned long timeout = millis();
  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;

  while (millis() - timeout < 30000) { // Increased timeout to 30s for Render
    if (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }

    // Check for success codes
    if (strstr(responseBuffer, "+HTTPACTION: 1,200") ||
        strstr(responseBuffer, "+HTTPACTION: 1,201")) {
      success = true;

      // Check for geofence violation in response
      if (strstr(responseBuffer, "geofence") ||
          strstr(responseBuffer, "breach")) {
        Serial.println(F("   ⚠ Geofence breach detected!"));
        sendGeofenceSMS("Geofence");
      }
      break;
    }

    // Check for error codes
    if (strstr(responseBuffer, "+HTTPACTION: 1,4")) {
      Serial.println(F("   ✗ Server error"));
      break;
    }
  }

  // Terminate HTTP
  sendATCommand("AT+HTTPTERM", "OK", 2000);

  return success;
}

// ======================== SMS FUNCTIONS ========================

void sendOfflineSMS() {
  Serial.println(F("📱 Sending offline SMS alert..."));

  snprintf(payloadBuffer, sizeof(payloadBuffer),
           "ALERT: Tracker %s is OFFLINE since %lu minutes.", DEVICE_ID,
           millis() / 60000);

  if (gpsValid) {
    char latStr[12], lngStr[12];
    dtostrf(currentLat, 0, 6, latStr);
    dtostrf(currentLng, 0, 6, lngStr);

    strncat(payloadBuffer, " Map: https://maps.google.com/?q=",
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, latStr,
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, ",",
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, lngStr,
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
  }

  bool success = sendSMS(ALERT_PHONE, payloadBuffer);

  if (success) {
    Serial.println(F("   ✓ SMS sent successfully"));
  } else {
    Serial.println(F("   ✗ SMS failed"));
  }
}

void sendGeofenceSMS(const char *geofenceName) {
  Serial.println(F("📱 Sending geofence breach SMS..."));

  snprintf(payloadBuffer, sizeof(payloadBuffer),
           "ALERT: Animal left geofence '%s'.", geofenceName);

  if (gpsValid) {
    char latStr[12], lngStr[12];
    dtostrf(currentLat, 0, 6, latStr);
    dtostrf(currentLng, 0, 6, lngStr);

    strncat(payloadBuffer, " Map: https://maps.google.com/?q=",
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, latStr,
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, ",",
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
    strncat(payloadBuffer, lngStr,
            sizeof(payloadBuffer) - strlen(payloadBuffer) - 1);
  }

  sendSMS(ALERT_PHONE, payloadBuffer);
}

bool sendSMS(const char *phoneNumber, const char *message) {
  Serial.print(F("   Sending SMS to "));
  Serial.println(phoneNumber);

  // Set SMS text mode
  if (!sendATCommand("AT+CMGF=1", "OK", 2000)) {
    Serial.println(F("   ✗ Failed to set Text Mode"));
    return false;
  }

  // Set Character Set to GSM
  sendATCommand("AT+CSCS=\"GSM\"", "OK", 1000);

  // Start SMS command
  sim808.print("AT+CMGS=\"");
  sim808.print(phoneNumber);
  sim808.println("\"");

  // Wait for prompt '>'
  unsigned long promptTimeout = millis();
  bool promptReceived = false;
  while (millis() - promptTimeout < 5000) {
    if (sim808.available()) {
      char c = sim808.read();
      if (c == '>') {
        promptReceived = true;
        break;
      }
    }
  }

  if (!promptReceived) {
    Serial.println(F("   ✗ Failed (No '>' prompt received)"));
    // Try to escape
    sim808.write(27); // ESC
    return false;
  }

  // Send message
  sim808.print(message);
  delay(100);

  // Send Ctrl+Z to send SMS
  sim808.write(26);

  // Wait for confirmation
  unsigned long timeout = millis();
  bool success = false;
  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;

  while (millis() - timeout < 20000) { // Increased timeout to 20s
    if (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }

    if (strstr(responseBuffer, "+CMGS")) {
      success = true;
      break;
    }

    if (strstr(responseBuffer, "ERROR")) {
      Serial.print(F("   ✗ Error Response: "));
      Serial.println(responseBuffer);
      break;
    }
  }

  if (success) {
    Serial.println(F("   ✓ SMS Sent Successfully"));
  } else {
    Serial.println(F("   ✗ SMS Send Failed (Timeout or Error)"));
  }

  return success;
}

// ======================== COMMAND CHECKING ========================

void checkForCommands() {
  // Check for SMS commands
  sim808.println("AT+CMGL=\"ALL\"");
  delay(2000);

  // Read response
  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long timeout = millis();

  while (millis() - timeout < 5000) {
    if (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
  }

  // Parse SMS for commands
  if (strstr(responseBuffer, "BUZZER_ON") ||
      strstr(responseBuffer, "ALARM_ON")) {
    buzzerActive = true;
    buzzerStartTime = millis();
    Serial.println(F("🔔 Buzzer activated via SMS"));
  }

  if (strstr(responseBuffer, "BUZZER_OFF") ||
      strstr(responseBuffer, "ALARM_OFF")) {
    buzzerActive = false;
    Serial.println(F("🔕 Buzzer deactivated via SMS"));
  }

  // Delete all read messages to free memory
  if (strlen(responseBuffer) > 10) {
    sendATCommand("AT+CMGD=1,4", "OK", 2000);
  }
}

// ======================== BUZZER CONTROL ========================

// Short beep when init succeeds (confirms buzzer works; also use SMS
// "BUZZER_ON" to test)
void playSuccessBeep() {
  tone(BUZZER_PIN, 2000, 150);
  delay(200);
  tone(BUZZER_PIN, 2000, 150);
  delay(100);
  noTone(BUZZER_PIN);
}

void handleBuzzer() {
  if (buzzerActive) {
    // Auto-turn off after duration
    if (millis() - buzzerStartTime >= BUZZER_DURATION) {
      buzzerActive = false;
      Serial.println(F("🔕 Buzzer auto-off"));
    }

    // Sound pattern: beep-beep-pause
    unsigned long pattern = millis() % 3000;
    if (pattern < 500 || (pattern >= 1000 && pattern < 1500)) {
      tone(BUZZER_PIN, 2000); // 2kHz tone
    } else {
      noTone(BUZZER_PIN);
    }
  } else {
    noTone(BUZZER_PIN);
  }
}

// ======================== UTILITY FUNCTIONS ========================

int getBatteryLevel() {
  sim808.println("AT+CBC");
  delay(1000);

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long timeout = millis();

  while (millis() - timeout < 2000) {
    if (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
  }

  // Parse battery level from response: +CBC: 0,70,4.2V
  char *cbcPtr = strstr(responseBuffer, "+CBC:");
  if (cbcPtr) {
    char *firstComma = strchr(cbcPtr, ',');
    if (firstComma) {
      char *secondComma = strchr(firstComma + 1, ',');
      if (secondComma) {
        int level = atoi(firstComma + 1);
        if (level > 0 && level <= 100) {
          return level;
        }
      }
    }
  }

  return batteryLevel; // Return last known value if parse fails
}

// Flush SIM808 serial buffer so next command gets a clean response (avoids
// leftover bytes from previous command - fixes "card not registered" when
// basic test works but main tracker doesn't).
void flushSIM808Buffer() {
  unsigned long start = millis();
  while (millis() - start < 600) { // Increased to 600ms for stability
    while (sim808.available()) {
      sim808.read();
    }
    delay(20);
  }
}

bool sendATCommand(const char *command, const char *expectedResponse,
                   unsigned long timeout) {
  sim808.println(command);

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
    if (strstr(responseBuffer, expectedResponse)) {
      // Drain remainder so next command gets clean buffer
      unsigned long drainStart = millis();
      while (millis() - drainStart < 200) {
        if (sim808.available())
          sim808.read();
      }
      return true;
    }
    // Show heartbeat dots during long waits
    if (timeout > 5000 && (millis() - startTime) % 2000 < 50) {
      Serial.print(F("."));
    }
    delay(10);
  }

  return false;
}

void sendATCommandGetResponse(const char *command, unsigned long timeout) {
  sim808.println(command);

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      char c = (char)sim808.read();
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
    // Let SoftwareSerial buffer fill
    delay(20);
  }
}

// Helper to check available RAM on Arduino Uno
int freeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}
