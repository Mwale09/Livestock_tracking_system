/*
 * GPS Location Test Sketch
 * 
 * This sketch continuously reads GPS data and displays location
 * Use this to verify GPS is working before deploying full tracker
 * 
 * Wiring:
 * - SIM808 TX → Arduino Pin 7
 * - SIM808 RX → Arduino Pin 8
 * - SIM808 PWR_KEY → Arduino Pin 4
 * - GPS Antenna connected to SIM808
 */

#include <SoftwareSerial.h>
#include <TinyGPS++.h>

#define SIM808_TX 7
#define SIM808_RX 8
#define SIM808_PWR 4

SoftwareSerial sim808(SIM808_TX, SIM808_RX);
TinyGPSPlus gps;

unsigned long lastDisplay = 0;
bool gpsInitialized = false;

void setup() {
  Serial.begin(9600);
  sim808.begin(9600);
  pinMode(SIM808_PWR, OUTPUT);
  
  Serial.println(F("\n========================================"));
  Serial.println(F("    GPS Location Test"));
  Serial.println(F("========================================\n"));
  
  // Power on SIM808
  Serial.println(F("Powering on SIM808..."));
  digitalWrite(SIM808_PWR, HIGH);
  delay(2000);
  digitalWrite(SIM808_PWR, LOW);
  delay(3000);
  
  // Initialize GPS
  Serial.println(F("Initializing GPS..."));
  sim808.println("AT");
  delay(1000);
  sim808.println("AT+CGNSPWR=1");  // Power on GPS
  delay(1000);
  
  gpsInitialized = true;
  
  Serial.println(F("\n========================================"));
  Serial.println(F("GPS powered on!"));
  Serial.println(F("Move GPS antenna near window or outdoors"));
  Serial.println(F("First fix may take 2-5 minutes..."));
  Serial.println(F("========================================\n"));
  
  Serial.println(F("Waiting for GPS data...\n"));
}

void loop() {
  // Read GPS data
  while (sim808.available() > 0) {
    char c = sim808.read();
    gps.encode(c);
  }
  
  // Display GPS info every 2 seconds
  if (millis() - lastDisplay >= 2000) {
    lastDisplay = millis();
    displayGPSInfo();
  }
}

void displayGPSInfo() {
  Serial.println(F("========================================"));
  
  // Location
  if (gps.location.isValid()) {
    Serial.println(F("✓ GPS FIX ACQUIRED!"));
    Serial.println(F("----------------------------------------"));
    Serial.print(F("Latitude:  "));
    Serial.println(gps.location.lat(), 6);
    Serial.print(F("Longitude: "));
    Serial.println(gps.location.lng(), 6);
    
    // Google Maps link
    Serial.print(F("Maps Link: https://maps.google.com/?q="));
    Serial.print(gps.location.lat(), 6);
    Serial.print(F(","));
    Serial.println(gps.location.lng(), 6);
  } else {
    Serial.println(F("⚠ Waiting for GPS fix..."));
    Serial.println(F("----------------------------------------"));
    Serial.println(F("Status: Searching for satellites"));
    Serial.print(F("Satellites: "));
    if (gps.satellites.isValid()) {
      Serial.println(gps.satellites.value());
    } else {
      Serial.println(F("Unknown"));
    }
  }
  
  // Altitude
  if (gps.altitude.isValid()) {
    Serial.print(F("Altitude:  "));
    Serial.print(gps.altitude.meters());
    Serial.println(F(" meters"));
  }
  
  // Speed
  if (gps.speed.isValid()) {
    Serial.print(F("Speed:     "));
    Serial.print(gps.speed.kmph());
    Serial.println(F(" km/h"));
  }
  
  // Course/Heading
  if (gps.course.isValid()) {
    Serial.print(F("Heading:   "));
    Serial.print(gps.course.deg());
    Serial.println(F(" degrees"));
  }
  
  // Satellites
  if (gps.satellites.isValid()) {
    Serial.print(F("Satellites: "));
    Serial.println(gps.satellites.value());
  }
  
  // HDOP (accuracy)
  if (gps.hdop.isValid()) {
    Serial.print(F("HDOP:      "));
    Serial.print(gps.hdop.hdop());
    Serial.print(F(" ("));
    
    double hdop = gps.hdop.hdop();
    if (hdop < 2.0) {
      Serial.print(F("Excellent"));
    } else if (hdop < 5.0) {
      Serial.print(F("Good"));
    } else if (hdop < 10.0) {
      Serial.print(F("Moderate"));
    } else {
      Serial.print(F("Poor"));
    }
    Serial.println(F(")"));
  }
  
  // Date and Time
  if (gps.date.isValid() && gps.time.isValid()) {
    Serial.print(F("DateTime:  "));
    Serial.print(gps.date.year());
    Serial.print(F("-"));
    if (gps.date.month() < 10) Serial.print(F("0"));
    Serial.print(gps.date.month());
    Serial.print(F("-"));
    if (gps.date.day() < 10) Serial.print(F("0"));
    Serial.print(gps.date.day());
    Serial.print(F(" "));
    if (gps.time.hour() < 10) Serial.print(F("0"));
    Serial.print(gps.time.hour());
    Serial.print(F(":"));
    if (gps.time.minute() < 10) Serial.print(F("0"));
    Serial.print(gps.time.minute());
    Serial.print(F(":"));
    if (gps.time.second() < 10) Serial.print(F("0"));
    Serial.print(gps.time.second());
    Serial.println(F(" UTC"));
  }
  
  // Characters processed
  Serial.println(F("----------------------------------------"));
  Serial.print(F("Chars Processed: "));
  Serial.print(gps.charsProcessed());
  Serial.print(F(" | Failed checksums: "));
  Serial.println(gps.failedChecksum());
  
  Serial.println(F("========================================\n"));
  
  // Helpful message if no fix
  if (!gps.location.isValid()) {
    Serial.println(F("💡 Tips:"));
    Serial.println(F("   - Place GPS antenna near window"));
    Serial.println(F("   - Ensure clear view of sky"));
    Serial.println(F("   - First fix takes 2-5 minutes"));
    Serial.println(F("   - Subsequent fixes are faster\n"));
  }
}
