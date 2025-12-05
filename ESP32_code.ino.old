/*
 * LifeBeep - ESP32 Sound Detection System
 * 
 * Hardware Components:
 * - ESP32 Development Board
 * - Sound Sensor (Analog) - GPIO 34 (ADC)
 * - DHT11 Temperature & Humidity Sensor - GPIO 5
 * - OLED Display SSD1306 128x64 - I2C (GPIO 21/22)
 * - LED Indicator - GPIO 25
 * - Buzzer - GPIO 26
 * - Vibration Motor - GPIO 27
 * 
 * Required Libraries (Install via Arduino IDE Library Manager):
 * 1. U8g2 by Oliver
 * 2. DHT sensor library by Adafruit
 * 3. Adafruit Unified Sensor
 * 4. NTPClient by Fabrice Weinberg
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <DHT.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ========== CONFIGURATION ==========
// WiFi Credentials - UPDATE THESE
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// Server Configuration - UPDATE THIS
const char* serverIP = "192.168.1.100";  // Replace with your Node.js server IP
const int serverPort = 5000;

// Pin Definitions
#define SOUND_PIN 34      // Sound sensor (ADC input)
#define LED_PIN 25        // LED indicator
#define BUZZER_PIN 26     // Buzzer alert
#define VIBRATOR_PIN 27   // Vibration motor (see GPIO27 troubleshooting if issues)
#define DHT_PIN 5         // DHT11 sensor
#define DHT_TYPE DHT11    // DHT sensor type

// Sound thresholds - CALIBRATE THESE based on your sensor
// Open Serial Monitor and observe analog values, then adjust
const int LOW_THRESHOLD = 1500;
const int MEDIUM_THRESHOLD = 2500;
const int HIGH_THRESHOLD = 3500;

// ========== OBJECTS ==========
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
DHT dht(DHT_PIN, DHT_TYPE);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); // UTC+5:30 (India time)

// ========== VARIABLES ==========
unsigned long lastCheckTime = 0;
unsigned long lastBlinkTime = 0;
unsigned long lastNotificationTime = 0;
const unsigned long CHECK_INTERVAL = 2000;    // Check sound every 2 seconds
const unsigned long BLINK_INTERVAL = 3000;    // Blink eyes animation every 3 seconds
const unsigned long NOTIFY_COOLDOWN = 30000;  // Send notification max once per 30 seconds
bool eyesOpen = true;
String currentLevel = "Low";

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("   LifeBeep ESP32 Starting...");
  Serial.println("=================================\n");
  
  // Initialize GPIO pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(SOUND_PIN, INPUT);
  
  // Turn off all outputs initially
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATOR_PIN, LOW);
  
  // Initialize sensors
  Serial.println("Initializing OLED display...");
  u8g2.begin();
  delay(100); // Give OLED time to initialize
  
  Serial.println("Initializing DHT11 sensor...");
  dht.begin();
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Server: http://");
    Serial.print(serverIP);
    Serial.print(":");
    Serial.println(serverPort);
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check your WiFi credentials");
  }
  
  // Start NTP time client
  Serial.println("Starting NTP time client...");
  timeClient.begin();
  
  // Display startup animation on OLED
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.drawStr(30, 30, "LifeBeep");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(15, 50, "Initializing...");
  u8g2.sendBuffer();
  delay(2000);
  
  Serial.println("\n✓ System Ready!");
  Serial.println("=================================\n");
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long currentMillis = millis();
  timeClient.update();
  
  // Non-blocking sound level check
  if (currentMillis - lastCheckTime >= CHECK_INTERVAL) {
    lastCheckTime = currentMillis;
    checkSoundLevel();
  }
  
  // Non-blocking eye blink animation
  if (currentMillis - lastBlinkTime >= BLINK_INTERVAL) {
    lastBlinkTime = currentMillis;
    eyesOpen = !eyesOpen;
  }
  
  // Update OLED display
  updateDisplay();
}

// ========== SOUND LEVEL CHECK ==========
void checkSoundLevel() {
  int soundValue = analogRead(SOUND_PIN);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  // Check for DHT sensor read errors
  if (isnan(temp) || isnan(hum)) {
    Serial.println("✗ Warning: Failed to read from DHT sensor!");
    temp = 0;
    hum = 0;
  }
  
  String prevLevel = currentLevel;
  
  // Determine alert level based on sound threshold
  if (soundValue > HIGH_THRESHOLD) {
    currentLevel = "High";
    activateAlerts(true, true, true);  // LED + Buzzer + Vibrator
  } else if (soundValue > MEDIUM_THRESHOLD) {
    currentLevel = "Medium";
    activateAlerts(true, true, false);  // LED + Buzzer only
  } else if (soundValue > LOW_THRESHOLD) {
    currentLevel = "Low";
    activateAlerts(true, false, false);  // LED only
  } else {
    currentLevel = "Silent";
    activateAlerts(false, false, false); // All off
  }
  
  // Send notification if level changed or cooldown period passed
  if (currentLevel != "Silent" && 
      (currentLevel != prevLevel || (millis() - lastNotificationTime) > NOTIFY_COOLDOWN)) {
    sendNotification(currentLevel, temp, hum);
    lastNotificationTime = millis();
  }
  
  // Serial output for monitoring
  Serial.printf("[%s] Sound: %4d | Temp: %5.1f°C | Humidity: %3.0f%% | Level: %s\n",
                timeClient.getFormattedTime().c_str(), 
                soundValue, temp, hum, currentLevel.c_str());
}

// ========== ACTIVATE ALERTS ==========
void activateAlerts(bool led, bool buzzer, bool vibrator) {
  digitalWrite(LED_PIN, led ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, buzzer ? HIGH : LOW);
  digitalWrite(VIBRATOR_PIN, vibrator ? HIGH : LOW);
}

// ========== SEND HTTP NOTIFICATION ==========
void sendNotification(String level, float temp, float hum) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "http://" + String(serverIP) + ":" + String(serverPort) + "/notify";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Build JSON payload
    String payload = "{\"level\":\"" + level + 
                     "\",\"temperature\":" + String(temp, 1) + 
                     ",\"humidity\":" + String(hum, 0) + "}";
    
    Serial.println("Sending notification to server...");
    Serial.println("URL: " + url);
    Serial.println("Payload: " + payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      Serial.printf("✓ HTTP Response Code: %d\n", httpCode);
      if (httpCode == HTTP_CODE_OK) {
        String response = http.getString();
        Serial.println("✓ Notification sent successfully!");
        Serial.println("Server response: " + response);
      }
    } else {
      Serial.printf("✗ HTTP Error: %s\n", http.errorToString(httpCode).c_str());
      Serial.println("Possible causes:");
      Serial.println("  - Server is not running");
      Serial.println("  - Wrong server IP or port");
      Serial.println("  - Firewall blocking connection");
    }
    
    http.end();
  } else {
    Serial.println("✗ WiFi Disconnected - Cannot send notification");
    Serial.println("Attempting to reconnect...");
    WiFi.reconnect();
  }
}

// ========== UPDATE OLED DISPLAY ==========
void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  
  // Header - LifeBeep title
  u8g2.drawStr(35, 10, "LifeBeep");
  
  // Display current time
  String timeStr = timeClient.getFormattedTime();
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(40, 22, timeStr.c_str());
  
  // Draw animated face based on alert level
  if (currentLevel == "High") {
    drawWarningFace();
  } else {
    if (eyesOpen) {
      drawEyesOpen();
    } else {
      drawBlink();
    }
  }
  
  // Display status text at bottom
  u8g2.setFont(u8g2_font_6x10_tr);
  String status = "Level: " + currentLevel;
  u8g2.drawStr(5, 60, status.c_str());
  
  u8g2.sendBuffer();
}

// ========== DRAW NORMAL EYES (OPEN) ==========
void drawEyesOpen() {
  // Left eye
  u8g2.drawCircle(40, 38, 8);
  u8g2.drawDisc(40, 38, 3);    // Pupil
  
  // Right eye
  u8g2.drawCircle(88, 38, 8);
  u8g2.drawDisc(88, 38, 3);    // Pupil
  
  // Smile mouth
  u8g2.drawLine(20, 50, 108, 50);
}

// ========== DRAW BLINK (EYES CLOSED) ==========
void drawBlink() {
  // Left eye closed (horizontal line)
  u8g2.drawLine(30, 38, 50, 38);
  
  // Right eye closed (horizontal line)
  u8g2.drawLine(78, 38, 98, 38);
  
  // Smile mouth
  u8g2.drawLine(20, 50, 108, 50);
}

// ========== DRAW WARNING FACE (HIGH ALERT) ==========
void drawWarningFace() {
  // Wide open eyes with larger pupils (concerned look)
  u8g2.drawCircle(40, 38, 8);
  u8g2.drawCircle(88, 38, 8);
  u8g2.drawDisc(40, 38, 4);    // Larger pupils
  u8g2.drawDisc(88, 38, 4);
  
  // Straight/concerned mouth
  u8g2.drawLine(20, 52, 108, 52);
  
  // Warning symbols (!) on both sides
  u8g2.drawStr(0, 38, "!");
  u8g2.drawStr(120, 38, "!");
}

/*
 * ========== TROUBLESHOOTING ==========
 * 
 * 1. OLED Not Displaying:
 *    - Check I2C connections: SDA=GPIO21, SCL=GPIO22
 *    - Verify OLED I2C address (usually 0x3C)
 *    - Add delay(100) after u8g2.begin()
 * 
 * 2. GPIO 27 Vibration Motor Issues:
 *    - GPIO 27 is a strapping pin, can cause boot issues
 *    - Solutions:
 *      a) Use transistor driver circuit (recommended)
 *      b) Change to GPIO 32, 33, 14, or 13
 *      c) Add 10kΩ pull-down resistor between GPIO27 and GND
 *      d) Disconnect motor during boot, reconnect after
 * 
 * 3. WiFi Connection Fails:
 *    - Check SSID and password spelling
 *    - Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
 *    - Move ESP32 closer to router
 * 
 * 4. HTTP POST Errors:
 *    - Verify Node.js server is running (npm start)
 *    - Confirm ESP32 and server on same network
 *    - Check firewall settings (allow port 5000)
 *    - Test with: curl http://SERVER_IP:5000/logs
 * 
 * 5. DHT11 Returns NaN:
 *    - Check wiring (Data=GPIO5, VCC=3.3V, GND=GND)
 *    - Add 10kΩ pull-up resistor on data line
 *    - Increase delay between reads (max 1 read per 2 seconds)
 * 
 * 6. Sound Sensor Calibration:
 *    - Open Serial Monitor (115200 baud)
 *    - Observe "Sound:" values in different environments
 *    - Adjust LOW_THRESHOLD, MEDIUM_THRESHOLD, HIGH_THRESHOLD constants
 *    - Typical quiet room: 500-1000
 *    - Typical conversation: 1500-2500
 *    - Loud noise: 3000+
 */
