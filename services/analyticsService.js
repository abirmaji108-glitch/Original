// services/analyticsService.js

class AnalyticsService {
  constructor() {
    console.log('✅ Analytics service initialized');
  }

  /**
   * Track a page view
   * @param {Object} params
   * @param {string} params.websiteId - The website ID
   * @param {string} params.visitorIp - Visitor's IP address
   * @param {string} params.userAgent - Visitor's browser
   * @param {string} params.referrer - Where they came from
   * @param {Object} params.supabase - Supabase client
   */
  async trackView({ websiteId, visitorIp, userAgent, referrer, supabase }) {
    try {
      // Get user_id from website
      const { data: website } = await supabase
        .from('websites')
        .select('user_id')
        .eq('id', websiteId)
        .single();

      if (!website) {
        console.warn(`⚠️ Website not found for tracking: ${websiteId}`);
        return { success: false };
      }

      // Insert analytics event
      const { error } = await supabase
        .from('page_analytics')
        .insert({
          website_id: websiteId,
          user_id: website.user_id,
          event_type: 'view',
          visitor_ip: visitorIp,
          visitor_user_agent: userAgent,
          referrer: referrer
        });

      if (error) {
        console.error('❌ Failed to track view:', error);
        return { success: false };
      }

      console.log(`✅ View tracked for website: ${websiteId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Analytics tracking error:', error);
      return { success: false };
    }
  }

  /**
   * Track a form submission (called when form is submitted)
   * @param {Object} params
   * @param {string} params.websiteId
   * @param {string} params.visitorIp
   * @param {string} params.userAgent
   * @param {Object} params.supabase
   */
  async trackSubmission({ websiteId, visitorIp, userAgent, supabase }) {
    try {
      const { data: website } = await supabase
        .from('websites')
        .select('user_id')
        .eq('id', websiteId)
        .single();

      if (!website) return { success: false };

      const { error } = await supabase
        .from('page_analytics')
        .insert({
          website_id: websiteId,
          user_id: website.user_id,
          event_type: 'submit',
          visitor_ip: visitorIp,
          visitor_user_agent: userAgent
        });

      if (error) {
        console.error('❌ Failed to track submission:', error);
        return { success: false };
      }

      console.log(`✅ Submission tracked for website: ${websiteId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Analytics submission tracking error:', error);
      return { success: false };
    }
  }

  /**
   * Get analytics for a specific website
   * @param {string} websiteId
   * @param {Object} supabase
   * @param {number} days - Number of days to look back (default 30)
   */
  async getAnalytics({ websiteId, supabase, days = 30 }) {
    try {
      // Get date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get summary stats
      const { data: summary, error: summaryError } = await supabase
        .from('website_analytics_summary')
        .select('*')
        .eq('website_id', websiteId)
        .single();

      if (summaryError) {
        console.error('Summary query error:', summaryError);
      }

      // Get daily breakdown
      const { data: dailyData, error: dailyError } = await supabase
        .rpc('get_daily_analytics', { 
          p_website_id: websiteId,
          p_days: days 
        });

      if (dailyError) {
        console.log('⚠️ Daily analytics not available (needs RPC function)');
      }

      return {
        success: true,
        summary: summary || {
          total_views: 0,
          unique_visitors: 0,
          total_submissions: 0,
          conversion_rate: 0
        },
        daily: dailyData || []
      };

    } catch (error) {
      console.error('❌ Get analytics error:', error);
      return { success: false };
    }
  }
}

export default new AnalyticsService();
