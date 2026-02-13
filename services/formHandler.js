// services/formHandler.js
import emailService from './emailService.js';

class FormHandler {
  /**
   * Validate form submission data
   * @param {Object} formData - The form data to validate
   * @returns {Object} - Validation result
   */
  validateFormData(formData) {
    if (!formData || typeof formData !== 'object') {
      return { valid: false, error: 'Invalid form data' };
    }

    if (!formData.website_id) {
      return { valid: false, error: 'Missing website_id' };
    }

    // Check if form has at least one field besides website_id
    const fieldCount = Object.keys(formData).filter(key => key !== 'website_id').length;
    if (fieldCount === 0) {
      return { valid: false, error: 'Form has no data fields' };
    }

    return { valid: true };
  }

  /**
   * Process and save form submission
   * @param {Object} params
   * @param {Object} params.formData - The form data
   * @param {string} params.ipAddress - Submitter's IP
   * @param {string} params.userAgent - Submitter's browser
   * @param {Object} params.supabase - Supabase client
   * @returns {Object} - Saved submission
   */
  async saveSubmission({ formData, ipAddress, userAgent, supabase }) {
    try {
      const websiteId = formData.website_id;

      // Get website info to find owner
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('user_id, prompt, deployment_url')
        .eq('id', websiteId)
        .single();

      if (websiteError || !website) {
        throw new Error('Website not found');
      }

      // Save submission to database
      const { data: submission, error: insertError } = await supabase
        .from('form_submissions')
        .insert({
          website_id: websiteId,
          user_id: website.user_id,
          form_data: formData,
          ip_address: ipAddress,
          user_agent: userAgent,
          is_read: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Form submission saved:', submission.id);
      return { submission, website };

    } catch (error) {
      console.error('❌ Form handler error:', error);
      throw error;
    }
  }

  /**
   * Send notification email to page owner
   * @param {Object} params
   * @param {string} params.ownerEmail - Page owner's email
   * @param {string} params.pageName - Name of the landing page
   * @param {Object} params.formData - The form submission data
   * @param {string} params.submittedAt - Submission timestamp
   */
  async notifyOwner({ ownerEmail, pageName, formData, submittedAt }) {
    try {
      await emailService.sendFormNotification({
        toEmail: ownerEmail,
        pageName: pageName,
        formData: formData,
        submittedAt: submittedAt
      });

      console.log('✅ Owner notified via email');
    } catch (error) {
      // Don't fail the whole submission if email fails
      console.error('⚠️ Failed to send notification email:', error);
    }
  }

  /**
   * Sanitize form data (remove malicious content)
   */
  sanitizeFormData(formData) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export default new FormHandler();
