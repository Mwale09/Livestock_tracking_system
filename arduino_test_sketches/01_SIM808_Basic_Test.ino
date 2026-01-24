/*
 * SIM808 Basic Test Sketch
 * 
 * This sketch tests basic SIM808 functionality:
 * - AT command communication
 * - SIM card detection
 * - Network registration
 * - Signal strength
 * - GPS functionality
 * - Get IMEI number
 * 
 * Upload this BEFORE the full tracker code to verify hardware
 * 
 * Wiring:
 * - SIM808 TX → Arduino Pin 7
 * - SIM808 RX → Arduino Pin 8
 * - SIM808 PWR_KEY → Arduino Pin 4
 * - SIM808 VCC → 5V 2A external supply
 * - SIM808 GND → Common GND
 */

#include <SoftwareSerial.h>

// Pin definitions
#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4

// Create SoftwareSerial object
SoftwareSerial sim808(SIM808_TX, SIM808_RX);

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  sim808.begin(9600);
  
  pinMode(SIM808_PWR, OUTPUT);
  
  Serial.println(F("\n\n========================================"));
  Serial.println(F("    SIM808 Basic Test"));
  Serial.println(F("========================================\n"));
  
  // Power on SIM808
  powerOnSIM808();
  delay(5000);
  
  // Run all tests
  Serial.println(F("\n--- Starting Tests ---\n"));
  
  testATCommunication();
  delay(1000);
  
  getIMEI();
  delay(1000);
  
  testSIMCard();
  delay(1000);
  
  testNetworkRegistration();
  delay(1000);
  
  testSignalStrength();
  delay(1000);
  
  testGPS();
  delay(1000);
  
  Serial.println(F("\n========================================"));
  Serial.println(F("    Test Complete!"));
  Serial.println(F("========================================\n"));
  
  Serial.println(F("Commands you can send:"));
  Serial.println(F("  1 - Test AT communication"));
  Serial.println(F("  2 - Get IMEI"));
  Serial.println(F("  3 - Check SIM card"));
  Serial.println(F("  4 - Check network"));
  Serial.println(F("  5 - Check signal strength"));
  Serial.println(F("  6 - Test GPS"));
  Serial.println(F("  7 - Get GPS location"));
  Serial.println(F("  8 - Send test SMS"));
  Serial.println(F("  9 - Run all tests"));
  Serial.println();
}

void loop() {
  // Forward data from SIM808 to Serial Monitor
  if (sim808.available()) {
    Serial.write(sim808.read());
  }
  
  // Forward commands from Serial Monitor to SIM808
  if (Serial.available()) {
    char c = Serial.read();
    
    // Menu system
    switch(c) {
      case '1':
        testATCommunication();
        break;
      case '2':
        getIMEI();
        break;
      case '3':
        testSIMCard();
        break;
      case '4':
        testNetworkRegistration();
        break;
      case '5':
        testSignalStrength();
        break;
      case '6':
        testGPS();
        break;
      case '7':
        getGPSLocation();
        break;
      case '8':
        sendTestSMS();
        break;
      case '9':
        runAllTests();
        break;
      default:
        sim808.write(c);
    }
  }
}

// ============ UTILITY FUNCTIONS ============

void powerOnSIM808() {
  Serial.println(F("Powering on SIM808..."));
  digitalWrite(SIM808_PWR, HIGH);
  delay(2000);
  digitalWrite(SIM808_PWR, LOW);
  delay(3000);
  Serial.println(F("SIM808 should be powered on now"));
}

bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
  Serial.print(F("Sending: "));
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
  if (response.length() > 0) {
    Serial.print(F("Got: "));
    Serial.println(response);
  }
  return false;
}

String sendATCommandWithResponse(const char* command, unsigned long timeout) {
  Serial.print(F("Sending: "));
  Serial.println(command);
  
  sim808.println(command);
  
  String response = "";
  unsigned long startTime = millis();
  
  while (millis() - startTime < timeout) {
    while (sim808.available()) {
      response += (char)sim808.read();
    }
  }
  
  Serial.print(F("Response: "));
  Serial.println(response);
  return response;
}

