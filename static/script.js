/*
 * LifeBeep Dashboard - Frontend JavaScript
 * Modern, feature-rich single-page dashboard
 * With theme switching, real-time charts, and ESP32 integration
 */

// ===================================
// INITIALIZATION & GLOBAL VARIABLES
// ===================================
let serverIp = '';
let chart = null;
let logCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 LifeBeep Dashboard Loading...');
    
    // Initialize components
    initializeTheme();
    initializeConnection();
    initializeChart();
    initializeEventListeners();
    loadSettings();
    
    // Start simulated data for testing
    startSimulatedData();
    
    console.log('✓ LifeBeep Dashboard Ready!');
});

// ===================================
// THEME MANAGEMENT
// ===================================
function initializeTheme() {
    const savedTheme = localStorage.getItem('lifebeep_theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.checked = true;
    }
    
    console.log(`✓ Theme initialized: ${savedTheme}`);
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    if (themeToggle.checked) {
        body.classList.add('light-theme');
        localStorage.setItem('lifebeep_theme', 'light');
        console.log('☀️ Switched to Light Mode');
    } else {
        body.classList.remove('light-theme');
        localStorage.setItem('lifebeep_theme', 'dark');
        console.log('🌙 Switched to Dark Mode');
    }
    
    // Update chart colors based on theme
    updateChartTheme();
}

function updateChartTheme() {
    if (!chart) return;
    
    const isLight = document.body.classList.contains('light-theme');
    const textColor = isLight ? '#1a202c' : '#e6f0ff';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.plugins.legend.labels.color = textColor;
    
    chart.update();
}

// ===================================
// CONNECTION MANAGEMENT
// ===================================
function initializeConnection() {
    const serverIpInput = document.getElementById('serverIp');
    const connectBtn = document.getElementById('connectBtn');
    const connStatus = document.getElementById('connStatus');
    
    // Load saved server IP
    serverIp = localStorage.getItem('lifebeep_server') || '';
    if (serverIp) {
        serverIpInput.value = serverIp;
    }
    
    // Connect button handler
    connectBtn.addEventListener('click', () => {
        const ip = serverIpInput.value.trim();
        
        if (!ip) {
            showNotification('Please enter a server IP address', 'error');
            serverIpInput.classList.add('shake');
            setTimeout(() => serverIpInput.classList.remove('shake'), 300);
            return;
        }
        
        // Validate IP format
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(ip)) {
            showNotification('Please enter a valid IP address', 'error');
            serverIpInput.classList.add('shake');
            setTimeout(() => serverIpInput.classList.remove('shake'), 300);
            return;
        }
        
        // Save and connect
        serverIp = ip;
        localStorage.setItem('lifebeep_server', serverIp);
        
        // Stop simulated data - use only real ESP32 data
        stopSimulatedData();
        
        connStatus.classList.remove('disconnected');
        connStatus.classList.add('connected');
        connStatus.innerHTML = '<span class="status-dot"></span> Connected';
        
        showNotification(`✅ ESP32 Connected - Real data mode`, 'success');
        console.log(`✓ ESP32 Connected at ${serverIp} - Simulated data stopped`);
        
        // Start polling ESP32 for real-time data and smart email notifications
        startESP32Polling();
    });
}

// ===================================
// CHART INITIALIZATION
// ===================================
function initializeChart() {
    const ctx = document.getElementById('chart');
    if (!ctx) {
        console.error('✗ Chart canvas not found');
        return;
    }
    
    const isLight = document.body.classList.contains('light-theme');
    const textColor = isLight ? '#1a202c' : '#e6f0ff';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Sound Level',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#00d4ff',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        },
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    
    console.log('✓ Chart initialized');
}

// ===================================
// DATA UPDATE FUNCTIONS
// ===================================
function pushSample(level, temp, hum) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
    });
    
    // Update chart
    if (chart) {
        // Keep only last 30 samples
        if (chart.data.labels.length >= 30) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(level);
        chart.data.datasets[1].data.push(temp);
        chart.data.datasets[2].data.push(hum);
        chart.update('none'); // Update without animation for better performance
    }
    
    // Update display values
    updateDisplayValues(level, temp, hum);
    
    // Add to log
    addLogEntry(timestamp, level, temp, hum);
}

