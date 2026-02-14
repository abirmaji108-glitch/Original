// services/emailService.js
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY not found in environment variables');
      this.isConfigured = false;
    } else {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid email service initialized');
    }
  }

  /**
   * Send form submission notification to page owner
   * @param {Object} params - Email parameters
   * @param {string} params.toEmail - Recipient email (page owner)
   * @param {string} params.pageName - Name of the landing page
   * @param {Object} params.formData - The form submission data
   * @param {string} params.submittedAt - Submission timestamp
   */
  async sendFormNotification({ toEmail, pageName, formData, submittedAt }) {
    try {
      // Format form data for email display
      const formFields = Object.entries(formData)
        .filter(([key]) => key !== 'website_id') // Exclude internal fields
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br/>');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .form-data { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🎉 New Form Submission!</h2>
            </div>
            <div class="content">
              <p>You received a new form submission on your landing page:</p>
              <p><strong>Page:</strong> ${pageName}</p>
              <p><strong>Submitted:</strong> ${new Date(submittedAt).toLocaleString()}</p>
              
              <div class="form-data">
                <h3 style="margin-top: 0; color: #667eea;">Submission Details:</h3>
                ${formFields}
              </div>
              
              <p>
                <a href="${process.env.FRONTEND_URL || 'https://sento-frontend.onrender.com'}" 
                   style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View in Dashboard
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Sento AI - Landing Page Builder</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      const msg = {
        to: toEmail,
        from: 'abirmaji108@gmail.com',
        subject: `🔔 New lead from "${pageName.substring(0, 50)}${pageName.length > 50 ? '...' : ''}"`,
        html: emailHtml,
      };

      await sgMail.send(msg);
      console.log('✅ Form notification email sent to', toEmail);
      return { success: true };

    } catch (error) {
      console.error('❌ Email service error:', error);
      throw error;
    }
  }

  /**
   * Send test email (for debugging)
   */
  async sendTestEmail(toEmail) {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      const msg = {
        to: toEmail,
        from: 'abirmaji108@gmail.com',
        subject: 'Test Email from Sento AI',
        html: '<p>This is a test email. Your email service is working! ✅</p>',
      };

      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('Test email failed:', error);
      throw error;
    }
  }
}

export default new EmailService();
