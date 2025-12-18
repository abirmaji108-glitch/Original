import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  Users,
  TrendingUp,
  Crown,
  Calendar,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  Download,
  Activity,
  Zap,
  Clock,
  RefreshCw
} from 'lucide-react';

interface UserStats {
  total: number;
  free: number;
  basic: number;
  pro: number;
  business: number;
}

interface RecentUser {
  email: string;
  user_tier: string;
  created_at: string;
}

interface UsageData {
  date: string;
  generations: number;
}

interface TopUser {
  email: string;
  user_tier: string;
  total_generations: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    free: 0,
    basic: 0,
    pro: 0,
    business: 0
  });
  const [conversionRate, setConversionRate] = useState(0);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  // Analytics
  const [todayGenerations, setTodayGenerations] = useState(0);
  const [weekGenerations, setWeekGenerations] = useState(0);
  const [monthGenerations, setMonthGenerations] = useState(0);
  const [usageHistory, setUsageHistory] = useState<UsageData[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard...');
      fetchDashboardData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
    
      if (!user) {
        navigate('/login');
        return;
      }

      // Get auth token for server verification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      // Test admin access with server endpoint (server checks admin list)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.status === 403) {
        setError('Access denied. Admin only.');
        setLoading(false);
        setTimeout(() => navigate('/app'), 2000);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to verify admin access');
      }

      setIsAdmin(true);
      await fetchDashboardData();
    
    } catch (err) {
      console.error('Admin check error:', err);
      setError('Authentication error');
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No session token');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Fetch stats from secure server endpoint
      const statsResponse = await fetch(`${apiUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error(`Stats API error: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();
      
      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to fetch stats');
      }

      // Set stats from server response
      setUserStats(statsData.stats.users);
      setConversionRate(statsData.stats.conversionRate);
      setTotalRevenue(statsData.stats.revenue.mrr);
      setRecentUsers(statsData.stats.recentUsers);

      // Fetch analytics from secure server endpoint
      const analyticsResponse = await fetch(`${apiUrl}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!analyticsResponse.ok) {
        throw new Error(`Analytics API error: ${analyticsResponse.status}`);
      }

      const analyticsData = await analyticsResponse.json();
      
      if (!analyticsData.success) {
        throw new Error(analyticsData.error || 'Failed to fetch analytics');
      }

      // Set analytics from server response
      setTodayGenerations(analyticsData.analytics.today);
      setWeekGenerations(analyticsData.analytics.week);
      setMonthGenerations(analyticsData.analytics.month);
      setUsageHistory(analyticsData.analytics.history);
      setTopUsers(analyticsData.analytics.topUsers);

      setError('');
      setLastUpdated(new Date());
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'text-blue-600 bg-blue-100';
      case 'pro': return 'text-purple-600 bg-purple-100';
      case 'business': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const exportToCSV = () => {
    if (userStats.total === 0) {
      alert('No data to export');
      return;
    }

    // Comprehensive CSV data
    const headers = ['Category', 'Metric', 'Value', 'Details'];
    
    const rows = [
      // User Stats
      ['Users', 'Total Users', userStats.total.toString(), ''],
      ['Users', 'Free Tier', userStats.free.toString(), ''],
      ['Users', 'Basic Tier', userStats.basic.toString(), ''],
      ['Users', 'Pro Tier', userStats.pro.toString(), ''],
      ['Users', 'Business Tier', userStats.business.toString(), ''],
      ['Users', 'Conversion Rate', `${conversionRate}%`, ''],
      ['', '', '', ''],
      
      // Revenue
      ['Revenue', 'MRR', `$${totalRevenue}`, 'Monthly Recurring Revenue'],
      ['Revenue', 'ARR', `$${totalRevenue * 12}`, 'Annual Recurring Revenue'],
      ['Revenue', 'Basic Revenue', `$${userStats.basic * 9}`, `${userStats.basic} users × $9/mo`],
      ['Revenue', 'Pro Revenue', `$${userStats.pro * 22}`, `${userStats.pro} users × $22/mo`],
      ['Revenue', 'Business Revenue', `$${userStats.business * 49}`, `${userStats.business} users × $49/mo`],
      ['', '', '', ''],
      
      // Analytics
      ['Analytics', 'Today Generations', todayGenerations.toString(), ''],
      ['Analytics', 'Week Generations', weekGenerations.toString(), 'Last 7 days'],
      ['Analytics', 'Month Generations', monthGenerations.toString(), 'Total this month'],
      ['', '', '', ''],
      
      // Top Users
      ['Top Users', 'Email', 'Tier', 'Total Generations'],
      ...topUsers.map(u => [
        'Top Users',
        u.email,
        u.user_tier,
        u.total_generations.toString()
      ]),
      ['', '', '', ''],
      
      // Recent Signups
      ['Recent Signups', 'Email', 'Tier', 'Signed Up'],
      ...recentUsers.map(u => [
        'Recent Signups',
        u.email,
        u.user_tier,
        new Date(u.created_at).toLocaleDateString()
      ])
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Use UTC timestamp
    const timestamp = new Date().toISOString().split('T')[0];

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sento-ai-admin-report-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    return lastUpdated.toLocaleTimeString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMaxGenerations = () => {
    return Math.max(...usageHistory.map(d => d.generations), 10);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/app')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/app')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Sento AI Analytics & Revenue</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {/* Show last updated time */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Updated: {formatLastUpdated()}</span>
              </div>
              
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => fetchDashboardData()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
     
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
       
          {/* Total Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total MRR</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">Monthly Recurring Revenue</p>
          </div>
          {/* Total Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{userStats.total}</p>
            <p className="text-xs text-gray-500 mt-2">
              {userStats.free} free, {userStats.basic + userStats.pro + userStats.business} paid
            </p>
          </div>
          {/* Conversion Rate */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Conversion Rate</h3>
            <p className="text-3xl font-bold text-gray-900">{conversionRate}%</p>
            <p className="text-xs text-gray-500 mt-2">Free to paid conversion</p>
          </div>
          {/* Paid Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Paid Users</h3>
            <p className="text-3xl font-bold text-gray-900">
              {userStats.basic + userStats.pro + userStats.business}
            </p>
            <p className="text-xs text-gray-500 mt-2">Across all paid tiers</p>
          </div>
        </div>
        {/* Stats Cards Row 2 - Usage Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-blue-900 text-sm font-medium mb-1">Today's Generations</h3>
            <p className="text-3xl font-bold text-blue-900">{todayGenerations}</p>
            <p className="text-xs text-blue-700 mt-2">Websites created today</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-purple-900 text-sm font-medium mb-1">This Week</h3>
            <p className="text-3xl font-bold text-purple-900">{weekGenerations}</p>
            <p className="text-xs text-purple-700 mt-2">Last 7 days</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-orange-900 text-sm font-medium mb-1">This Month</h3>
            <p className="text-3xl font-bold text-orange-900">{monthGenerations}</p>
            <p className="text-xs text-orange-700 mt-2">Total generations</p>
          </div>
        </div>
        {/* Usage Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            7-Day Usage History
          </h2>
        
          {usageHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No usage data yet. Start creating websites to see analytics!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {usageHistory.map((data, idx) => {
                const maxGens = getMaxGenerations();
                const percentage = maxGens > 0 ? (data.generations / maxGens) * 100 : 0;
              
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {formatChartDate(data.date)}
                      </span>
                      <span className="text-sm font-semibold text-purple-600">
                        {data.generations} gens
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
       
          {/* User Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Distribution
            </h2>
            <div className="space-y-4">
              {[
                { tier: 'free', count: userStats.free, price: 0, color: 'bg-gray-400' },
                { tier: 'basic', count: userStats.basic, price: 9, color: 'bg-blue-500' },
                { tier: 'pro', count: userStats.pro, price: 22, color: 'bg-purple-500' },
                { tier: 'business', count: userStats.business, price: 49, color: 'bg-orange-500' }
              ].map(({ tier, count, price, color }) => {
                const percentage = userStats.total > 0 ? (count / userStats.total) * 100 : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${color}`}></span>
                        <span className="font-medium text-gray-900 capitalize">{tier}</span>
                        {price > 0 && (
                          <span className="text-xs text-gray-500">${price}/mo</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{count}</span>
                        <span className="text-gray-500 text-sm ml-2">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Top Users */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-orange-600" />
              Most Active Users
            </h2>
            <div className="space-y-3">
              {topUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activity yet</p>
              ) : (
                topUsers.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.total_generations} generations
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(user.user_tier)}`}>
                      {getTierLabel(user.user_tier)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Recent Signups */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Recent Signups
          </h2>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users yet</p>
            ) : (
              recentUsers.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(user.user_tier)}`}>
                    {getTierLabel(user.user_tier)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Revenue Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Basic Plan</p>
              <p className="text-2xl font-bold text-blue-900">
                ${(userStats.basic * 9).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {userStats.basic} users × $9/mo
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium mb-1">Pro Plan</p>
              <p className="text-2xl font-bold text-purple-900">
                ${(userStats.pro * 22).toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {userStats.pro} users × $22/mo
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium mb-1">Business Plan</p>
              <p className="text-2xl font-bold text-orange-900">
                ${(userStats.business * 49).toLocaleString()}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {userStats.business} users × $49/mo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