function updateDisplayValues(level, temp, hum) {
    const decLevelEl = document.getElementById('decLevel');
    const temperatureEl = document.getElementById('temperature');
    const humidityEl = document.getElementById('humidity');
    const levelBar = document.getElementById('levelBar');
    
    if (decLevelEl) {
        decLevelEl.textContent = level.toFixed(1);
        decLevelEl.classList.add('bounce');
        setTimeout(() => decLevelEl.classList.remove('bounce'), 500);
    }
    
    if (temperatureEl) {
        temperatureEl.textContent = `${temp.toFixed(1)}°C`;
    }
    
    if (humidityEl) {
        humidityEl.textContent = `${hum.toFixed(0)}%`;
    }
    
    // Update level bar
    if (levelBar) {
        const percentage = (level / 5) * 100;
        levelBar.style.width = `${percentage}%`;
    }
}

function addLogEntry(time, level, temp, hum) {
    const logsEl = document.getElementById('logs');
    if (!logsEl) return;
    
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    // Determine severity class based on level
    let severityIcon = '🔵';
    if (level > 4) severityIcon = '🔴';
    else if (level > 3) severityIcon = '🟡';
    
    logItem.innerHTML = `
        ${severityIcon} <strong>${time}</strong> 
        • Level: ${level.toFixed(1)} 
        • Temp: ${temp.toFixed(1)}°C 
        • Humidity: ${hum.toFixed(0)}%
    `;
    
    logsEl.prepend(logItem);
    
    // Keep only last 50 log entries
    while (logsEl.children.length > 50) {
        logsEl.removeChild(logsEl.lastChild);
    }
    
    // Update log count
    logCount++;
    const logCountEl = document.getElementById('logCount');
    if (logCountEl) {
        logCountEl.textContent = logCount;
    }
}

// ===================================
// EVENT LISTENERS
// ===================================
function initializeEventListeners() {
    // Help modal
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');
    
    if (helpBtn && helpModal && closeHelp) {
        helpBtn.addEventListener('click', () => openModal('helpModal'));
        closeHelp.addEventListener('click', () => closeModal('helpModal'));
    }
    
    // Settings modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    
    if (settingsBtn && settingsModal && closeSettings) {
        settingsBtn.addEventListener('click', () => openModal('settingsModal'));
        closeSettings.addEventListener('click', () => closeModal('settingsModal'));
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    // Clear logs button
    const clearLogsBtn = document.getElementById('clearLogs');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearLogs);
    }
    
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('✓ Event listeners initialized');
}

function handleKeyboardShortcuts(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal[aria-hidden="false"]').forEach(modal => {
            closeModal(modal.id);
        });
    }
    
    // Ctrl/Cmd + K focuses server IP input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('serverIp')?.focus();
    }
    
    // Ctrl/Cmd + / opens help
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        openModal('helpModal');
    }
}

// ===================================
// MODAL FUNCTIONS
// ===================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
    }
}

// ===================================
// SETTINGS MANAGEMENT
// ===================================
function saveSettings() {
    const soundAlerts = document.getElementById('soundAlerts')?.checked ?? true;
    const emailAlerts = document.getElementById('emailAlerts')?.checked ?? true;
    const refreshRate = document.getElementById('refreshRate')?.value ?? 3;
    
    // Save to localStorage
    localStorage.setItem('lifebeep_sound_alerts', soundAlerts);
    localStorage.setItem('lifebeep_email_alerts', emailAlerts);
    localStorage.setItem('lifebeep_refresh_rate', refreshRate);
    
    showNotification('Settings saved successfully!', 'success');
    closeModal('settingsModal');
    
    console.log('✓ Settings saved:', { soundAlerts, emailAlerts, refreshRate });
}

function loadSettings() {
    const soundAlerts = localStorage.getItem('lifebeep_sound_alerts');
    const emailAlerts = localStorage.getItem('lifebeep_email_alerts');
    const refreshRate = localStorage.getItem('lifebeep_refresh_rate');
    
    if (soundAlerts !== null) {
        const el = document.getElementById('soundAlerts');
        if (el) el.checked = soundAlerts === 'true';
    }
    
    if (emailAlerts !== null) {
        const el = document.getElementById('emailAlerts');
        if (el) el.checked = emailAlerts === 'true';
    }
    
    if (refreshRate !== null) {
        const el = document.getElementById('refreshRate');
        if (el) el.value = refreshRate;
    }
}

