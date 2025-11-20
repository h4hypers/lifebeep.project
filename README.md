# LifeBeep — Sound Detection Dashboard

**LifeBeep** is a real-time sound detection system with ESP32 microcontroller integration, single-page web dashboard, and email notification support. Designed for hearing-impaired individuals to monitor environmental sound levels.

---

## 📁 Project Structure

```
LifeBeep/
├── index.html          # Single-page dashboard (root level)
├── server.js           # Node.js Express backend + email notifications
├── package.json        # Dependencies and scripts
├── static/
│   ├── script.js       # Frontend logic with Chart.js integration
│   └── style.css       # Responsive single-page styling
└── README.md           # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Configure Email Notifications (Optional but Recommended)

Email notifications will be sent for **HIGH** level sound alerts.

#### **Step-by-Step Gmail Configuration:**

1. **Copy the example environment file:**
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Get Gmail App Password:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable **2-Step Verification** (if not already enabled)
   - Scroll down and click **App passwords**
   - Select **Mail** and **Other (Custom name)**
   - Type "LifeBeep" as the name
   - Click **Generate**
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
   - **IMPORTANT:** Remove spaces when pasting into `.env`

3. **Edit the `.env` file with your credentials:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   EMAIL_FROM=your_email@gmail.com
   EMAIL_TO=receiver1@gmail.com,receiver2@gmail.com
   ```

4. **Multiple Recipients (comma-separated, no spaces):**
   ```env
   EMAIL_TO=doctor@hospital.com,family@example.com,caregiver@email.com
   ```

#### **Alternative Email Providers:**

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

**Yahoo Mail:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
```

#### **Testing Email Configuration:**

1. Start the server: `npm start`
2. Send a test notification:
   ```powershell
   curl -X POST http://localhost:5000/notify -H "Content-Type: application/json" -d "{\"level\":\"High\",\"temperature\":25,\"humidity\":60}"
   ```
3. Check your email inbox (and spam folder)

#### **Security Notes:**

- ⚠️ **NEVER commit `.env` file to GitHub** (it's in `.gitignore`)
- Use App Passwords, not regular passwords
- Keep SMTP credentials secure
- The `.env` file stays on your local machine only

### 3. Start Server

```powershell
npm start
```

Server runs on `http://localhost:5000`

### 4. Open Dashboard

- Local: `http://localhost:5000`
- Network: `http://YOUR_IP_ADDRESS:5000` (find IP with `ipconfig`)

---

## 📊 Dashboard Features

- **4-Card Layout** (no scrolling):
  - **Decimal Level**: Real-time sound level (0-5 scale)
  - **Temperature & Humidity**: Environmental metrics from ESP32
  - **Log Viewer**: Timestamped event history with clear button
  - **Live Chart**: 30-sample rolling graph (Chart.js)

- **Header**:
  - LifeBeep logo (animated watch SVG)
  - Server IP input + connect button
  - Connection status indicator
  - Help modal button (?)
  - Settings button (⚙️)

- **Footer**: Team info and contact details

- **Responsive Design**: Single-page layout adapts to desktop/mobile

---

## 🔌 API Endpoints

### `POST /notify`
Receives sound alerts from ESP32.

**Request:**
```json
{
  "level": "High",          // "Low", "Medium", "High"
  "temperature": 25.5,      // °C (optional)
  "humidity": 60            // % (optional)
}
```

**Response:**
```json
{
  "status": "Notification received and logged"
}
```

**Email Trigger**: Sends email when `level: "High"` (if SMTP configured).

### `GET /logs`
Returns all stored notifications (in-memory array).

**Response:**
```json
[
  {
    "level": "High",
    "temperature": 26.2,
    "humidity": 58,
    "timestamp": "2025-01-15T10:30:45.123Z"
  }
]
```

### `POST /test_notification`
Test endpoint to verify email configuration.

**Request:**
```json
{
  "level": "High",
  "temperature": 25,
  "humidity": 60
}
```

