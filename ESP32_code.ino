/*
 * LifeBeep ESP32 Sound Detection System
 * Sound-Activated Cozmo Face with Web Server Integration
 *
 * This code uses a NON-BLOCKING loop structure to ensure
 * high reaction sensitivity.
 *
 * ALERTS:
 * - LED (Pin 25): ON for 10 seconds.
 * - OLED (Warning Face): ON for 10 seconds.
 * - Buzzer (Pin 26): ON for 5 seconds.
 * - Vibration Motor (Pin 27): ON for 5 seconds (DIRECT CONNECT).
 *
 * UPDATES:
 * - Increased Sensitivity: Threshold lowered to 2954 (approx 2.3V).
 * - Web Server: Hosts HTTP server for dashboard to fetch sensor data.
 */

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include "DHT.h"

// ========== CONFIGURATION ==========
// WiFi Credentials - UPDATE THESE
const char* ssid = "Oppo A77s";
const char* password = "9080061674";

// --- HARDWARE CONFIGURATION ---
// Sound Sensor
const int ADC_PIN = 34; // Connect to the output of your filter circuit

// Alert Pins
const int LED_PIN = 25;       // Normal LED
const int BUZZER_PIN = 26;    // Buzzer
const int VIBRATOR_PIN = 27;  // Vibration Motor (+) -> Pin 27, Motor (-) -> GND

// --- DHT TEMPERATURE SENSOR CONFIGURATION ---
#define DHTPIN 5      // Connect DHT11 Data to ESP32 GPIO 5
#define DHTTYPE DHT11 // Sensor type
DHT dht(DHTPIN, DHTTYPE); // Initialize DHT sensor

// --- NTP Configuration ---
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); // IST (UTC+5:30)

// --- Web Server ---
WebServer server(80); // HTTP server on port 80

// --- GLOBAL SENSOR DATA ---
float currentTemperature = -99.9;
float currentHumidity = -99.9;
int currentSoundLevel = 0;
String currentStatus = "Normal"; // "Normal" or "Detected"
bool notificationSent = false; // Track if notification already sent
unsigned long detectionTimestamp = 0; // When sound was detected

// --- U8g2 Constructor ---
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// --- ALERT THRESHOLDS & TIMERS ---
const int SOUND_THRESHOLD = 2954; // ADC value for High sound (approx 2.3V)

// How long the warning face/LED stay on (in milliseconds)
const long TOTAL_ALERT_DURATION = 10000; // 10 seconds
// How long the Buzzer/Motor stay on (in milliseconds)
const long PARTIAL_ALERT_DURATION = 5000; // 5 seconds

// --- ANIMATION TIMING ---
#define EYES_OPEN_TIME 2500 // Keep eyes open for 2.5 seconds normally
#define BLINK_TIME 200      // Quick blink duration

// --- NON-BLOCKING STATE VARIABLES ---
bool isAlertActive = false;
unsigned long alertStartTime = 0;
bool isBlinking = false;
unsigned long lastEyeEventTime = 0;
unsigned long lastGazeChangeTime = 0;
const long GAZE_CHANGE_INTERVAL = 3000; // Look around every 3 seconds

// --- Eye Animation State ---
enum EyeDirection { CENTER, LEFT, RIGHT };
EyeDirection currentEyeDirection = CENTER;

// --- SENSOR READING TIMERS ---
unsigned long lastTempReadTime = 0;
const long TEMP_READ_INTERVAL = 5000; // Read temp every 5 seconds

// --- Function Prototypes ---
void displayTime();
void displayTemp();
void drawEyesOpen(EyeDirection direction); 
void drawBlink();
void drawWarning();
void lookAround(EyeDirection direction);
void handleRoot();
void handleData();

void setup(void) {
  Serial.begin(115200);
  Serial.println("LifeBeep Starting...");

  // Initialize Sound Sensor Pin as Input
  pinMode(ADC_PIN, INPUT);
  
  // Initialize Alert Pins as Output
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  
  // Make sure all alerts are off
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATOR_PIN, LOW);

  // Initialize DHT sensor
  dht.begin();

  // Seed the random number generator for eye movements
  randomSeed(analogRead(0));

  // Start the U8g2 display
  u8g2.begin();
  u8g2.setDrawColor(1);

  // --- Initialize Wi-Fi ---
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Start NTP Client
    timeClient.begin();
    Serial.println("Fetching time...");
    if(timeClient.forceUpdate()) {
      Serial.println("Time synced!");
    } else {
      Serial.println("Time sync failed (will retry in loop).");
    }

    // --- Setup Web Server Routes ---
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.begin();
    Serial.println("Web Server started on port 80");
    Serial.print("Access dashboard at: http://");
    Serial.println(WiFi.localIP());
    
  } else {
    Serial.println("\nWiFi connection failed!");
  }

  Serial.println("Setup complete.");
  lastEyeEventTime = millis();
}

