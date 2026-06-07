#include <HardwareSerial.h>

#define MODEM_RX_PIN 16
#define MODEM_TX_PIN 17
#define BUZZER_PIN   25   // ESP32 GPIO for buzzer (use active buzzer via transistor)

HardwareSerial sim808(2);

// ===================== SETTINGS =====================
const char *APN = "econet.net";
const char *DEVICE_ID = "GPS001";
//const char *TB_URL = "http://eu.thingsboard.cloud/api/v1/uveeyeqoxudmdmgu3267/telemetry";
// Fallback when the APN/modem can't do DNS (HTTPACTION 603).
// Set this to the resolved IP of eu.thingsboard.cloud (same path), e.g.
// "http://<IP>/api/v1/<TOKEN>/telemetry"
// Leave empty to disable IP fallback.
//const char *TB_URL_IP = "";const char *TB_URL_IP = "http://3.69.110.78/api/v1/uveeyeqoxudmdmgu3267/telemetry";
const char *TB_URL = "http://3.69.110.78/api/v1/uveeyeqoxudmdmgu3267/telemetry";
const char *ALERT_PHONE = "+263714265736"; // change to your number

const unsigned long SEND_INTERVAL_MS    = 60000UL; // 60 seconds
const unsigned long BUZZER_DURATION_MS  = 10000UL; // 10 seconds
const unsigned long GEOFENCE_SMS_COOLDOWN_MS = 600000UL; // 10 minutes

// Geofence around your kraal
const double GEOFENCE_LAT      = -20.168522;
const double GEOFENCE_LNG      =  28.643799;
const double GEOFENCE_RADIUS_M = 10.0; // 10 meters

// ===================== BUFFERS =====================
char responseBuffer[256];
char payloadBuffer[256];
// ===================== STATE =====================
float currentLat = 0.0;
float currentLng = 0.0;
float currentSpeed = 0.0;
float currentHeading = 0.0;
int batteryLevel = 100;
bool gpsValid = false;

unsigned long lastSend = 0;
unsigned long lastSMSCheck = 0;
unsigned long lastGeofenceSMS = 0;

bool buzzerActive = false;
unsigned long buzzerStart = 0;

// ===================== NETWORK / DNS HELPERS =====================
bool configureDNS() {
  // Prefer SAPBR DNS parameters; these are supported on SIM800/SIM808 when using SAPBR bearer.
  // (AT+CDNSCFG is not available on some firmwares -> ERROR.)
  bool ok1 = sendCommand("AT+SAPBR=3,1,\"DNS1\",\"8.8.8.8\"", "OK", 5000);
  bool ok2 = sendCommand("AT+SAPBR=3,1,\"DNS2\",\"1.1.1.1\"", "OK", 5000);
  if (!ok1 || !ok2) {
    Serial.println(F("DNSCFG FAIL"));
    Serial.println(responseBuffer);
    return false;
  }
  return true;
}

void hardResetBearer() {
  sendCommand("AT+SAPBR=0,1", "OK", 15000);
  delay(1500);
  sendCommand("AT+SAPBR=1,1", "OK", 25000);
  delay(4000);
}

// ===================== SERIAL HELPERS =====================
void flushSIM() {
  while (sim808.available()) {
    sim808.read();
    delay(2);
  }
}

bool sendCommand(const char *cmd, const char *expect, unsigned long timeout) {
  flushSIM();

  if (cmd != NULL && strlen(cmd) > 0) {
    sim808.println(cmd);
  }

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  unsigned long lastByte = millis();

  while (millis() - start < timeout) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
      lastByte = millis();
    }

    if (expect && strstr(responseBuffer, expect)) {
      return true;
    }

    // Only use the "quiet gap" early-exit when we're NOT waiting for a specific token.
    // For responses like +HTTPACTION that can arrive many seconds later, we must
    // wait the full timeout.
    if (!expect && idx > 0 && (millis() - lastByte > 120)) {
      break;
    }

    delay(5);
  }

  if (expect == NULL) return idx > 0;
  return strstr(responseBuffer, expect) != NULL;
}