---

## 🎛️ ESP32 Integration

### Hardware Components

| Component | Pin | Description |
|-----------|-----|-------------|
| Sound Sensor (Analog) | GPIO 34 (ADC) | Microphone/sound level input |
| DHT11 Sensor | GPIO 5 | Temperature & humidity |
| OLED Display (SSD1306) | I2C (GPIO 21/22) | 128x64 status display |
| LED Indicator | GPIO 25 | Visual alert |
| Buzzer | GPIO 26 | Audio alert |
| Vibration Motor | GPIO 27 | Haptic feedback |

### Arduino Firmware Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <DHT.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ========== CONFIGURATION ==========
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverIP = "192.168.1.100";  // Node server IP
const int serverPort = 5000;

#define SOUND_PIN 34      // Sound sensor (ADC)
#define LED_PIN 25
#define BUZZER_PIN 26
#define VIBRATOR_PIN 27
#define DHT_PIN 5
#define DHT_TYPE DHT11

// Sound thresholds (adjust based on sensor calibration)
const int LOW_THRESHOLD = 1500;
const int MEDIUM_THRESHOLD = 2500;
const int HIGH_THRESHOLD = 3500;

// ========== OBJECTS ==========
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
DHT dht(DHT_PIN, DHT_TYPE);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); // UTC+5:30 (India)

// ========== VARIABLES ==========
unsigned long lastCheckTime = 0;
unsigned long lastBlinkTime = 0;
unsigned long lastNotificationTime = 0;
const unsigned long CHECK_INTERVAL = 2000;    // Check sound every 2s
const unsigned long BLINK_INTERVAL = 3000;    // Blink eyes every 3s
const unsigned long NOTIFY_COOLDOWN = 30000;  // Send notification max once per 30s
bool eyesOpen = true;
String currentLevel = "Low";

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_PIN, OUTPUT);
  pinMode(SOUND_PIN, INPUT);
  
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATOR_PIN, LOW);
  
  // Initialize sensors
  u8g2.begin();
  dht.begin();
  
  // Connect WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  timeClient.begin();
  
  // Display startup
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(20, 30, "LifeBeep");
  u8g2.drawStr(15, 45, "Initializing...");
  u8g2.sendBuffer();
  delay(2000);
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long currentMillis = millis();
  timeClient.update();
  
  // Non-blocking sound check
  if (currentMillis - lastCheckTime >= CHECK_INTERVAL) {
    lastCheckTime = currentMillis;
    checkSoundLevel();
  }
  
  // Non-blocking eye blink animation
  if (currentMillis - lastBlinkTime >= BLINK_INTERVAL) {
    lastBlinkTime = currentMillis;
    eyesOpen = !eyesOpen;
  }
  
  // Update display
  updateDisplay();
}

// ========== SOUND LEVEL CHECK ==========
void checkSoundLevel() {
  int soundValue = analogRead(SOUND_PIN);
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  String prevLevel = currentLevel;
  
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
    activateAlerts(false, false, false);
  }
  
  // Send notification if level changed or cooldown passed
  if (currentLevel != "Silent" && 
      (currentLevel != prevLevel || (millis() - lastNotificationTime) > NOTIFY_COOLDOWN)) {
    sendNotification(currentLevel, temp, hum);
    lastNotificationTime = millis();
  }
  
  // Serial output
  Serial.printf("[%s] Sound: %d | Temp: %.1f°C | Humidity: %.0f%% | Level: %s\n",
                timeClient.getFormattedTime().c_str(), soundValue, temp, hum, currentLevel.c_str());
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
    
    String payload = "{\"level\":\"" + level + 
                     "\",\"temperature\":" + String(temp, 1) + 
                     ",\"humidity\":" + String(hum, 0) + "}";
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      Serial.printf("✓ Notification sent [%d]: %s\n", httpCode, level.c_str());
    } else {
      Serial.printf("✗ HTTP Error: %s\n", http.errorToString(httpCode).c_str());
    }
    
    http.end();
  } else {
    Serial.println("✗ WiFi Disconnected - Cannot send notification");
  }
}