// =======================
// === MAIN LOOP ===
// =======================
void loop(void) {
  unsigned long currentTime = millis();
  
  // Handle web server requests
  server.handleClient();
  
  // --- 1. Read Sensors ---
  currentSoundLevel = analogRead(ADC_PIN);
  
  // Update Time
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.update();
  }

  // Update Temperature & Humidity (every 5 seconds)
  if (currentTime - lastTempReadTime > TEMP_READ_INTERVAL) {
    float newTemp = dht.readTemperature();
    float newHum = dht.readHumidity();
    if (!isnan(newTemp)) currentTemperature = newTemp;
    if (!isnan(newHum)) currentHumidity = newHum;
    lastTempReadTime = currentTime;
  }

  // --- 2. Check for New Sound Triggers ---
  if (currentSoundLevel > SOUND_THRESHOLD && !isAlertActive) {
    Serial.print("HIGH Sound Alert! Value: ");
    Serial.println(currentSoundLevel);
    
    currentStatus = "Detected"; // Update status for web server
    notificationSent = false; // Reset flag for new detection
    detectionTimestamp = currentTime; // Record exact detection time
    
    // Start the 10-second alert
    isAlertActive = true;
    alertStartTime = currentTime;
    
    // Turn on ALL alerts
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(VIBRATOR_PIN, HIGH);
  }

  // --- 3. Update Display ---
  u8g2.clearBuffer();
  displayTime();
  displayTemp();

  if (isAlertActive) {
    // --- STATE: ALERT ---
    drawWarning();
    
    // Check if 5-second partial alert is over
    if (currentTime - alertStartTime >= PARTIAL_ALERT_DURATION) {
      digitalWrite(BUZZER_PIN, LOW);
      digitalWrite(VIBRATOR_PIN, LOW);
    }
    
    // Check if 10-second total alert is over
    if (currentTime - alertStartTime >= TOTAL_ALERT_DURATION) {
      Serial.println("Alert finished. Resetting.");
      isAlertActive = false;
      currentStatus = "Normal"; // Reset status
      notificationSent = false; // Reset for next detection
      digitalWrite(LED_PIN, LOW);
    }
    
  } else {
    // --- STATE: NORMAL ---
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(VIBRATOR_PIN, LOW);

    // Handle blinking animation
    if (isBlinking) {
      drawBlink();
      if (currentTime - lastEyeEventTime >= BLINK_TIME) {
        isBlinking = false;
        lastEyeEventTime = currentTime;
      }
    } else {
      // Handle gazing around
      if (currentTime - lastGazeChangeTime > GAZE_CHANGE_INTERVAL) {
        int randomLook = random(0, 5);
        if (randomLook == 3) currentEyeDirection = LEFT;
        else if (randomLook == 4) currentEyeDirection = RIGHT;
        else currentEyeDirection = CENTER;
        lastGazeChangeTime = currentTime;
      }
      drawEyesOpen(currentEyeDirection); 
      
      // Check if it's time to blink
      if (currentTime - lastEyeEventTime >= EYES_OPEN_TIME) {
        isBlinking = true;
        lastEyeEventTime = currentTime;
      }
    }
  }
  
  u8g2.sendBuffer();
}

// =======================
// === WEB SERVER HANDLERS ===
// =======================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>LifeBeep ESP32</title></head><body>";
  html += "<h1>LifeBeep ESP32 Status</h1>";
  html += "<p><a href='/data'>Get JSON Data</a></p>";
  html += "<p>Status: " + currentStatus + "</p>";
  html += "<p>Sound Level: " + String(currentSoundLevel) + "</p>";
  html += "<p>Temperature: " + String(currentTemperature, 1) + " °C</p>";
  html += "<p>Humidity: " + String(currentHumidity, 1) + " %</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleData() {
  String json = "{";
  json += "\"status\":\"" + currentStatus + "\",";
  json += "\"soundLevel\":" + String(currentSoundLevel) + ",";
  json += "\"temperature\":" + String(currentTemperature, 1) + ",";
  json += "\"humidity\":" + String(currentHumidity, 1) + ",";
  json += "\"threshold\":" + String(SOUND_THRESHOLD) + ",";
  json += "\"notificationSent\":" + String(notificationSent ? "true" : "false") + ",";
  json += "\"detectionTime\":" + String(detectionTimestamp);
  json += "}";
  
  // Mark notification as sent after first API call during alert
  if (currentStatus == "Detected" && !notificationSent) {
    notificationSent = true;
  }
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// =======================
// === DISPLAY FUNCTIONS ===
// =======================
void displayTime() {
  u8g2.setDrawColor(1);
  u8g2.setFont(u8g2_font_5x7_tf); 
  
  if (WiFi.status() == WL_CONNECTED) {
    String formattedTime = timeClient.getFormattedTime();
    u8g2.drawStr(1, 7, formattedTime.c_str());
  } else {
    u8g2.drawStr(1, 7, "No WiFi"); 
  }
}