bool setAPN() {
  flushSIM();

  sim808.print(F("AT+SAPBR=3,1,\"APN\",\""));
  sim808.print(APN);
  sim808.println(F("\""));

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  unsigned long lastByte = millis();

  while (millis() - start < 4000) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
      lastByte = millis();
    }

    if (strstr(responseBuffer, "OK")) return true;
    if (strstr(responseBuffer, "ERROR")) return false;
    if (idx > 0 && (millis() - lastByte > 120)) break;

    delay(5);
  }

  return strstr(responseBuffer, "OK") != NULL;
}

bool setURL(const char *url) {
  flushSIM();

  sim808.print(F("AT+HTTPPARA=\"URL\",\""));
  sim808.print(url);
  sim808.println(F("\""));

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  unsigned long lastByte = millis();

  while (millis() - start < 5000) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
      lastByte = millis();
    }

    if (strstr(responseBuffer, "OK")) return true;
    if (strstr(responseBuffer, "ERROR")) return false;
    if (idx > 0 && (millis() - lastByte > 120)) break;

    delay(5);
  }

  return strstr(responseBuffer, "OK") != NULL;
}

// Wait for a full +HTTPACTION line: +HTTPACTION: 1,<status>,<datalen>
// We can't stop as soon as the prefix appears because SIM808 often streams the
// rest of the line a moment later (e.g. "6" then "03,0"), which breaks parsing.
bool waitForHTTPActionLine(unsigned long timeout, int *outStatus, long *outLen) {
  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();
  unsigned long lastByte = millis();
  bool seenPrefix = false;

  while (millis() - start < timeout) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
      lastByte = millis();
    }

    char *p = strstr(responseBuffer, "+HTTPACTION: 1,");
    if (p) {
      seenPrefix = true;
      // Require at least two commas after the prefix so we have full "<status>,<len>"
      char *comma1 = strchr(p, ',');
      if (comma1) {
        char *comma2 = strchr(comma1 + 1, ',');
        if (comma2) {
          int status = 0;
          long len = 0;
          // Parse from the prefix
          if (sscanf(p, "+HTTPACTION: 1,%d,%ld", &status, &len) >= 1) {
            if (outStatus) *outStatus = status;
            if (outLen) *outLen = len;
            return true;
          }
        }
      }
    }

    // If we saw the prefix but nothing new arrives for a bit, keep waiting;
    // otherwise we'd cut the line in half.
    if (!seenPrefix && idx > 0 && (millis() - lastByte > 500)) {
      // some other response came back; keep waiting for HTTPACTION
    }

    delay(10);
  }

  return false;
}

// ===================== SMS =====================
bool sendSMS(const char *phone, const char *message) {
  Serial.println(F("SEND SMS"));

  if (!sendCommand("AT+CMGF=1", "OK", 3000)) {
    Serial.println(F("CMGF FAIL"));
    return false;
  }

  if (!sendCommand("AT+CSCS=\"GSM\"", "OK", 2000)) {
    Serial.println(F("CSCS FAIL"));
    return false;
  }

  flushSIM();
  sim808.print(F("AT+CMGS=\""));
  sim808.print(phone);
  sim808.println(F("\""));

  unsigned long start = millis();
  bool gotPrompt = false;
  while (millis() - start < 5000) {
    if (sim808.available()) {
      char c = sim808.read();
      if (c == '>') {
        gotPrompt = true;
        break;
      }
    }
  }

  if (!gotPrompt) {
    Serial.println(F("NO SMS PROMPT"));
    return false;
  }

  sim808.print(message);
  sim808.write(26); // Ctrl+Z

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  start = millis();
  while (millis() - start < 20000) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
    if (strstr(responseBuffer, "+CMGS")) {
      Serial.println(F("SMS OK"));
      return true;
    }
    if (strstr(responseBuffer, "ERROR")) {
      Serial.println(F("SMS ERROR"));
      Serial.println(responseBuffer);
      return false;
    }
    delay(20);
  }
  Serial.println(F("SMS TIMEOUT"));
  return false;
}

