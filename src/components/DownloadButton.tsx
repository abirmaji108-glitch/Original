// src/components/DownloadButton.tsx
import React, { useState } from 'react';
import { Download, Lock, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

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
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);

  // Download limits per tier
  const canDownload = userTier !== 'free';

  const handleDownload = async () => {
    // Check if user can download
    if (!canDownload) {
      setShowFreeLimitModal(true);
      return;
    }

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      zip.file('index.html', generatedCode);

      // Add README for paid users
      const readme = `# Your Sento AI Website

Generated with Sento AI - ${userTier.toUpperCase()} Plan

## Files Included:
- index.html - Your complete website

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

    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Free tier - Show locked download button
  if (userTier === 'free') {
    return (
      <>
        <button
          onClick={() => setShowFreeLimitModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isDarkMode
              ? 'bg-gray-700 text-gray-400 border border-gray-600'
              : 'bg-gray-200 text-gray-500 border border-gray-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          Download (Upgrade Required)
        </button>

        {/* Free Limit Modal */}
        {showFreeLimitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-md w-full rounded-xl p-6 ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Upgrade to Download</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Free tier includes preview only
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
                  onClick={() => setShowFreeLimitModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors`}
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowFreeLimitModal(false);
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

  // Paid tiers - Show working download button
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
      <Download className={`w-4 h-4 ${isDownloading ? '' : 'animate-bounce-subtle'}`} />
      {isDownloading ? 'Preparing...' : 'Download ZIP'}
    </button>
  );
};
