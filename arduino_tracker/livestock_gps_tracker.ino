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
#include <TinyGPS++.h>
#include <ArduinoJson.h>

// ======================== PIN CONFIGURATION ========================
#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4
#define BUZZER_PIN 9

// ======================== YOUR SETTINGS - CHANGE THESE! ========================
const char* DEVICE_ID = "GPS001";                      // From database registration
const char* IMEI = "123456789012345";                  // Get from basic test (AT+GSN)
const char* APN = "internet";                          // Econet APN (confirm with carrier)
const char* SERVER_URL = "192.168.1.100";              // Your Django server IP
const int SERVER_PORT = 8000;                          // Django server port
const char* ALERT_PHONE = "+263771234567";             // Farmer's phone for SMS alerts

// ======================== TIMING CONFIGURATION ========================
const unsigned long GPS_UPDATE_INTERVAL = 60000;       // Send location every 60 seconds
const unsigned long GPS_TIMEOUT = 120000;              // GPS fix timeout (2 minutes)
const unsigned long COMMAND_CHECK_INTERVAL = 30000;    // Check for commands every 30 seconds
const unsigned long OFFLINE_SMS_INTERVAL = 300000;     // Send offline SMS after 5 minutes
const unsigned long BUZZER_DURATION = 10000;           // Buzzer sounds for 10 seconds

// ======================== OBJECTS ========================
SoftwareSerial sim808(SIM808_TX, SIM808_RX);
TinyGPSPlus gps;