void checkSMSCommands() {
  // Ensure text mode before reading
  sendCommand("AT+CMGF=1", "OK", 2000);

  flushSIM();
  sim808.println("AT+CMGL=\"ALL\"");

  memset(responseBuffer, 0, sizeof(responseBuffer));
  int idx = 0;
  unsigned long start = millis();

  // Read everything into responseBuffer for up to 5 seconds
  while (millis() - start < 5000) {
    while (sim808.available()) {
      char c = sim808.read();
      if (idx < (int)sizeof(responseBuffer) - 1) {
        responseBuffer[idx++] = c;
        responseBuffer[idx] = '\0';
      }
    }
    // small delay to batch bytes
    delay(10);
  }

  Serial.println(F("CMGL RAW RESP:"));
  Serial.println(responseBuffer);

  // Now just search the text for commands
  if (strstr(responseBuffer, "BUZZER_ON") || strstr(responseBuffer, "ALARM_ON")) {
    buzzerActive = true;
    buzzerStart = millis();
    Serial.println(F("BUZZER ON CMD"));
  }

  if (strstr(responseBuffer, "BUZZER_OFF") || strstr(responseBuffer, "ALARM_OFF")) {
    buzzerActive = false;
    Serial.println(F("BUZZER OFF CMD"));
  }

  // Clear all SMS so memory does not fill up
  sendCommand("AT+CMGD=1,4", "OK", 3000);  // delete all messages [web:36]
}
// ===================== BUZZER / GEOFENCE HELPERS =====================
void handleBuzzer() {
  if (buzzerActive) {
    if (millis() - buzzerStart >= BUZZER_DURATION_MS) {
      buzzerActive = false;
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println(F("BUZZER AUTO OFF"));
      return;
    }
    // simple on/off; you can change this to a pattern if you like
    digitalWrite(BUZZER_PIN, HIGH);
    } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
}

double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0; // earth radius in meters
  double p1 = lat1 * PI / 180.0;
  double p2 = lat2 * PI / 180.0;
  double dp = (lat2 - lat1) * PI / 180.0;
  double dl = (lon2 - lon1) * PI / 180.0;

  double a = sin(dp / 2) * sin(dp / 2) +
             cos(p1) * cos(p2) *
             sin(dl / 2) * sin(dl / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}

void checkGeofenceAndAlert() {
  if (!gpsValid) return;

  double dist = haversineMeters(currentLat, currentLng, GEOFENCE_LAT, GEOFENCE_LNG);
  Serial.print(F("GEOFENCE DIST (m): "));
  Serial.println(dist, 1);

  if (dist > GEOFENCE_RADIUS_M) {
    // Outside 10 m radius
    // Send immediately the first time (lastGeofenceSMS == 0),
    // then at most once per cooldown period.
    if (lastGeofenceSMS == 0 || millis() - lastGeofenceSMS > GEOFENCE_SMS_COOLDOWN_MS) {
      lastGeofenceSMS = millis();

      char msg[200];
      snprintf(msg, sizeof(msg),
               "ALERT: Animal %s left kraal (%.1fm away). Maps: https://maps.google.com/?q=%.6f,%.6f",
               DEVICE_ID,
               dist,
               currentLat,
               currentLng);
      sendSMS(ALERT_PHONE, msg);
    }
  }
}