// ========== UPDATE OLED DISPLAY ==========
void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  
  // Header
  u8g2.drawStr(35, 10, "LifeBeep");
  
  // Time
  String timeStr = timeClient.getFormattedTime();
  u8g2.drawStr(40, 22, timeStr.c_str());
  
  // Draw animated face
  if (currentLevel == "High") {
    drawWarningFace();
  } else {
    if (eyesOpen) {
      drawEyesOpen();
    } else {
      drawBlink();
    }
  }
  
  // Status text
  u8g2.setFont(u8g2_font_6x10_tr);
  String status = "Level: " + currentLevel;
  u8g2.drawStr(5, 60, status.c_str());
  
  u8g2.sendBuffer();
}

// ========== DRAW NORMAL EYES (OPEN) ==========
void drawEyesOpen() {
  u8g2.drawCircle(40, 38, 8);  // Left eye
  u8g2.drawCircle(88, 38, 8);  // Right eye
  u8g2.drawDisc(40, 38, 3);    // Pupil
  u8g2.drawDisc(88, 38, 3);
  u8g2.drawLine(20, 50, 108, 50);  // Mouth (smile)
}

// ========== DRAW BLINK ==========
void drawBlink() {
  u8g2.drawLine(30, 38, 50, 38);  // Left eye closed
  u8g2.drawLine(78, 38, 98, 38);  // Right eye closed
  u8g2.drawLine(20, 50, 108, 50); // Mouth
}

// ========== DRAW WARNING FACE ==========
void drawWarningFace() {
  u8g2.drawCircle(40, 38, 8);
  u8g2.drawCircle(88, 38, 8);
  u8g2.drawDisc(40, 38, 4);    // Wide pupils
  u8g2.drawDisc(88, 38, 4);
  u8g2.drawLine(20, 52, 108, 52);  // Mouth (straight/concerned)
  
  // Warning symbol (!)
  u8g2.drawStr(0, 38, "!");
  u8g2.drawStr(120, 38, "!");
}
```

### Required Libraries

Install via Arduino IDE Library Manager:

1. **U8g2** by Oliver — OLED display driver
2. **DHT sensor library** by Adafruit
3. **Adafruit Unified Sensor** (dependency for DHT)
4. **NTPClient** by Fabrice Weinberg — Network time

### Configuration Steps

1. **Update WiFi credentials**:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Set server IP** (your Node.js server host):
   ```cpp
   const char* serverIP = "192.168.1.100";  // Replace with actual IP
   ```

3. **Calibrate sound thresholds**:
   - Open Serial Monitor (115200 baud)
   - Observe raw analog values from sound sensor
   - Adjust `LOW_THRESHOLD`, `MEDIUM_THRESHOLD`, `HIGH_THRESHOLD` accordingly

4. **Flash to ESP32**:
   - Select board: **ESP32 Dev Module**
   - Upload via USB

### Troubleshooting

#### OLED Not Displaying
- **Symptom**: Blank screen or garbled text
- **Fix**: Add delay after `u8g2.begin()`:
  ```cpp
  u8g2.begin();
  delay(100);  // Give OLED time to initialize
  ```
- Check I2C connections (SDA=GPIO21, SCL=GPIO22)
- Verify OLED I2C address (usually `0x3C`)

#### GPIO 27 Vibration Motor Issues
**Symptom**: Motor doesn't vibrate or ESP32 won't boot

**Root Cause**: GPIO 27 is strapping pin used during boot. External loads can prevent booting.

**6 Solutions** (choose one):

1. **Use transistor driver circuit** (recommended):
   ```
   GPIO27 → 1kΩ resistor → NPN transistor base (2N2222)
   Transistor collector → Vibration motor (+)
   Motor (-) → GND
   Transistor emitter → GND
   ```

2. **Change to different pin**:
   ```cpp
   #define VIBRATOR_PIN 32  // or 33, 14, 13
   ```

3. **Add pull-down resistor**: 10kΩ between GPIO27 and GND

4. **Disconnect during boot**: Physically disconnect motor, boot ESP32, then reconnect

5. **Disable strapping check** (advanced):
   ```cpp
   rtc_gpio_deinit(GPIO_NUM_27);
   ```

6. **Use relay module**: Isolates motor from GPIO electrically

#### WiFi Connection Fails
- Check SSID/password spelling
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router
- Add timeout:
  ```cpp
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  ```

#### HTTP POST Errors
- Verify server is running (`npm start`)
- Confirm ESP32 and server on same network
- Check firewall settings (allow port 5000)
- Use Serial Monitor to see error codes:
  ```
  ✗ HTTP Error: connection refused  → Server not running
  ✗ HTTP Error: -1                  → Network timeout
  ```

#### DHT11 Returns NaN
- Check wiring (Data to GPIO5, VCC to 3.3V, GND to GND)
- Add 10kΩ pull-up resistor on data line
- Increase delay between reads (DHT11 max 1 read/2 seconds)

### Serial Monitor Output Example

```
Connecting to WiFi.........
WiFi Connected!
IP: 192.168.1.105

