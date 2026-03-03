/*
 * ============================================================================
 * CONNECTIVITY CHECK (FREEZE FIX + HEARTBEAT)
 * ============================================================================
 *
 * Hardware: Arduino Uno + SIM808 Module
 *
 * CHANGE LOG:
 * 1. Fixed sendATCommand: Ensures a newline is ALWAYS sent if a command is
 * provided.
 * 2. Added "." heartbeats: Shows you that the Arduino is still alive while
 * waiting.
 * 3. Conditional Power-on: Prevents turning the module OFF if it's already ON.
 *
 * ============================================================================
 */

#include <SoftwareSerial.h>

// ======================== PIN CONFIGURATION ========================
#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4
#define BUZZER_PIN 9

// ======================== YOUR SETTINGS ========================
const char *DEVICE_ID = "CONNECT_TEST";
const char *APN = "econet.net";
const char *SERVER_URL =
    "https://httpdump.app/dumps/d2a6a3a4-8efe-44a0-b90e-248cb91f33ef";

// ======================== OBJECTS ========================
SoftwareSerial sim808(SIM808_TX, SIM808_RX);

// ======================== GLOBAL VARIABLES ========================
char responseBuffer[201];
char payloadBuffer[300];
bool systemInitialized = false;

// Dummy Location Data
float currentLat = -17.824858;
float currentLng = 31.053028;