// ============ TEST FUNCTIONS ============

void testATCommunication() {
  Serial.println(F("\n[TEST 1] AT Communication"));
  Serial.println(F("---------------------------"));
  if (sendATCommand("AT", "OK", 2000)) {
    Serial.println(F("✓ PASS: SIM808 is responding\n"));
  } else {
    Serial.println(F("✗ FAIL: SIM808 not responding"));
    Serial.println(F("  Check: Wiring, power, baud rate\n"));
  }
}

void getIMEI() {
  Serial.println(F("\n[TEST 2] Get IMEI"));
  Serial.println(F("---------------------------"));
  String response = sendATCommandWithResponse("AT+GSN", 2000);
  
  // Parse IMEI from response
  int start = response.indexOf("\n") + 1;
  int end = response.indexOf("\n", start);
  if (start > 0 && end > start) {
    String imei = response.substring(start, end);
    imei.trim();
    if (imei.length() == 15) {
      Serial.print(F("✓ IMEI: "));
      Serial.println(imei);
      Serial.println(F("  IMPORTANT: Note this down for your Arduino code!\n"));
    } else {
      Serial.println(F("✗ Could not parse IMEI\n"));
    }
  }
}

void testSIMCard() {
  Serial.println(F("\n[TEST 3] SIM Card Status"));
  Serial.println(F("---------------------------"));
  if (sendATCommand("AT+CPIN?", "READY", 5000)) {
    Serial.println(F("✓ PASS: SIM card is ready\n"));
  } else {
    Serial.println(F("✗ FAIL: SIM card not ready"));
    Serial.println(F("  Check: SIM inserted, no PIN lock\n"));
  }
}

void testNetworkRegistration() {
  Serial.println(F("\n[TEST 4] Network Registration"));
  Serial.println(F("---------------------------"));
  String response = sendATCommandWithResponse("AT+CREG?", 2000);
  
  if (response.indexOf("+CREG: 0,1") != -1 || response.indexOf("+CREG: 0,5") != -1) {
    Serial.println(F("✓ PASS: Registered on network\n"));
  } else if (response.indexOf("+CREG: 0,2") != -1) {
    Serial.println(F("⚠ Searching for network...\n"));
  } else {
    Serial.println(F("✗ FAIL: Not registered on network"));
    Serial.println(F("  Check: SIM card, antenna, signal\n"));
  }
}

void testSignalStrength() {
  Serial.println(F("\n[TEST 5] Signal Strength"));
  Serial.println(F("---------------------------"));
  String response = sendATCommandWithResponse("AT+CSQ", 2000);
  
  // Parse signal strength
  int start = response.indexOf("+CSQ: ") + 6;
  int end = response.indexOf(",", start);
  if (start > 5 && end > start) {
    String rssi = response.substring(start, end);
    int signal = rssi.toInt();
    
    Serial.print(F("Signal strength: "));
    Serial.print(signal);
    Serial.print(F(" ("));
    
    if (signal == 99) {
      Serial.println(F("Unknown/Not detectable)"));
      Serial.println(F("✗ FAIL: No signal"));
      Serial.println(F("  Check: GSM antenna, location\n"));
    } else if (signal >= 20) {
      Serial.println(F("Excellent)"));
      Serial.println(F("✓ PASS: Strong signal\n"));
    } else if (signal >= 15) {
      Serial.println(F("Good)"));
      Serial.println(F("✓ PASS: Good signal\n"));
    } else if (signal >= 10) {
      Serial.println(F("Fair)"));
      Serial.println(F("✓ PASS: Acceptable signal\n"));
    } else if (signal >= 5) {
      Serial.println(F("Poor)"));
      Serial.println(F("⚠ WARNING: Weak signal\n"));
    } else {
      Serial.println(F("Very poor)"));
      Serial.println(F("✗ FAIL: Signal too weak\n"));
    }
  }
}