[12:34:56] Sound: 1200 | Temp: 24.5°C | Humidity: 58% | Level: Silent
[12:34:58] Sound: 2800 | Temp: 24.6°C | Humidity: 58% | Level: Medium
✓ Notification sent [200]: Medium
[12:35:00] Sound: 3800 | Temp: 24.6°C | Humidity: 57% | Level: High
✓ Notification sent [200]: High
```

---

## 🌐 HTTPS Deployment Options

### Scenario 1: Local LAN Only (HTTP)
- ESP32 and devices on same network
- Access via `http://192.168.x.x:5000`
- No HTTPS needed

### Scenario 2: Public Access via ngrok (HTTPS Tunnel)
1. Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)
2. Start tunnel:
   ```powershell
   ngrok http 5000
   ```
3. Use provided HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. **ESP32 limitation**: ESP32 still needs HTTP endpoint for local network. Use local IP for ESP32 POST requests.

### Scenario 3: Cloud Hosting (GitHub Pages + Serverless)
- **Frontend**: Deploy `index.html` + `static/` to GitHub Pages
- **Backend**: Deploy `server.js` to Heroku/Railway/Vercel with HTTPS
- **ESP32**: Update `serverIP` to cloud backend domain
- **HTTPS for ESP32**:
  ```cpp
  #include <WiFiClientSecure.h>
  WiFiClientSecure client;
  client.setInsecure();  // Skip certificate verification (not recommended for production)
  ```

---

## 🔒 GitHub Deployment - Security Checklist

### **Before Pushing to GitHub:**

1. **Verify `.gitignore` exists:**
   ```powershell
   Get-Content .gitignore
   ```
   Should contain: `.env`, `node_modules/`, `*.backup`

2. **Check for sensitive files:**
   ```powershell
   git status
   ```
   **NEVER commit:** `.env`, `node_modules/`, backup files

3. **Set environment variables on hosting platform:**
   - **Heroku:** `heroku config:set SMTP_USER=your_email@gmail.com`
   - **Vercel:** Add in project settings → Environment Variables
   - **Railway:** Add in project variables
   - **Netlify:** Add in Site settings → Build & deploy → Environment

4. **Include `.env.example` (safe to commit):**
   - This file shows what variables are needed
   - Does NOT contain actual credentials
   - Helps others set up the project

### **Files Safe to Commit:**
✅ `index.html`  
✅ `server.js`  
✅ `package.json`  
✅ `README.md`  
✅ `ESP32_code.ino`  
✅ `static/script.js`  
✅ `static/style.css`  
✅ `.env.example`  
✅ `.gitignore`  

