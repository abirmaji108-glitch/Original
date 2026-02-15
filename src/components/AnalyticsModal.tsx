import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users, MousePointerClick, Target, RefreshCw, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const selectedSite = publishedSites.find(site => site.id === selectedSiteId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                📊 Analytics Dashboard
              </DialogTitle>
              {selectedSite && (
                <p className="text-sm text-muted-foreground">
                  Tracking performance for <span className="font-medium text-foreground">{selectedSite.name || 'Untitled'}</span>
                </p>
              )}
            </div>
            {fetchAnalytics && selectedSiteId && (
              <Button
                size="sm"
                variant="outline"
                onClick={loadAnalytics}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Site Selector - Professional Version */}
        {publishedSites.length > 1 && (
          <Card className="bg-white dark:bg-gray-800 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Website</CardTitle>
              <CardDescription className="text-xs">
                Choose which landing page to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedSiteId || ''} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a website" />
                </SelectTrigger>
                <SelectContent>
                  {publishedSites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {site.name || 'Untitled'}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {site.deployment_url?.replace('https://', '')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-12 h-12 animate-spin text-purple-600 mb-4" />
            <p className="text-sm text-muted-foreground">Loading analytics data...</p>
          </div>
        )}

        {!loading && !analytics && fetchAnalytics && (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              {publishedSites.length === 0 ? (
                <>
                  <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Published Websites</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Publish a website to start tracking analytics and monitoring performance
                  </p>
                </>
              ) : (
                <>
                  <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Share your page link to start collecting visitor data and insights
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && analytics && (
          <div className="space-y-6">
            {/* Stats Cards - Professional Version */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <MousePointerClick className="w-8 h-8 opacity-80" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{analytics.views || 0}</div>
                  <p className="text-sm opacity-90">Page Views</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Users className="w-8 h-8 opacity-80" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Unique
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{analytics.unique_visitors || 0}</div>
                  <p className="text-sm opacity-90">Visitors</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Target className="w-8 h-8 opacity-80" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Forms
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{analytics.form_submissions || 0}</div>
                  <p className="text-sm opacity-90">Submissions</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="w-8 h-8 opacity-80" />
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Rate
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-1">{analytics.conversion_rate?.toFixed(1) || 0}%</div>
                  <p className="text-sm opacity-90">Conversion</p>
                </CardContent>
              </Card>
            </div>

            {/* Visitor Trend Chart */}
            {getVisitorTrend().length > 0 && (
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Visitor Trend
                  </CardTitle>
                  <CardDescription>Daily page views over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getVisitorTrend()}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="currentColor"
                        opacity={0.5}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="currentColor"
                        opacity={0.5}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#9333ea" 
                        strokeWidth={3}
                        name="Views"
                        dot={{ fill: '#9333ea', r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent Visitors */}
            {analytics.visitor_data && analytics.visitor_data.length > 0 && (
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest {Math.min(10, analytics.visitor_data.length)} visitor interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.visitor_data.slice(-10).reverse().map((visitor: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Visitor {visitor.visitor_id.substring(0, 12)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(visitor.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Page View
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Fallback for old usage (no fetchAnalytics prop) */}
        {!fetchAnalytics && (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Analytics tracking is being configured for your account
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
