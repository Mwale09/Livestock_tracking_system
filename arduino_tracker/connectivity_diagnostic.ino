#include <SoftwareSerial.h>
#include <ctype.h>

SoftwareSerial sim808(7, 8); // TX, RX

// SETTINGS
const char *URL = "https://httpdump.app/dumps/d2a6a3a4-8efe-44a0-b90e-248cb91f33ef";
char currentAPN[32] = "econet.net";

char responseBuffer[256];

// Prototypes
bool sendCmd(const char *cmd, unsigned long timeout = 3000);
void runHttpGet(const char *targetUrl, unsigned long timeout);

void setup() {
  Serial.begin(9600);
  sim808.begin(9600);

  Serial.println(F("\n================================"));
  Serial.println(F("SIM808 ADVANCED DIAGNOSTIC v8"));
  Serial.println(F("================================"));
  Serial.println(F("Instructions:"));
  Serial.println(F("1. Type a letter (A-M) to run a specific test step."));
  Serial.println(
      F("2. If it is 'silent' (no OK/ERROR), POWER is the suspect."));
  Serial.println(F("\nMENU:"));
  Serial.println(F("[A] Module Info (AT, CBC, CSQ)"));
  Serial.println(F("[B] Network Status (CREG, CGATT)"));
  Serial.println(F("[C] Toggle APN (current: econet.net / internet.econet)"));
  Serial.println(F("[D] Setup Bearer Config (SAPBR=3)"));
  Serial.println(F("[E] Open Bearer (SAPBR=1,1) - HIGH POWER STEP!"));
  Serial.println(F("[F] Check IP Address (SAPBR=2,1)"));
  Serial.println(F("[G] Test Plain HTTP GET (Non-SSL)"));
  Serial.println(F("[H] Execute HTTPS GET (Render)"));
  Serial.println(F("[I] Extended Error Report (AT+CEER)"));
  Serial.println(F("[J] TURN OFF GPS POWER (Recommended before GPRS)"));
  Serial.println(F("[K] METHOD 2: GPRS Activation (CSTT/CIICR)"));
  Serial.println(F("[L] NUCLEAR RESET (CFUN=1,1)"));
  Serial.println(F("[X] Reset HTTP Session (AT+HTTPTERM)"));
  Serial.println(F("\nType a letter and press Enter:"));
}

void loop() {
  if (Serial.available()) {
    char c = toupper(Serial.read());
    if (c == '\n' || c == '\r' || c == ' ')
      return;

    Serial.print(F("\n>>> STARTING STEP "));
    Serial.print(c);
    Serial.println(F(" <<<"));

    switch (c) {
    case 'A':
      sendCmd("AT");
      sendCmd("AT+CMEE=2");
      sendCmd("AT+CBC");
      sendCmd("AT+CSQ");
      break;
    case 'B':
      sendCmd("AT+CPIN?");
      sendCmd("AT+CREG?");
      sendCmd("AT+CGATT?");
      break;
    case 'C':
      if (strcmp(currentAPN, "econet.net") == 0)
        strcpy(currentAPN, "internet.econet");
      else
        strcpy(currentAPN, "econet.net");
      Serial.print(F("Current APN set to: "));
      Serial.println(currentAPN);
      break;
    case 'D':
      sendCmd("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
      sim808.print(F("AT+SAPBR=3,1,\"APN\",\""));
      sim808.print(currentAPN);
      sim808.println(F("\""));
      sendCmd("", 3000);
      break;
    case 'E':
      Serial.println(
          F("Attempting to open bearer... (Watch for reset/silence)"));
      sendCmd("AT+SAPBR=1,1", 30000);
      break;
    case 'F':
      sendCmd("AT+SAPBR=2,1");
      sendCmd("AT+CIFSR");
      break;
    case 'G':
      runHttpGet("http://v2.jokeapi.dev/joke/Any?format=txt", 25000);
      break;
    case 'H':
      runHttpGet(URL, 35000);
      break;
    case 'I':
      sendCmd("AT+CEER");
      break;
    case 'J':
      Serial.println(F("Turning GPS OFF to save power..."));
      sendCmd("AT+CGNSPWR=0");
      break;
    case 'K':
      Serial.println(F("Method 2: GPRS Activation..."));
      sendCmd("AT+CIPSHUT");
      sim808.print(F("AT+CSTT=\""));
      sim808.print(currentAPN);
      sim808.println(F("\""));
      sendCmd("", 3000);
      sendCmd("AT+CIICR", 15000);
      sendCmd("AT+CIFSR", 3000);
      break;
    case 'L':
      sendCmd("AT+CFUN=1,1", 2000);
      Serial.println(F("Rebooting... Wait 15s."));
      break;
    case 'X':
      sendCmd("AT+HTTPTERM");
      sendCmd("AT+SAPBR=0,1");
      break;
    default:
      Serial.println(F("Unknown command."));
      break;
    }
    Serial.println(F("\n>>> STEP COMPLETE. Select next option:"));
  }

  if (sim808.available()) {
    Serial.write(sim808.read());
  }
}

void runHttpGet(const char *targetUrl, unsigned long timeout) {
  sendCmd("AT+HTTPTERM");
  delay(200);
  sendCmd("AT+HTTPINIT");
  sendCmd("AT+HTTPPARA=\"CID\",1");

  sim808.print(F("AT+HTTPPARA=\"URL\",\""));
  sim808.print(targetUrl);
  sim808.println(F("\""));
  sendCmd("", 3000);

  if (strstr(targetUrl, "https")) {
    sendCmd("AT+HTTPPARA=\"REDIR\",1");
    sendCmd("AT+HTTPPARA=\"SSL\",1");
  }

  sim808.println(F("AT+HTTPACTION=0"));
  sendCmd("", timeout);
  sendCmd("AT+HTTPREAD");
  sendCmd("AT+HTTPTERM");
}

bool sendCmd(const char *cmd, unsigned long timeout) {
  if (cmd && strlen(cmd) > 0) {
    Serial.print(F("SEND: "));
    Serial.println(cmd);
    sim808.println(cmd);
  }

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  bool gotResponse = false;

  unsigned long start = millis();
  while (millis() - start < timeout) {
    if (sim808.available()) {
      char c = sim808.read();
      Serial.write(c);
      if (idx < sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
      // Check for success or error to exit early
      if (strstr(responseBuffer, "OK") || strstr(responseBuffer, "ERROR")) {
        gotResponse = true;
        break;
      }
    }
    // Show heartbeat dots
    static unsigned long lastDot = 0;
    if (millis() - lastDot > 1000) {
      lastDot = millis();
      if (!sim808.available())
        Serial.print(".");
    }
  }
  Serial.println();
  return gotResponse;
}
