import logger from '../utils/logger.js';

const analyticsService = {
  /**
   * Track a page view
   */
  async trackView(websiteId, visitorId, supabase) {
    try {
      // Get or create analytics record
      const { data: analytics, error: fetchError } = await supabase
        .from('page_analytics')
        .select('*')
        .eq('website_id', websiteId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Get website user_id
      const { data: website } = await supabase
        .from('websites')
        .select('user_id')
        .eq('id', websiteId)
        .single();

      if (!website) {
        throw new Error('Website not found');
      }

      const visitorInfo = {
        visitor_id: visitorId,
        timestamp: new Date().toISOString()
      };

      if (!analytics) {
        // Create new record
        const { error: insertError } = await supabase
          .from('page_analytics')
          .insert({
            website_id: websiteId,
            user_id: website.user_id,
            total_views: 1,
            unique_visitors: 1,
            visitor_data: [visitorInfo]
          });

        if (insertError) throw insertError;
      } else {
        // Update existing
        const existingVisitors = analytics.visitor_data || [];
        const isUnique = !existingVisitors.some(v => v.visitor_id === visitorId);

        const { error: updateError } = await supabase
          .from('page_analytics')
          .update({
            total_views: analytics.total_views + 1,
            unique_visitors: isUnique ? analytics.unique_visitors + 1 : analytics.unique_visitors,
            visitor_data: [...existingVisitors, visitorInfo],
            updated_at: new Date().toISOString()
          })
          .eq('id', analytics.id);

        if (updateError) throw updateError;
      }

      return { success: true };
    } catch (error) {
      logger.error('Analytics tracking error:', error);
      throw error;
    }
  },

  /**
   * Get analytics for a website
   */
  async getAnalytics(websiteId, supabase) {
    try {
      const { data: analytics, error } = await supabase
        .from('page_analytics')
        .select('*')
        .eq('website_id', websiteId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Get form submissions count
      const { count: formCount } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('website_id', websiteId);

      const analyticsData = analytics || {
        total_views: 0,
        unique_visitors: 0,
        visitor_data: []
      };

      const conversionRate = analyticsData.total_views > 0
        ? ((formCount || 0) / analyticsData.total_views * 100).toFixed(2)
        : '0.00';

      return {
        views: analyticsData.total_views,
        unique_visitors: analyticsData.unique_visitors,
        form_submissions: formCount || 0,
        conversion_rate: parseFloat(conversionRate),
        visitor_data: analyticsData.visitor_data || []
      };
    } catch (error) {
      logger.error('Get analytics error:', error);
      throw error;
    }
  }
};

export default analyticsService;
