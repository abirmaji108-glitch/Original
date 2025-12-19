// src/components/DownloadButton.tsx
import React, { useState, useEffect } from 'react';
import { Download, Lock, Sparkles, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DownloadButtonProps {
  generatedCode: string;
  userTier: 'free' | 'basic' | 'pro' | 'business';
  onUpgrade: () => void;
  isDarkMode: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  generatedCode,
  userTier,
  onUpgrade,
  isDarkMode
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [downloadLimit, setDownloadLimit] = useState(0);
  const { toast } = useToast();

  // Add download limit check on mount
  useEffect(() => {
    const checkDownloadLimit = async () => {
      if (userTier === 'free') return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get current month's download count
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from('download_tracking')
        .select('id')
        .eq('user_id', session.user.id)
        .gte('downloaded_at', `${currentMonth}-01T00:00:00Z`);

      if (!error && data) {
        setDownloadCount(data.length);
        
        // Set limits based on tier
        const limits = {
          basic: 10,
          pro: 50,
          business: 200
        };
        setDownloadLimit(limits[userTier as keyof typeof limits] || 0);
      }
    };

    checkDownloadLimit();
  }, [userTier]);

  const canDownload = userTier !== 'free' && downloadCount < downloadLimit;

  const handleDownload = async () => {
    // Check if user can download
    if (!canDownload) {
      setShowLimitModal(true);
      return;
    }

    setIsDownloading(true);

    try {
      // Extract CSS and JavaScript into separate files
      const styleMatch = generatedCode.match(/<style>([\s\S]*?)<\/style>/);
      const styles = styleMatch ? styleMatch[1] : '';
      const scriptMatch = generatedCode.match(/<script>([\s\S]*?)<\/script>/);
      const scripts = scriptMatch ? scriptMatch[1] : '';

      // Remove inline styles/scripts and link to external files
      let cleanHtml = generatedCode
        .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="styles.css">')
        .replace(/<script>[\s\S]*?<\/script>/, '<script src="script.js"></script>');

      const zip = new JSZip();
      zip.file('index.html', cleanHtml);
      if (styles.trim()) {
        zip.file('styles.css', styles);
      }
      if (scripts.trim()) {
        zip.file('script.js', scripts);
      }
      // Add README for paid users
      const readme = `# Your Sento AI Website
Generated with Sento AI - ${userTier.toUpperCase()} Plan
## Files Included:
- index.html - Your main website file
- styles.css - Your custom styles
- script.js - Your custom JavaScript
- README.md - This file
## How to Use:
1. Open index.html in any web browser
2. Upload to your hosting provider (Netlify, Vercel, etc.)
3. Share with the world!
## Need Help?
Visit: https://sento.ai/support
Email: support@sento.ai
---
Made with ❤️ by Sento AI
`;
      zip.file('README.md', readme);
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sento-ai-website-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Track download in database AFTER successful download
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('download_tracking')
          .insert({
            user_id: session.user.id,
            downloaded_at: new Date().toISOString(),
            user_tier: userTier
          });
      }

      // Success toast after download
      toast({
        title: "Download Complete! 📦",
        description: `Your website has been saved to your downloads folder. ${downloadLimit - downloadCount - 1} downloads remaining this month.`,
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      
      let errorMessage = 'Download failed. Please try again.';
      
      if (error.message?.includes('quota')) {
        errorMessage = 'Your browser storage is full. Please free up space and try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please allow downloads in your browser settings.';
      }
      
      toast({
        title: "Download Failed ❌",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!canDownload) {
    return (
      <>
        <button
          onClick={() => setShowLimitModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isDarkMode
              ? 'bg-gray-700 text-gray-400 border border-gray-600'
              : 'bg-gray-200 text-gray-500 border border-gray-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          {userTier === 'free' ? 'Download (Upgrade Required)' : `Download (${downloadCount}/${downloadLimit} used)`}
        </button>
        {/* Limit Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-md w-full rounded-xl p-6 ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  userTier === 'free' ? 'bg-purple-100' : 'bg-yellow-100'
                }`}>
                  {userTier === 'free' ? (
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Lock className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {userTier === 'free' ? 'Upgrade to Download' : 'Download Limit Reached'}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {userTier === 'free' 
                      ? 'Free tier includes preview only' 
                      : `Your ${userTier} plan allows ${downloadLimit} downloads per month. You have ${downloadCount} used.`
                    }
                  </p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className="font-semibold text-sm mb-2">Basic Plan - $9/mo</h4>
                  <ul className={`text-sm space-y-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>✅ Download HTML files</li>
                    <li>✅ 5 generations/month</li>
                    <li>✅ No watermark</li>
                  </ul>
                </div>
                <div className={`p-3 rounded-lg border-2 border-purple-500 ${
                  isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Pro Plan - $22/mo</h4>
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                  <ul className={`text-sm space-y-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>✅ Download HTML + React code</li>
                    <li>✅ 12 generations/month</li>
                    <li>✅ 50 premium templates</li>
                    <li>✅ Priority processing</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                >
                  {userTier === 'free' ? 'Maybe Later' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    onUpgrade();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Paid tiers with limits ok - Show working download button
  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl ${
        isDownloading
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
      } ${isDownloading ? '' : 'animate-pulse-subtle'}`}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 animate-bounce-subtle" />
          Download ZIP
        </>
      )}
    </button>
  );
};
