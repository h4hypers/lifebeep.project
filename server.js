require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));
app.use('/', express.static(path.join(__dirname)));

// In-memory logs (simple)
const logs = [];

// Nodemailer transport (use environment variables)
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

app.post('/notify', async (req, res) => {
  try {
    const payload = req.body || {};
    const timestamp = new Date().toISOString();
    const entry = { timestamp, ...payload };
    logs.unshift(entry);

    // Send an email for high alerts (if configured)
    if ((payload.level || '').toLowerCase() === 'high' && process.env.EMAIL_TO) {
      const transporter = createTransport();
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: process.env.EMAIL_TO,
        subject: `LifeBeep Alert: ${payload.level || 'Alert'}`,
        text: `Level: ${payload.level}\nTime: ${timestamp}\nTemp: ${payload.temperature || 'N/A'}\nHumidity: ${payload.humidity || 'N/A'}`,
        html: `<p><strong>Level:</strong> ${payload.level}</p><p><strong>Time:</strong> ${timestamp}</p><p><strong>Temp:</strong> ${payload.temperature || 'N/A'}</p><p><strong>Humidity:</strong> ${payload.humidity || 'N/A'}</p>`
      };

      transporter.sendMail(mailOptions).then(info => {
        console.log('Email sent', info.response);
      }).catch(err => {
        console.error('Email error', err && err.message);
      });
    }

    res.json({ status: 'ok', received: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

// Simple test endpoint
app.post('/test_notification', (req, res) => {
  logs.unshift({ timestamp: new Date().toISOString(), level: 'test', message: 'Test notification' });
  res.json({ status: 'ok', message: 'Test notification queued' });
});

app.listen(PORT, () => console.log(`LifeBeep Node server running on http://localhost:${PORT}`));