// ======================== SETUP ========================
void setup() {
  Serial.begin(9600);
  sim808.begin(9600);

  pinMode(SIM808_PWR, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Serial.println(F("\n\n###########################################"));
  Serial.println(F("   FREEZE-PROOFER CONNECTIVITY CHECK"));
  Serial.println(F("###########################################"));

  // STEP 1: Smart Power-On
  if (smartPowerOn()) {
    Serial.println(F("\n2. Initializing SIM808 Service/Network..."));
    if (initializeNetworkAndGPRS()) {
      systemInitialized = true;
      Serial.println(F("\n✓ ALL SYSTEMS READY!"));
      playSuccessBeep();
    } else {
      Serial.println(F("\n✗ Network Setup Failed."));
    }
  } else {
    Serial.println(F(
        "\n✗ CRITICAL: Cannot communication with SIM808. Check wiring/power."));
  }
}

void loop() {
  if (!systemInitialized) {
    Serial.println(F("System not initialized. Retrying in 30s..."));
    delay(30000);
    if (smartPowerOn() && initializeNetworkAndGPRS())
      systemInitialized = true;
    return;
  }

  Serial.println(F("\n--- Automatic Test Cycle ---"));
  sendDummyData();

  Serial.println(F("Waiting 60 seconds... (Arduino is ALIVE)"));
  delay(60000);
}

// ======================== SMART POWER FUNCTIONS ========================

bool isModuleAlive() {
  // Try AT up to 3 times
  for (int i = 0; i < 3; i++) {
    flushSIM808Buffer();
    sim808.println(F("AT"));
    unsigned long start = millis();
    while (millis() - start < 1500) {
      if (sim808.find("OK"))
        return true;
      Serial.print(F(".")); // Heartbeat
    }
    delay(500);
  }
  return false;
}

bool smartPowerOn() {
  Serial.println(F("1. Checking if SIM808 is already ON..."));

  if (isModuleAlive()) {
    Serial.println(
        F("\n   ✓ Module is already responsive. Skipping power pulse."));
    return true;
  }

  Serial.println(F("\n   ⚠ No response. Pulsing Power Pin 4..."));
  digitalWrite(SIM808_PWR, HIGH);
  delay(2000);
  digitalWrite(SIM808_PWR, LOW);

  Serial.print(F("   Waiting 10s for boot"));
  for (int i = 0; i < 10; i++) {
    delay(1000);
    Serial.print(F("."));
  }
  Serial.println();

  if (isModuleAlive()) {
    Serial.println(F("\n   ✓ Module woke up!"));
    return true;
  }

  return false;
}

// ======================== NETWORK & GPRS ========================

bool initializeNetworkAndGPRS() {
  // Basic Settings
  sendATCommand("ATE0", "OK", 3000);
  sendATCommand("AT+CMEE=2", "OK", 3000);

  Serial.print(F("   SIM Card? "));
  if (sendATCommand("AT+CPIN?", "READY", 8000)) {
    Serial.println(F("✓ READY"));
  } else {
    Serial.println(F("✗ FAIL"));
    return false;
  }

  Serial.print(F("   Network? "));
  bool registered = false;
  for (int i = 0; i < 20; i++) {
    sendATCommandGetResponse("AT+CREG?", 2000);
    if (strstr(responseBuffer, "0,1") || strstr(responseBuffer, "0,5")) {
      registered = true;
      break;
    }
    Serial.print(F("."));
    delay(2000);
  }

  if (!registered) {
    Serial.println(F("✗ TIMEOUT"));
    return false;
  }
  Serial.println(F("✓ REGISTERED"));

  Serial.println(F("   GPRS Setup..."));
  sendATCommand("AT+SAPBR=0,1", "OK", 3000);
  sendATCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", "OK", 3000);

  sim808.print(F("AT+SAPBR=3,1,\"APN\",\""));
  sim808.print(APN);
  sim808.println(F("\""));
  sendATCommand("", "OK", 5000); // Fixed empty command bug

  Serial.print(F("   Opening Bearer... "));
  if (sendATCommand("AT+SAPBR=1,1", "OK", 15000)) {
    Serial.println(F("✓ OPENED"));
    return true;
  }
  Serial.println(F("✗ FAILED"));
  return false;
}

void sendDummyData() {
  Serial.println(F("📡 Sending Dummy JSON..."));
  snprintf(payloadBuffer, sizeof(payloadBuffer),
           "{\"device_id\":\"%s\",\"latitude\":-17.824858,\"longitude\":31."
           "053028,\"status\":\"TEST\"}",
           DEVICE_ID);

  sendATCommand("AT+HTTPTERM", "OK", 2000);
  sendATCommand("AT+HTTPINIT", "OK", 3000);
  sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 3000);

  sim808.print(F("AT+HTTPPARA=\"URL\",\""));
  sim808.print(SERVER_URL);
  sim808.println(F("\""));
  sendATCommand("", "OK", 3000);

  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 3000);
  sendATCommand("AT+HTTPPARA=\"REDIR\",1", "OK", 3000);
  sendATCommand("AT+HTTPPARA=\"SSL\",1", "OK", 3000);

  sim808.print(F("AT+HTTPDATA="));
  sim808.print(strlen(payloadBuffer));
  sim808.println(F(",5000"));
  delay(1000);
  sim808.println(payloadBuffer);
  delay(1000);

  Serial.println(F("   Executing POST... (Wait)"));
  if (sendATCommand("AT+HTTPACTION=1", "+HTTPACTION: 1,200", 25000)) {
    Serial.println(F("   ✓ HTTP 200 OK"));
  } else if (strstr(responseBuffer, "+HTTPACTION: 1,201")) {
    Serial.println(F("   ✓ HTTP 201 Created"));
  } else {
    Serial.print(F("   ✗ Response: "));
    Serial.println(responseBuffer);
  }

  sendATCommand("AT+HTTPTERM", "OK", 2000);
}

// ======================== UTILITIES ========================

void flushSIM808Buffer() {
  while (sim808.available())
    sim808.read();
}

bool sendATCommand(const char *command, const char *expectedResponse,
                   unsigned long timeout) {
  // Fix: Send command ONLY if it's not a null pointer.
  // If it's empty string "", it just waits for response.
  if (command && strlen(command) > 0) {
    sim808.println(command);
  } else if (command && strlen(command) == 0) {
    // If it's an empty string, we assume the previous print already sent the
    // command
  }

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < 199)
        responseBuffer[idx++] = c;
      responseBuffer[idx] = '\0';
    }
    if (strstr(responseBuffer, expectedResponse))
      return true;

    // Tiny delay to let buffer fill
    delay(10);
  }
  return false;
}

void sendATCommandGetResponse(const char *command, unsigned long timeout) {
  if (command && strlen(command) > 0)
    sim808.println(command);
  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < 199)
        responseBuffer[idx++] = c;
      responseBuffer[idx] = '\0';
    }
    delay(10);
  }
}

void playSuccessBeep() {
  tone(BUZZER_PIN, 2000, 200);
  delay(300);
  tone(BUZZER_PIN, 2000, 200);
}
