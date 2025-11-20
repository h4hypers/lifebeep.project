// ============================================
// EMAIL SENDING FUNCTION (BROWSER-BASED)
// ============================================
// Sends test emails directly from browser using EmailJS
// No server connection or ESP32 required!

async function sendTestEmailDirect() {
  const config = typeof EMAIL_CONFIG !== 'undefined' ? EMAIL_CONFIG : null;
  
  // Check if EmailJS is configured
  if (!config || !config.emailjs.enabled || config.emailjs.serviceId === 'YOUR_SERVICE_ID') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️ EmailJS not configured yet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('To send real emails:');
    console.log('1. Go to https://www.emailjs.com/');
    console.log('2. Create free account and add Gmail service');
    console.log('3. Create email template');
    console.log('4. Copy Service ID, Template ID, and Public Key');
    console.log('5. Update email-config.js with your credentials');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show simulated success
    showNotification('⚠️ EmailJS not configured. Update email-config.js to send real emails.', 'error');
    return { success: false, simulated: true };
  }
  
  try {
    // Initialize EmailJS
    emailjs.init(config.emailjs.publicKey);
    console.log('✓ EmailJS initialized');
    
    // Send to all receivers
    const emailPromises = config.recipients.receivers.map(async (receiverEmail) => {
      const templateParams = {
        to_email: receiverEmail,
        to_name: receiverEmail.split('@')[0],
        from_name: config.template.from_name,
        subject: config.template.subject,
        message: config.template.test_message + `\n\nSent on: ${new Date().toLocaleString()}`,
        timestamp: new Date().toLocaleString(),
        system_status: 'Email System Active',
        alert_type: 'Test Notification',
        sender_email: config.recipients.sender,
        sound_level: '3.5',
        temperature: '25.5°C',
        humidity: '60%'
      };
      
      return emailjs.send(
        config.emailjs.serviceId,
        config.emailjs.templateId,
        templateParams
      );
    });
    
    const responses = await Promise.all(emailPromises);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TEST EMAILS SENT SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('From:', config.recipients.sender);
    console.log('Sent to:');
    config.recipients.receivers.forEach((email, i) => {
      console.log(`  ${i + 1}. ${email} - Status: ${responses[i].status}`);
    });
    console.log('Time:', new Date().toLocaleString());
    console.log('Total emails sent:', responses.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { success: true, responses };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send email: ' + (error.text || error.message));
  }
}

// Expose globally
window.sendTestEmailDirect = sendTestEmailDirect;