void testGPS() {
  Serial.println(F("\n[TEST 6] GPS Power"));
  Serial.println(F("---------------------------"));
  if (sendATCommand("AT+CGNSPWR=1", "OK", 2000)) {
    Serial.println(F("✓ PASS: GPS powered on"));
    Serial.println(F("  Note: GPS fix may take 2-5 minutes outdoors\n"));
  } else {
    Serial.println(F("✗ FAIL: Could not power on GPS\n"));
  }
}

void getGPSLocation() {
  Serial.println(F("\n[GPS] Getting Location"));
  Serial.println(F("---------------------------"));
  String response = sendATCommandWithResponse("AT+CGNSINF", 2000);
  
  // Parse GPS info
  if (response.indexOf("+CGNSINF:") != -1) {
    int start = response.indexOf("+CGNSINF: ") + 10;
    String gpsData = response.substring(start);
    
    // Split by comma
    int commaPos = gpsData.indexOf(',');
    String runStatus = gpsData.substring(0, commaPos);
    gpsData = gpsData.substring(commaPos + 1);
    
    commaPos = gpsData.indexOf(',');
    String fixStatus = gpsData.substring(0, commaPos);
    
    if (fixStatus == "1") {
      Serial.println(F("✓ GPS has fix!"));
      Serial.println(F("Full GPS data:"));
      Serial.println(gpsData);
    } else {
      Serial.println(F("⚠ GPS powered but no fix yet"));
      Serial.println(F("  Move GPS antenna outdoors"));
      Serial.println(F("  Wait 2-5 minutes for first fix"));
    }
  }
  Serial.println();
}

void sendTestSMS() {
  Serial.println(F("\n[SMS] Send Test SMS"));
  Serial.println(F("---------------------------"));
  Serial.println(F("Enter phone number (with country code, e.g., +263771234567):"));
  
  // Wait for phone number input
  String phoneNumber = "";
  unsigned long timeout = millis();
  while (millis() - timeout < 30000) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') {
        if (phoneNumber.length() > 5) break;
      } else {
        phoneNumber += c;
      }
    }
  }
  
  if (phoneNumber.length() < 5) {
    Serial.println(F("✗ No phone number entered"));
    return;
  }
  
  Serial.print(F("Sending SMS to: "));
  Serial.println(phoneNumber);
  
  // Set SMS text mode
  sendATCommand("AT+CMGF=1", "OK", 2000);
  
  // Set phone number
  sim808.print("AT+CMGS=\"");
  sim808.print(phoneNumber);
  sim808.println("\"");
  delay(1000);
  
  // Send message
  sim808.print("Test SMS from livestock tracker. GPS tracker is working!");
  delay(100);
  
  // Send Ctrl+Z
  sim808.write(26);
  delay(5000);
  
  // Check response
  String response = "";
  while (sim808.available()) {
    response += (char)sim808.read();
  }
  
  Serial.println(response);
  if (response.indexOf("+CMGS") != -1) {
    Serial.println(F("✓ SMS sent successfully!\n"));
  } else {
    Serial.println(F("✗ SMS failed to send"));
    Serial.println(F("  Check: Credit, network, phone number format\n"));
  }
}

void runAllTests() {
  Serial.println(F("\n========================================"));
  Serial.println(F("    Running All Tests"));
  Serial.println(F("========================================\n"));
  
  testATCommunication();
  delay(1000);
  
  getIMEI();
  delay(1000);
  
  testSIMCard();
  delay(1000);
  
  testNetworkRegistration();
  delay(1000);
  
  testSignalStrength();
  delay(1000);
  
  testGPS();
  delay(1000);
  
  getGPSLocation();
  
  Serial.println(F("\n========================================"));
  Serial.println(F("    Tests Complete"));
  Serial.println(F("========================================\n"));
}