// ======================== GLOBAL VARIABLES ========================
unsigned long lastGPSUpdate = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastOnlineTime = 0;
unsigned long buzzerStartTime = 0;
bool isOnline = false;
bool gpsFixed = false;
int batteryLevel = 100;
bool buzzerActive = false;
bool systemInitialized = false;

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
  delay(5000);
  
  // Initialize SIM808 module
  if (initializeSIM808()) {
    systemInitialized = true;
    Serial.println(F("\n✓ System initialization complete!"));
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
  
  // Read GPS data continuously
  while (sim808.available() > 0) {
    char c = sim808.read();
    gps.encode(c);
  }
  
  // Update GPS location at intervals
  if (millis() - lastGPSUpdate >= GPS_UPDATE_INTERVAL) {
    lastGPSUpdate = millis();
    
    if (gps.location.isValid()) {
      gpsFixed = true;
      Serial.println(F("\n--- Location Update Cycle ---"));
      printGPSInfo();
      sendLocationToServer();
    } else {
      Serial.print(F("⏳ Waiting for GPS fix... "));
      if (gps.satellites.isValid()) {
        Serial.print(F("Satellites: "));
        Serial.println(gps.satellites.value());
      } else {
        Serial.println(F("Searching for satellites..."));
      }
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
  Serial.println(F("   Version 1.0"));
  Serial.println(F("==========================================="));
  Serial.println(F("\nConfiguration:"));
  Serial.print(F("  Device ID: ")); Serial.println(DEVICE_ID);
  Serial.print(F("  IMEI: ")); Serial.println(IMEI);
  Serial.print(F("  Server: ")); Serial.print(SERVER_URL); 
  Serial.print(F(":")); Serial.println(SERVER_PORT);
  Serial.print(F("  Alert Phone: ")); Serial.println(ALERT_PHONE);
  Serial.println(F("\n==========================================="));
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

bool initializeSIM808() {
  Serial.println(F("\n2. Initializing SIM808..."));
  
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
  
  // Check signal strength
  Serial.print(F("   Checking signal strength... "));
  String csq = sendATCommandGetResponse("AT+CSQ", 2000);
  int signalStart = csq.indexOf("+CSQ: ") + 6;
  int signalEnd = csq.indexOf(",", signalStart);
  if (signalStart > 5 && signalEnd > signalStart) {
    int signal = csq.substring(signalStart, signalEnd).toInt();
    Serial.print(signal);
    if (signal >= 10) {
      Serial.println(F(" ✓"));
    } else {
      Serial.println(F(" ⚠ Weak"));
    }
  } else {
    Serial.println(F("?"));
  }
  
  // Check SIM card
  Serial.print(F("   Checking SIM card... "));
  if (!sendATCommand("AT+CPIN?", "READY", 5000)) {
    Serial.println(F("✗ Failed - Check SIM card"));
    return false;
  }
  Serial.println(F("✓"));
  
  // Network registration
  Serial.print(F("   Registering on network... "));
  delay(5000); // Wait for network registration
  if (!sendATCommand("AT+CREG?", "+CREG: 0,", 5000)) {
    Serial.println(F("✗ Failed - No network"));
    return false;
  }
  Serial.println(F("✓"));
  
  // Enable GPS
  Serial.print(F("   Powering on GPS... "));
  if (!sendATCommand("AT+CGNSPWR=1", "OK", 2000)) {
    Serial.println(F("✗ Failed"));
    return false;
  }
  Serial.println(F("✓"));
  
  // Configure GPRS
  Serial.println(F("\n3. Configuring GPRS..."));
  if (!setupGPRS()) {
    Serial.println(F("   ✗ GPRS setup failed"));
    return false;
  }
  Serial.println(F("   ✓ GPRS configured"));
  
  return true;
}

bool setupGPRS() {
  // Set connection type to GPRS
  if (!sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", "OK", 2000)) {
    return false;
  }
  
  // Set APN
  String apnCmd = "AT+SAPBR=3,1,\"APN\",\"" + String(APN) + "\"";
  if (!sendATCommand(apnCmd.c_str(), "OK", 2000)) {
    return false;
  }
  
  // Open bearer
  sendATCommand("AT+SAPBR=1,1", "OK", 10000); // May take longer
  delay(2000);
  
  // Query bearer status
  sendATCommand("AT+SAPBR=2,1", "OK", 2000);
  
  return true;
}

// ======================== GPS FUNCTIONS ========================

void printGPSInfo() {
  Serial.println(F("\n📍 Current Location:"));
  Serial.print(F("   Lat: ")); Serial.println(gps.location.lat(), 6);
  Serial.print(F("   Lon: ")); Serial.println(gps.location.lng(), 6);
  
  if (gps.altitude.isValid()) {
    Serial.print(F("   Alt: ")); Serial.print(gps.altitude.meters());
    Serial.println(F(" m"));
  }
  
  if (gps.speed.isValid()) {
    Serial.print(F("   Speed: ")); Serial.print(gps.speed.kmph());
    Serial.println(F(" km/h"));
  }
  
  if (gps.satellites.isValid()) {
    Serial.print(F("   Satellites: ")); Serial.println(gps.satellites.value());
  }
  
  if (gps.hdop.isValid()) {
    Serial.print(F("   Accuracy: "));
    double hdop = gps.hdop.hdop();
    if (hdop < 2.0) Serial.println(F("Excellent"));
    else if (hdop < 5.0) Serial.println(F("Good"));
    else if (hdop < 10.0) Serial.println(F("Moderate"));
    else Serial.println(F("Poor"));
  }
}

void sendLocationToServer() {
  Serial.println(F("\n📡 Sending location to server..."));
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["device_id"] = DEVICE_ID;
  doc["latitude"] = gps.location.lat();
  doc["longitude"] = gps.location.lng();
  
  if (gps.altitude.isValid()) {
    doc["altitude"] = gps.altitude.meters();
  }
  
  if (gps.speed.isValid()) {
    doc["speed"] = gps.speed.kmph();
  }
  
  if (gps.course.isValid()) {
    doc["heading"] = gps.course.deg();
  }
  
  if (gps.hdop.isValid()) {
    doc["accuracy"] = gps.hdop.hdop();
  }
  
  doc["status"] = "OK";
  doc["battery_level"] = batteryLevel;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print(F("   JSON: "));
  Serial.println(jsonPayload);
  
  // Send HTTP POST request
  bool success = sendHTTPPost(jsonPayload);
  
  if (success) {
    Serial.println(F("   ✓ Location sent successfully!"));
    isOnline = true;
    lastOnlineTime = millis();
  } else {
    Serial.println(F("   ✗ Failed to send location"));
    isOnline = false;
  }
}

bool sendHTTPPost(String payload) {
  // Initialize HTTP
  sendATCommand("AT+HTTPTERM", "OK", 1000); // Terminate any previous session
  delay(500);
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
  String response = "";
  
  while (millis() - timeout < 15000) {
    if (sim808.available()) {
      response += (char)sim808.read();
    }
    
    // Check for success codes
    if (response.indexOf("+HTTPACTION: 1,200") != -1 || 
        response.indexOf("+HTTPACTION: 1,201") != -1) {
      success = true;
      
      // Check for geofence violation in response
      if (response.indexOf("geofence") != -1 || response.indexOf("breach") != -1) {
        Serial.println(F("   ⚠ Geofence breach detected!"));
        sendGeofenceSMS("Geofence");
      }
      break;
    }
    
    // Check for error codes
    if (response.indexOf("+HTTPACTION: 1,4") != -1) {
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
  
  String message = "ALERT: Tracker " + String(DEVICE_ID) + " is OFFLINE since " + 
                   String(millis() / 60000) + " minutes.";
  
  if (gps.location.isValid()) {
    message += " Last location: https://maps.google.com/?q=";
    message += String(gps.location.lat(), 6);
    message += ",";
    message += String(gps.location.lng(), 6);
  }
  
  bool success = sendSMS(ALERT_PHONE, message);
  
  if (success) {
    Serial.println(F("   ✓ SMS sent successfully"));
  } else {
    Serial.println(F("   ✗ SMS failed"));
  }
}

void sendGeofenceSMS(String geofenceName) {
  Serial.println(F("📱 Sending geofence breach SMS..."));
  
  String message = "ALERT: Animal left geofence '" + geofenceName + "'. ";
  message += "Location: https://maps.google.com/?q=";
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
  delay(2000);
  
  // Send message
  sim808.print(message);
  delay(500);
  
  // Send Ctrl+Z to send SMS
  sim808.write(26);
  
  // Wait for confirmation
  unsigned long timeout = millis();
  bool success = false;
  
  while (millis() - timeout < 15000) {
    if (sim808.available()) {
      String response = sim808.readString();
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
  // Check for SMS commands
  sim808.println("AT+CMGL=\"ALL\"");
  delay(2000);
  
  String response = "";
  unsigned long timeout = millis();
  
  while (millis() - timeout < 5000) {
    if (sim808.available()) {
      response += (char)sim808.read();
    }
  }
  
  // Parse SMS for commands
  if (response.indexOf("BUZZER_ON") != -1 || response.indexOf("ALARM_ON") != -1) {
    buzzerActive = true;
    buzzerStartTime = millis();
    Serial.println(F("🔔 Buzzer activated via SMS"));
  }
  
  if (response.indexOf("BUZZER_OFF") != -1 || response.indexOf("ALARM_OFF") != -1) {
    buzzerActive = false;
    Serial.println(F("🔕 Buzzer deactivated via SMS"));
  }
  
  // Delete all read messages to free memory
  if (response.length() > 10) {
    sendATCommand("AT+CMGD=1,4", "OK", 2000);
  }
}

// ======================== BUZZER CONTROL ========================

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
  
  String response = "";
  unsigned long timeout = millis();
  
  while (millis() - timeout < 2000) {
    if (sim808.available()) {
      response += (char)sim808.read();
    }
  }
  
  // Parse battery level from response: +CBC: 0,70,4.2V
  int firstComma = response.indexOf(',');
  if (firstComma != -1) {
    int secondComma = response.indexOf(',', firstComma + 1);
    if (secondComma != -1) {
      String batteryStr = response.substring(firstComma + 1, secondComma);
      batteryStr.trim();
      int level = batteryStr.toInt();
      if (level > 0 && level <= 100) {
        return level;
      }
    }
  }
  
  return batteryLevel; // Return last known value if parse fails
}

bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
  sim808.println(command);
  
  String response = "";
  unsigned long startTime = millis();
  
  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      response += (char)sim808.read();
    }
    
    if (response.indexOf(expectedResponse) != -1) {
      return true;
    }
  }
  
  return false;
}

String sendATCommandGetResponse(const char* command, unsigned long timeout) {
  sim808.println(command);
  
  String response = "";
  unsigned long startTime = millis();
  
  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      response += (char)sim808.read();
    }
  }
  
  return response;
}
