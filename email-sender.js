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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Sending individual emails to each recipient...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const responses = [];
    
    // Send emails sequentially (one at a time) to avoid rate limits
    for (let i = 0; i < config.recipients.receivers.length; i++) {
      const receiverEmail = config.recipients.receivers[i];
      
      console.log(`📤 Sending to: ${receiverEmail}...`);
      
      const templateParams = {
        to_email: receiverEmail,
        to_name: receiverEmail.split('@')[0],
        from_name: config.template.from_name,
        subject: config.template.subject,
        message: config.template.test_message + `\n\nSent on: ${new Date().toLocaleString()}`,
        timestamp: new Date().toLocaleString(),
        system_status: 'Sound Detection Alert',
        alert_type: 'High Sound Detected',
        sender_email: config.recipients.sender,
        sound_level: '3.5',
        temperature: '25.5°C',
        humidity: '60%',
        recipient_email: receiverEmail,  // Added for template flexibility
        recipient_name: receiverEmail.split('@')[0]
      };
      
      try {
        const response = await emailjs.send(
          config.emailjs.serviceId,
          config.emailjs.templateId,
          templateParams
        );
        responses.push({ email: receiverEmail, status: response.status, success: true });
        console.log(`  ✅ Sent successfully to ${receiverEmail} (Status: ${response.status})`);
        
        // Small delay between emails to avoid rate limiting
        if (i < config.recipients.receivers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      } catch (emailError) {
        console.error(`  ❌ Failed to send to ${receiverEmail}:`, emailError);
        responses.push({ email: receiverEmail, status: 'failed', success: false, error: emailError });
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EMAIL SENDING SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('From:', config.recipients.sender);
    console.log('Results:');
    responses.forEach((result, i) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`  ${icon} ${i + 1}. ${result.email} - ${result.success ? 'Sent' : 'Failed'}`);
    });
    const successCount = responses.filter(r => r.success).length;
    console.log(`\nTotal: ${successCount}/${responses.length} emails sent successfully`);
    console.log('Time:', new Date().toLocaleString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { success: successCount > 0, responses, successCount, totalCount: responses.length };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send email: ' + (error.text || error.message));
  }
}

// Expose globally
window.sendTestEmailDirect = sendTestEmailDirect;