// ===================================
// LOGS MANAGEMENT
// ===================================
function clearLogs() {
    const logsEl = document.getElementById('logs');
    const logCountEl = document.getElementById('logCount');
    
    if (logsEl) {
        logsEl.innerHTML = '';
    }
    
    if (logCountEl) {
        logCountEl.textContent = '0';
    }
    
    logCount = 0;
    showNotification('Logs cleared', 'success');
    console.log('✓ Logs cleared');
}

// ===================================
// NOTIFICATION SYSTEM
// ===================================
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-message">${message}</span>
    `;
    
    // Add styles dynamically if not in CSS
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: var(--card);
        color: var(--text);
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px var(--shadow);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        min-width: 250px;
        max-width: 400px;
    `;
    
    // Add type-specific colors
    if (type === 'success') {
        notification.style.borderLeft = '4px solid var(--success)';
    } else if (type === 'error') {
        notification.style.borderLeft = '4px solid var(--danger)';
    } else if (type === 'warning') {
        notification.style.borderLeft = '4px solid var(--warning)';
    } else {
        notification.style.borderLeft = '4px solid var(--info)';
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .notification-icon {
        font-size: 20px;
        font-weight: bold;
    }
    
    .notification-message {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
    }
`;
document.head.appendChild(styleSheet);

// ===================================
// API FUNCTIONS
// ===================================
async function sendNotification(payload) {
    try {
        const ip = localStorage.getItem('lifebeep_server');
        if (!ip) {
            showNotification('Please set server IP first', 'error');
            return;
        }
        
        const response = await fetch(`http://${ip}:5000/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✓ Notification sent:', result);
        return result;
        
    } catch (error) {
        console.error('✗ Failed to send notification:', error);
        showNotification('Failed to send notification: ' + error.message, 'error');
        return null;
    }
}

// Expose sendNotification globally for ESP32 testing
window.sendNotification = sendNotification;

