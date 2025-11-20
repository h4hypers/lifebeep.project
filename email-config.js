// ============================================
// LIFEBEEP EMAIL CONFIGURATION
// ============================================
// EmailJS configuration for sending emails directly from browser
// No server connection required!

const EMAIL_CONFIG = {
  // EmailJS Configuration (Get these from https://emailjs.com)
  emailjs: {
    enabled: true,
    serviceId: 'service_4skoavp',      // ✅ Your Service ID
    templateId: 'template_3950kqe',    // ✅ Your Template ID
    publicKey: 'RbjWsWf3aViU1LnB0'     // ✅ Your Public Key
  },
  
  // Email Recipients
  recipients: {
    sender: 'lifebeeph4@gmail.com',
    receivers: [
      'harishpranavs259@gmail.com',
      'hariprasanthgk1@gmail.com',
      'hemanathan8337@gmail.com',
      'harishwarharishwar47@gmail.com'
    ]
  },
  
  // Email Template
  template: {
    subject: '🔊 LifeBeep Test Notification',
    from_name: 'LifeBeep Sound Detection System',
    test_message: 'This is a test email to verify your LifeBeep notification system is working correctly.'
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMAIL_CONFIG;
}
