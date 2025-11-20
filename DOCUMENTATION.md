# LifeBeep - Complete Documentation

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [EmailJS Setup](#emailjs-setup)
3. [ESP32 Hardware Setup](#esp32-hardware-setup)
4. [Full Project Documentation](#full-documentation)

---

## ⚡ Quick Start <a id="quick-start"></a>

### Install Dependencies
```powershell
npm install
```

### Start Server
```powershell
npm start
```

### Open Dashboard
Browser: **http://localhost:5000**

---

## 📧 EmailJS Setup <a id="emailjs-setup"></a>

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up (FREE)
3. Verify email

### Step 2: Add Gmail Service
1. Dashboard → "Email Services" → "Add New Service"
2. Select "Gmail"
3. Connect with **lifebeeph4@gmail.com**
4. Copy **Service ID** (e.g., `service_abc1234`)

### Step 3: Create Email Template
1. Dashboard → "Email Templates" → "Create New Template"
2. Template Name: `LifeBeep_Test_Notification`
3. Subject: `{{subject}}`
4. Content:
```
Hello {{to_name}},

{{message}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sound Level: {{sound_level}}
Temperature: {{temperature}}
Humidity: {{humidity}}
Alert Type: {{alert_type}}
Timestamp: {{timestamp}}
System Status: {{system_status}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated message from the LifeBeep Sound Detection System.

Best regards,
{{from_name}}
```
5. Copy **Template ID** (e.g., `template_xyz5678`)

### Step 4: Get Public Key
1. Dashboard → "Account" (top-right)
2. Copy **Public Key** (e.g., `user_abcdefg123456`)

### Step 5: Update Configuration
Edit `email-config.js`:
```javascript
const EMAIL_CONFIG = {
  emailjs: {
    enabled: true,
    serviceId: 'service_abc1234',    // Your Service ID
    templateId: 'template_xyz5678',  // Your Template ID
    publicKey: 'user_abcdefg123456'  // Your Public Key
  }
};
```

### Step 6: Test
1. Open website
2. Settings → Send Test Notification
3. Check all 4 inboxes (check spam!)

**Features:**
- ✅ No server required
- ✅ Emails send from browser
- ✅ 200 emails/month (free)
- ✅ All 4 recipients get email

---

## 📡 ESP32 Hardware Setup <a id="esp32-hardware-setup"></a>

### Hardware Connections

| Component | ESP32 Pin |
|-----------|-----------|
| Sound Sensor | GPIO 34 (ADC) |
| DHT11 | GPIO 5 |
| OLED (SDA) | GPIO 21 |
| OLED (SCL) | GPIO 22 |
| LED | GPIO 25 |
| Buzzer | GPIO 26 |
| Vibration Motor | GPIO 27 |

### Upload Code
1. Open `ESP32_code.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Update server IP:
   ```cpp
   const char* serverIP = "192.168.1.100";  // Your computer IP
   ```
4. Select board: **ESP32 Dev Module**
5. Upload

### Required Libraries
Install via Arduino Library Manager:
- U8g2 (OLED display)
- DHT sensor library (Adafruit)
- Adafruit Unified Sensor
- NTPClient

---

## 📚 Full Documentation <a id="full-documentation"></a>

### Project Structure
```
LifeBeep/
├── index.html          # Main dashboard
├── server.js           # Node.js backend
├── email-config.js     # EmailJS configuration
├── email-sender.js     # Email sending logic
├── package.json        # Dependencies
├── ESP32_code.ino      # Arduino firmware
├── static/
│   ├── script.js       # Frontend logic
│   └── style.css       # Styling
└── DOCUMENTATION.md    # This file
```

### Dashboard Features
- **4-Card Layout**: Sound Level, Temperature/Humidity, Event Log, Live Chart
- **Theme Switching**: Dark/Light mode
- **Real-time Updates**: Every 3 seconds
- **Email Notifications**: Automatic for HIGH alerts
- **Responsive Design**: Desktop & mobile

### API Endpoints

**POST /notify** - Receive alerts from ESP32
```json
{
  "level": "High",
  "temperature": 25.5,
  "humidity": 60
}
```

**GET /logs** - Retrieve all logs
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

### Email Configuration (Alternative: Node.js SMTP)

If you prefer Node.js email instead of EmailJS:

1. Copy `.env.example` to `.env`
2. Get Gmail App Password:
   - https://myaccount.google.com/security
   - Enable 2FA
   - Generate App Password
3. Edit `.env`:
```env
SMTP_USER=lifebeeph4@gmail.com
SMTP_PASS=qbjv ioip zzfa fkhp
EMAIL_TO=receiver1@gmail.com,receiver2@gmail.com
```

### Troubleshooting

**EmailJS not working?**
- Check `email-config.js` has correct IDs
- Verify `enabled: true`
- Check spam folder
- Hard refresh (Ctrl + F5)

**Can't connect to ESP32?**
- Same WiFi network
- Check server IP in ESP32 code
- Firewall allows port 5000

**Email not sending (Node.js)?**
- Use Gmail App Password (not regular password)
- Remove spaces from password
- Check `.env` file exists

### GitHub Deployment

**Safe to commit:**
✅ All code files
✅ `.env.example`
✅ `.gitignore`

**NEVER commit:**
❌ `.env` (contains passwords!)
❌ `node_modules/`

**Push to GitHub:**
```powershell
git init
git add .
git commit -m "LifeBeep Dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME/lifebeep.git
git push -u origin main
```

### Team & Contact

**Project:** LifeBeep  
**Guided By:**
- Dr. T. Sindal Kumar
- Dr. V. Mari Selvam

**Developed By:** H-4 Hypers

**Email:** lifebeeph4@gmail.com  
**Phone:** +91 7845693765

---

**© 2025 LifeBeep - Empowering the hearing impaired 💙**