// ===================================
// SEND TEST NOTIFICATION (DIRECT EMAIL)
// ===================================
async function sendTestNotification() {
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        // Send email directly using EmailJS (no server needed)
        const result = await sendTestEmailDirect();
        
        if (result && result.success) {
            showNotification(`✓ Test emails sent to all ${EMAIL_CONFIG.recipients.receivers.length} recipients! Check inboxes.`, 'success');
            console.log('✅ Email test completed successfully');
        } else if (result && result.simulated) {
            showNotification('⚠️ EmailJS not configured. See console for setup instructions.', 'error');
        } else {
            showNotification('Failed to send test notification', 'error');
        }
    } catch (error) {
        console.error('Email test error:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// Expose for HTML onclick
window.sendTestNotification = sendTestNotification;

// ===================================
// ESP32 DATA POLLING (SMART MONITORING)
// ===================================
let lastStatus = "Normal"; // Track previous status
let isPolling = false;
let consecutiveErrors = 0; // Track connection failures
let isConnected = true; // Track connection state

async function pollESP32Data() {
    if (!serverIp || isPolling) return;
    
    isPolling = true;
    
    try {
        const response = await fetch(`http://${serverIp}/data`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            timeout: 2000 // 2 second timeout
        });
        
        if (!response.ok) throw new Error('ESP32 not responding');
        
        const data = await response.json();
        
        // Reset error counter on successful connection
        if (consecutiveErrors > 0) {
            consecutiveErrors = 0;
            if (!isConnected) {
                isConnected = true;
                showNotification('✅ ESP32 reconnected!', 'success');
                console.log('✓ ESP32 connection restored');
            }
        }
        
        // Update dashboard with ESP32 data
        const level = data.soundLevel / 819; // Convert ADC (0-4095) to 0-5 scale
        const temp = data.temperature;
        const hum = data.humidity;
        
        pushSample(level, temp, hum);
        
        // SMART DETECTION: Check if status changed from Normal to Detected AND notification not sent yet
        if (data.status === "Detected" && lastStatus === "Normal" && data.notificationSent === false) {
            console.log(`🚨 REAL SOUND ALERT! Level ${data.soundLevel} exceeded threshold ${data.threshold}!`);
            
            // Send REAL sound detection email with actual sensor data (NOT A TEST)
            try {
                await sendSoundDetectionEmail(level, temp, hum);
                console.log('✅ Real-time alert emails sent successfully!');
                showNotification('🚨 HIGH SOUND DETECTED! Alerts sent to all recipients.', 'error');
            } catch (emailError) {
                console.error('❌ Alert email failed:', emailError);
                showNotification('⚠️ Sound detected but alerts failed to send', 'error');
            }
        }
        
        lastStatus = data.status; // Update tracked status
        
    } catch (error) {
        consecutiveErrors++;
        
        // Only show error notification after 5 consecutive failures (1.5 seconds of failures)
        if (consecutiveErrors === 5 && isConnected) {
            isConnected = false;
            console.error('❌ ESP32 connection lost after 5 failed attempts');
            showNotification('⚠️ ESP32 connection lost. Check WiFi/IP address.', 'error');
        } else if (consecutiveErrors < 5) {
            // Just log, don't show notification for occasional hiccups
            console.warn(`⚠️ ESP32 poll failed (${consecutiveErrors}/5):`, error.message);
        }
    } finally {
        isPolling = false;
    }
}

// Start polling ESP32 every 300ms for Serial Monitor speed
function startESP32Polling() {
    setInterval(pollESP32Data, 300); // Poll every 300ms (0.3 seconds) for real-time Serial Monitor speed
    console.log('✓ ESP32 polling started (every 0.3s - Serial Monitor speed with instant notifications)');
}

// ===================================
// SIMULATED DATA (FOR TESTING ONLY)
// ===================================
let simulatedDataInterval = null;

function startSimulatedData() {
    // Only start if not already running and no ESP32 connected
    if (simulatedDataInterval || serverIp) return;
    
    simulatedDataInterval = setInterval(() => {
        // Generate random values ONLY FOR TESTING
        const level = Math.random() * 5; // 0-5 scale
        const temp = 22 + Math.random() * 6; // 22-28°C
        const hum = 40 + Math.random() * 30; // 40-70%
        
        pushSample(level, temp, hum);
    }, 3000); // Every 3 seconds
    
    console.log('⚠️ Simulated data started (testing mode - connect ESP32 for real data)');
}

function stopSimulatedData() {
    if (simulatedDataInterval) {
        clearInterval(simulatedDataInterval);
        simulatedDataInterval = null;
        console.log('✓ Simulated data stopped - Using real ESP32 data now');
    }
}

// ===================================
// DOWNLOAD ESP32 CODE
// ===================================
function downloadESP32Code() {
    // Create a link to download the ESP32_code.ino file
    const link = document.createElement('a');
    link.href = '/ESP32_code.ino';
    link.download = 'ESP32_code.ino';
    
    // Try to download
    link.click();
    
    showNotification('Downloading ESP32 code...', 'success');
    console.log('✓ ESP32 code download initiated');
}

// Make downloadESP32Code available globally
window.downloadESP32Code = downloadESP32Code;

// ===================================
// UTILITY FUNCTIONS
// ===================================
function formatTimestamp(date = new Date()) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function validateIP(ip) {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

// ===================================
// CONSOLE WELCOME MESSAGE
// ===================================
console.log('%c🎯 LifeBeep Dashboard', 'color: #00d4ff; font-size: 24px; font-weight: bold;');
console.log('%cSound Detection System for Hearing Impaired', 'color: #9aa4b2; font-size: 14px;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4ff;');
console.log('Version: 1.0');
console.log('Guided by: Dr. T. Senthil Kumar & Dr. Mari Selvam');
console.log('Developed by: H-4 Hypers');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4ff;');
console.log('📡 Server IP: Set via UI');
console.log('🎨 Theme: ' + (document.body.classList.contains('light-theme') ? 'Light' : 'Dark'));
console.log('📊 Simulated data running every 3 seconds');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00d4ff;');