void displayTemp() {
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x7_tf);
    
    String tempStr;
    if (currentTemperature > -99) { 
      tempStr = String(currentTemperature, 1) + " C"; 
    } else {
      tempStr = "DHT Err";
    }

    int x = u8g2.getWidth() - u8g2.getStrWidth(tempStr.c_str()) - 1;
    int y = 7;
    u8g2.drawStr(x, y, tempStr.c_str());
}

void lookAround(EyeDirection direction) {
  int eyeY = 32;
  int leftEyeX = 32;
  int rightEyeX = 96;
  int outerRadius = 14;
  int innerRadius = 5;
  int pupilOffset = 5;

  int leftPupilX = leftEyeX;
  int rightPupilX = rightEyeX;

  if (direction == LEFT) {
    leftPupilX -= pupilOffset;
    rightPupilX -= pupilOffset;
  } else if (direction == RIGHT) {
    leftPupilX += pupilOffset;
    rightPupilX += pupilOffset;
  }

  u8g2.setDrawColor(1);
  u8g2.drawCircle(leftEyeX, eyeY, outerRadius);
  u8g2.drawDisc(leftPupilX, eyeY, innerRadius);
  u8g2.drawCircle(rightEyeX, eyeY, outerRadius);
  u8g2.drawDisc(rightPupilX, eyeY, innerRadius);
}

void drawEyesOpen(EyeDirection direction) {
  lookAround(direction); 
}

void drawBlink() {
  int eyeY = 32;
  int leftEyeX = 32;
  int rightEyeX = 96;
  int outerRadius = 14;
  int eyelidWidth = outerRadius * 2;
  
  u8g2.setDrawColor(1);
  u8g2.drawHLine(leftEyeX - outerRadius, eyeY, eyelidWidth);
  u8g2.drawHLine(leftEyeX - outerRadius, eyeY + 1, eyelidWidth);
  u8g2.drawHLine(rightEyeX - outerRadius, eyeY, eyelidWidth);
  u8g2.drawHLine(rightEyeX - outerRadius, eyeY + 1, eyelidWidth);
}

void drawWarning() {
  int centerEyeY = 32;
  int triangleHeight = 40; 
  int triangleWidth = 40; 
  
  int leftApexY = centerEyeY - (triangleHeight / 2) - 5;
  int leftBaseY = centerEyeY + (triangleHeight / 2) - 5;
  
  int symbolW = 5;
  int bodyH = 15;
  int dotH = 5;
  int bodyY = leftApexY + 10;
  int dotY = bodyY + bodyH + 3;
  
  // Left Eye
  int leftCenterX = 32;
  int leftBaseX1 = leftCenterX - (triangleWidth / 2);
  int leftBaseX2 = leftCenterX + (triangleWidth / 2);
  
  u8g2.setDrawColor(1); 
  u8g2.drawTriangle(leftCenterX, leftApexY, leftBaseX1, leftBaseY, leftBaseX2, leftBaseY);
  
  u8g2.setDrawColor(0); 
  int leftBodyX = leftCenterX - (symbolW / 2); 
  u8g2.drawBox(leftBodyX, bodyY, symbolW, bodyH);
  u8g2.drawBox(leftBodyX, dotY, symbolW, dotH);

  // Right Eye
  int rightCenterX = 96;
  int rightBaseX1 = rightCenterX - (triangleWidth / 2);
  int rightBaseX2 = rightCenterX + (triangleWidth / 2);
  
  u8g2.setDrawColor(1); 
  u8g2.drawTriangle(rightCenterX, leftApexY, rightBaseX1, leftBaseY, rightBaseX2, leftBaseY);
  
  u8g2.setDrawColor(0); 
  int rightBodyX = rightCenterX - (symbolW / 2); 
  u8g2.drawBox(rightBodyX, bodyY, symbolW, bodyH);
  u8g2.drawBox(rightBodyX, dotY, symbolW, dotH);
  
  // WARNING Text
  u8g2.setDrawColor(1);
  u8g2.setFont(u8g2_font_helvB10_tr); 
  
  const char* warningText = "WARNING!!!";
  int textWidth = u8g2.getStrWidth(warningText);
  int textX = (u8g2.getWidth() - textWidth) / 2;
  int textY = 60;
  u8g2.drawStr(textX, textY, warningText);
  
  u8g2.setDrawColor(1);
}
