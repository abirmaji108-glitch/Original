import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users, MousePointerClick, Target, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchAnalytics?: (websiteId: string) => Promise<any>;
  selectedWebsite?: string | null;
  websiteHistory?: any[];
}

export function AnalyticsModal({ 
  open, 
  onOpenChange, 
  fetchAnalytics,
  selectedWebsite,
  websiteHistory = []
}: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Use selectedWebsite or first published site
  useEffect(() => {
    if (selectedWebsite) {
      setSelectedSiteId(selectedWebsite);
    } else if (websiteHistory && websiteHistory.length > 0) {
      const publishedSite = websiteHistory.find(site => site.deployment_url);
      if (publishedSite) {
        setSelectedSiteId(publishedSite.id);
      }
    }
  }, [selectedWebsite, websiteHistory]);

  // Fetch analytics when modal opens
  useEffect(() => {
    if (open && selectedSiteId && fetchAnalytics) {
      loadAnalytics();
    }
  }, [open, selectedSiteId]);

  const loadAnalytics = async () => {
    if (!selectedSiteId || !fetchAnalytics) return;
    
    setLoading(true);
    try {
      const data = await fetchAnalytics(selectedSiteId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format visitor data for chart
  const getVisitorTrend = () => {
    if (!analytics || !analytics.visitor_data) return [];
    
    const dailyViews: Record<string, number> = {};
    analytics.visitor_data.forEach((visitor: any) => {
      const date = new Date(visitor.timestamp).toLocaleDateString();
      dailyViews[date] = (dailyViews[date] || 0) + 1;
    });

    return Object.entries(dailyViews)
      .map(([date, views]) => ({ date, views }))
      .slice(-7); // Last 7 days
  };

  const publishedSites = websiteHistory.filter(site => site.deployment_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>📊 Analytics Dashboard</span>
            {fetchAnalytics && selectedSiteId && (
              <Button
                size="sm"
                variant="outline"
                onClick={loadAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Site Selector */}
        {publishedSites.length > 1 && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Select Website:</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              {publishedSites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name || 'Untitled'} - {site.deployment_url}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        )}

        {!loading && !analytics && fetchAnalytics && (
          <div className="text-center py-12 text-gray-500">
            {publishedSites.length === 0 ? (
              <>
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Publish a website to start tracking analytics</p>
              </>
            ) : (
              <>
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No analytics data yet</p>
                <p className="text-sm mt-2">Share your page to start collecting data</p>
              </>
            )}
          </div>
        )}

        {!loading && analytics && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <MousePointerClick className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.views || 0}</p>
                <p className="text-xs text-gray-600">Total Views</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.unique_visitors || 0}</p>
                <p className="text-xs text-gray-600">Unique Visitors</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.form_submissions || 0}</p>
                <p className="text-xs text-gray-600">Form Submissions</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.conversion_rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-600">Conversion Rate</p>
              </div>
            </div>

            {/* Visitor Trend Chart */}
            {getVisitorTrend().length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Visitor Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getVisitorTrend()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#9333ea" strokeWidth={2} name="Views" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Visitors */}
            {analytics.visitor_data && analytics.visitor_data.length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {analytics.visitor_data.slice(-10).reverse().map((visitor: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-2 border-b">
                      <span className="text-gray-600">Visitor {visitor.visitor_id.substring(0, 8)}...</span>
                      <span className="text-gray-500">{new Date(visitor.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback for old usage (no fetchAnalytics prop) */}
        {!fetchAnalytics && (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Analytics tracking is being set up...</p>
            <p className="text-sm mt-2">This feature will be available soon</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