### **Files to NEVER Commit:**
❌ `.env` (contains passwords!)  
❌ `node_modules/` (too large)  
❌ `*.backup` (backup files)  
❌ Any file with real credentials  

### **Quick GitHub Push Commands:**
```powershell
# First time setup
git init
git add .
git commit -m "Initial commit - LifeBeep Dashboard"
git branch -M main
git remote add origin https://github.com/yourusername/lifebeep.git
git push -u origin main

# Subsequent updates
git add .
git commit -m "Update dashboard features"
git push
```

---

## 🛠️ Troubleshooting

### Node.js Server Issues

**Port 5000 already in use:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Email not sending:**
- ✓ Check `.env` file exists in project root (not `.env.example`)
- ✓ Verify Gmail App Password (not regular password)
- ✓ Ensure 2-Factor Authentication is enabled on Gmail
- ✓ Check `EMAIL_TO` format is correct (comma-separated, no spaces)
- ✓ Check SMTP logs in terminal for error messages
- ✓ Test SMTP credentials at [https://www.smtper.net/](https://www.smtper.net/)
- ✓ Check spam/junk folder
- ✓ Try removing spaces from App Password: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

**Common Email Errors:**

| Error | Solution |
|-------|----------|
| "Invalid login" | Use Gmail App Password, not regular password |
| "Connection timeout" | Check firewall, try port 465 with SMTP_SECURE=true |
| "self signed certificate" | Add to server.js: `tls: { rejectUnauthorized: false }` |
| No emails received | Check spam folder, verify EMAIL_TO addresses |

### Dashboard Issues

**Can't connect to server:**
- Verify server is running (`npm start` shows "Server running on port 5000")
- Check browser console for errors (F12)
- Confirm IP address is correct (use `ipconfig` on server machine)
- Test API: `curl http://localhost:5000/logs`

**Chart not displaying:**
- Check browser console for Chart.js errors
- Ensure internet connection (Chart.js loads from CDN)
- Try hard refresh (Ctrl+Shift+R)

**Logs not clearing:**
- Click "Clear Logs" button
- Logs are in-memory (will reset when server restarts)

---

## 📱 Dashboard Usage

### Header Controls

- **Server IP Input**: Enter IP address of machine running `server.js`
- **Connect Button**: Establishes connection (stores IP in localStorage)
- **Status Indicator**: 
  - 🔴 Red = Disconnected
  - 🟢 Green = Connected
- **Help Button (?)**: Opens documentation modal
- **Settings (⚙️)**: Future feature (notification preferences)

### Reading the Cards

- **Decimal Level**: Current sound intensity (0-5 scale)
- **Temperature**: °C from DHT11 sensor
- **Humidity**: % from DHT11 sensor (shown as sub-value)
- **Logs**: Chronological list of all events with timestamps
- **Graph**: 30-sample rolling window (blue = sound, red = temperature)

### Simulated Data Mode

When ESP32 is not connected, dashboard shows simulated data every 3 seconds for testing:
- Level: Random 0-5
- Temperature: Random 22-28°C
- Humidity: Random 40-70%

### Keyboard Shortcuts

- **Escape**: Close modals
- **F12**: Open browser console (for debugging)

---

## 👥 Team

**Project Name**: LifeBeep  
**Version**: 1.0  
**Guided by**: [Faculty Name]  
**Team**:
- Member 1
- Member 2
- Member 3

**Contact**: lifebeeph4@gmail.com

---

## 📄 License

© 2025 LifeBeep. All rights reserved.

---

## 🔮 Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL) for persistent logs
- [ ] User authentication and multi-device support
- [ ] SMS notifications via Twilio
- [ ] Historical data export (CSV/JSON)
- [ ] Machine learning for sound pattern recognition
- [ ] Mobile app (React Native)
- [ ] Cloud sync across devices
- [ ] Custom alert thresholds via settings panel

---

**Empowering the hearing impaired with smart sound detection** 💙