// ===================== MODEM INIT =====================
bool initModem() {
  Serial.println(F("INIT"));

  // Basic checks
  if (!sendCommand("AT", "OK", 2000)) {
    Serial.println(F("AT FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  if (!sendCommand("ATE0", "OK", 2000)) {
    Serial.println(F("ATE0 FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  if (!sendCommand("AT+CPIN?", "READY", 3000)) {
    Serial.println(F("SIM FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  if (!sendCommand("AT+CREG?", "OK", 3000)) {
    Serial.println(F("CREG FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  int n, stat;
  if (sscanf(responseBuffer, "+CREG: %d,%d", &n, &stat) == 2) {
    if (stat == 1 || stat == 5) {
      Serial.println("NETWORK REGISTERED");
    } else {
      Serial.println("NOT REGISTERED");
      return false;
    }
  }

  if (!sendCommand("AT+CGATT?", "OK", 3000)) {
    Serial.println(F("CGATT? FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  if (!strstr(responseBuffer, "+CGATT: 1")) {
    if (!sendCommand("AT+CGATT=1", "OK", 10000)) {
      Serial.println(F("CGATT=1 FAIL"));
      Serial.println(responseBuffer);
      return false;
    }
  }

  // -------- GPRS BEARER SETUP (HTTP) --------

  // 1) Set bearer type = GPRS
  if (!sendCommand("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"", "OK", 5000)) {
    Serial.println(F("CONTYPE FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  // 2) Set APN
  if (!setAPN()) {
    Serial.println(F("APN FAIL"));
    Serial.println(responseBuffer);
    return false;
  }

  // (Optional) If Econet needs user/pass, uncomment these:
  // sendCommand("AT+SAPBR=3,1,\"USER\",\"econet\"", "OK", 5000);
  // sendCommand("AT+SAPBR=3,1,\"PWD\",\"econet\"", "OK", 5000);

  // 3) Open bearer
  if (!sendCommand("AT+SAPBR=1,1", "OK", 15000)) {
  Serial.println(F("SAPBR OPEN GOT ERROR, WILL CHECK STATUS"));
  Serial.println(responseBuffer);
  // Do NOT return false here; go on to check status
}

  delay(5000); 


  if (!sendCommand("AT+SAPBR=2,1", "OK", 5000)) {
  Serial.println(F("SAPBR STATUS FAIL"));
  Serial.println(responseBuffer);
  return false;
}

Serial.print(F("SAPBR RESP: "));
Serial.println(responseBuffer);
// Optional: verify it really says +SAPBR: 1,1,"..."
if (!strstr(responseBuffer, "+SAPBR: 1,1")) {
  Serial.println(F("NO ACTIVE BEARER"));
  return false;
}

  // -------- GPS POWER --------
  if (!sendCommand("AT+CGNSPWR=1", "OK", 3000)) {
    Serial.println(F("GPS PWR FAIL"));
    Serial.println(responseBuffer);
    return false;
  }
  sendCommand("AT+CMGF=1", "OK", 3000);

  // DNS is a common cause of HTTPACTION 603 on some APNs.
  // Configure DNS for the SAPBR bearer and reopen bearer so settings take effect.
  configureDNS();
  hardResetBearer();

  Serial.println(F("MODEM OK"));
  return true;
}

// ===================== GPS =====================
bool getGPS() {
  if (!sendCommand("AT+CGNSINF", "OK", 3000)) {
    gpsValid = false;
    return false;
  }

  char *ptr = strstr(responseBuffer, "+CGNSINF: ");
  if (!ptr) {
    gpsValid = false;
    return false;
  }

  ptr += 10;

  int runStatus = atoi(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  int fixStatus = atoi(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Skip UTC time
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Latitude
  currentLat = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Longitude
  currentLng = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Skip altitude
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Speed
  currentSpeed = atof(ptr);
  ptr = strchr(ptr, ',');
  if (!ptr) return false;
  ptr++;

  // Heading / course
  currentHeading = atof(ptr);

  gpsValid = (runStatus == 1 && fixStatus == 1 &&
              currentLat != 0.0 && currentLng != 0.0);

  return gpsValid;
}

// ===================== BATTERY =====================
int getBatteryLevel() {
  if (!sendCommand("AT+CBC", "OK", 2000)) {
    return batteryLevel;
  }

  char *cbcPtr = strstr(responseBuffer, "+CBC:");
  if (!cbcPtr) return batteryLevel;

  char *firstComma = strchr(cbcPtr, ',');
  if (!firstComma) return batteryLevel;

  int level = atoi(firstComma + 1);
  if (level >= 0 && level <= 100) return level;

  return batteryLevel;
}

// ===================== HTTP POST =====================
bool postToThingsBoard(const char *payload) {
  // Retry the entire HTTP transaction once after bearer reset on timeout/601.
  for (int attempt = 0; attempt < 2; attempt++) {
    int httpCode = 0;

    // Ensure bearer is up before HTTPINIT
    if (!ensureHTTPBearer()) {
      Serial.println(F("BEARER DOWN"));
      if (attempt == 0) {
        // Try a hard bearer reset once
        sendCommand("AT+SAPBR=0,1", "OK", 10000);
        delay(1500);
        sendCommand("AT+SAPBR=1,1", "OK", 20000);
        delay(3000);
        continue;
      }
      return false;
    }

    Serial.println(F("P1"));
    sendCommand("AT+HTTPTERM", "OK", 2000);
    delay(300);

    // HTTPINIT can sporadically fail; retry a few times
    Serial.println(F("P2"));
    bool httpInitOk = false;
    for (int i = 0; i < 3; i++) {
      if (sendCommand("AT+HTTPINIT", "OK", 8000)) {
        httpInitOk = true;
        break;
      }
      delay(500);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      delay(300);
    }
    if (!httpInitOk) {
      Serial.println(F("HTTPINIT FAIL"));
      Serial.println(responseBuffer);
      if (attempt == 0) {
        // Reset bearer and retry whole transaction
        sendCommand("AT+SAPBR=0,1", "OK", 10000);
        delay(1500);
        sendCommand("AT+SAPBR=1,1", "OK", 20000);
        delay(3000);
        continue;
      }
      return false;
    }

    Serial.println(F("P3"));
    if (!sendCommand("AT+HTTPPARA=\"CID\",1", "OK", 3000)) {
      Serial.println(F("CID FAIL"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      if (attempt == 0) continue;
      return false;
    }

    Serial.println(F("P5"));
    const char *urlToUse = TB_URL;
    // If DNS is broken on this modem/APN, HTTPACTION returns 603.
    // We can bypass DNS by using the IP-based URL if provided.
    if (attempt > 0 && TB_URL && TB_URL[0] != '\0') {      urlToUse = TB_URL;
      Serial.println(F("USING TB_URL_IP (DNS bypass)"));
    } else if (attempt > 0 && (!TB_URL || TB_URL[0] == '\0')) {
        Serial.println(F("TIP: set TB_URL_IP to bypass DNS/603"));
    }

    if (!setURL(urlToUse)) {
      Serial.println(F("URL FAIL"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      if (attempt == 0) continue;
      return false;
    }

    Serial.println(F("P6"));
    if (!sendCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 3000)) {
      Serial.println(F("CONTENT FAIL"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      if (attempt == 0) continue;
      return false;
    }

    Serial.print(F("JSON: "));
    Serial.println(payload);

    Serial.println(F("P7"));
    flushSIM();
    sim808.print(F("AT+HTTPDATA="));
    sim808.print(strlen(payload));
    sim808.println(F(",10000"));

    memset(responseBuffer, 0, sizeof(responseBuffer));
    int idx = 0;
  unsigned long start = millis();
    while (millis() - start < 12000) {
    while (sim808.available()) {
        char c = sim808.read();
        if (idx < (int)sizeof(responseBuffer) - 1) {
          responseBuffer[idx++] = c;
          responseBuffer[idx] = '\0';
        }
      }
      if (strstr(responseBuffer, "DOWNLOAD")) break;
      if (strstr(responseBuffer, "ERROR")) break;
      delay(5);
    }
    if (!strstr(responseBuffer, "DOWNLOAD")) {
      Serial.println(F("HTTPDATA FAIL"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      if (attempt == 0) continue;
      return false;
    }

    Serial.println(F("P8"));
    sim808.print(payload);
    if (!sendCommand("", "OK", 15000)) {
      Serial.println(F("PAYLOAD FAIL"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      if (attempt == 0) continue;
      return false;
    }

    Serial.println(F("P9"));
    flushSIM();
    sim808.println(F("AT+HTTPACTION=1"));

    // Wait longer for full +HTTPACTION line; weak networks can take >30s
    int actionStatus = 0;
    long actionLen = 0;
    if (!waitForHTTPActionLine(90000, &actionStatus, &actionLen)) {
      Serial.println(F("NO HTTPACTION"));
      Serial.println(responseBuffer);
      sendCommand("AT+HTTPTERM", "OK", 2000);
      // Reset bearer once and retry
      if (attempt == 0) {
        sendCommand("AT+SAPBR=0,1", "OK", 10000);
        delay(1500);
        sendCommand("AT+SAPBR=1,1", "OK", 20000);
        delay(3000);
        continue;
      }
      return false;
    }

    Serial.print(F("HTTPACTION RESP: "));
    Serial.println(responseBuffer);

    httpCode = actionStatus;

    Serial.print(F("HTTP CODE: "));
    Serial.println(httpCode);

    Serial.println(F("P10"));
    sim808.println(F("AT+HTTPREAD"));
    delay(1000);
    while (sim808.available()) {
      Serial.write(sim808.read());
    }

    sendCommand("AT+HTTPTERM", "OK", 2000);

    if (httpCode == 200 || httpCode == 201) {
      return true;
    }

    // On 601/603, reset bearer and retry once.
    // If DNS is broken (603), the second attempt can use TB_URL_IP if set.
    if ((httpCode == 601 || httpCode == 603) && attempt == 0) {
      hardResetBearer();
      continue;
    }

    return false;
  }
  return false;
}

bool ensureHTTPBearer() {
  // Quick check bearer status
  if (!sendCommand("AT+SAPBR=2,1", "OK", 5000)) {
    return false;
  }
  if (strstr(responseBuffer, "+SAPBR: 1,1")) {
    return true; // already up
  }

  // Try reopen
  if (!sendCommand("AT+SAPBR=1,1", "OK", 15000)) {
    return false;
  }
  delay(3000);
  return sendCommand("AT+SAPBR=2,1", "OK", 5000) &&
         strstr(responseBuffer, "+SAPBR: 1,1");
}


// ===================== OFFLINE SMS SUPPORT =====================
int consecutivePostFails = 0;
unsigned long lastOfflineSMS = 0;
const unsigned long OFFLINE_SMS_COOLDOWN_MS = 30UL * 60UL * 1000UL; // 30 minutes
const int OFFLINE_FAIL_THRESHOLD = 3; // number of consecutive HTTP failures before SMS

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  sim808.begin(9600, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // TEST: make buzzer beep for 2 seconds at boot
  digitalWrite(BUZZER_PIN, HIGH);
  delay(2000);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("BOOT");
  delay(10000);

  if (!initModem()) {
    Serial.println("INIT FAIL");
    return;
  }

  Serial.println("READY");
}// ===================== LOOP =====================
void loop() {
  // Always keep buzzer and SMS commands responsive
  handleBuzzer();

  if (millis() - lastSMSCheck > 15000UL) { // check inbox every 15s
    lastSMSCheck = millis();
    checkSMSCommands();
  }

  if (millis() - lastSend < SEND_INTERVAL_MS) {
    return;
  }

  lastSend = millis();

  Serial.println(F("--- CYCLE ---"));

  if (!getGPS()) {
    Serial.println(F("NO GPS FIX"));
    return;
  }

  batteryLevel = getBatteryLevel();

  Serial.print(F("LAT: "));
  Serial.println(currentLat, 6);
  Serial.print(F("LON: "));
  Serial.println(currentLng, 6);
  Serial.print(F("SPD: "));
  Serial.println(currentSpeed, 2);
  Serial.print(F("HDG: "));
  Serial.println((int)currentHeading);
  Serial.print(F("BAT: "));
  Serial.println(batteryLevel);

  // Check geofence and send SMS if needed
  checkGeofenceAndAlert();

  snprintf(payloadBuffer, sizeof(payloadBuffer),
           "{\"device_id\":\"%s\",\"latitude\":%.6f,\"longitude\":%.6f,\"speed\":%.1f,\"heading\":%d,\"battery_level\":%d}",
           DEVICE_ID,
           currentLat,
           currentLng,
           currentSpeed,
           (int)currentHeading,
           batteryLevel);

  if (postToThingsBoard(payloadBuffer)) {
    Serial.println(F("POST OK"));
    consecutivePostFails = 0;
  } else {
    Serial.println(F("POST FAIL"));
    consecutivePostFails++;

    if (consecutivePostFails >= OFFLINE_FAIL_THRESHOLD) {
      if (lastOfflineSMS == 0 || millis() - lastOfflineSMS > OFFLINE_SMS_COOLDOWN_MS) {
        lastOfflineSMS = millis();
        char msg[200];
        snprintf(msg, sizeof(msg),
                 "ALERT: Tracker %s seems OFFLINE (HTTP errors). Last known at https://maps.google.com/?q=%.6f,%.6f",
                 DEVICE_ID,
                 currentLat,
                 currentLng);
        sendSMS(ALERT_PHONE, msg);
      }
    }
  }
}