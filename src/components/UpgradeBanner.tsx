// src/components/UpgradeBanner.tsx
import { useState } from 'react';
import { Crown, ArrowRight, X, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeBannerProps {
  generationsUsed: number;
  generationsLimit: number;
  tier: string;
  onClose?: () => void;
}

export function UpgradeBanner({ 
  generationsUsed, 
  generationsLimit, 
  tier,
  onClose 
}: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();
  
  // Don't show if user is Pro/Business
  if (tier === 'pro' || tier === 'business') return null;
  
  // Don't show if manually dismissed
  if (isDismissed) return null;

  const handleClose = () => {
    setIsDismissed(true);
    onClose?.();
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const remaining = generationsLimit - generationsUsed;
  const percentUsed = (generationsUsed / generationsLimit) * 100;

  // Show different styles based on usage
  const isWarning = percentUsed >= 80; // 80% or more
  const isCritical = remaining === 0; // All used up

  // Don't show if user has plenty of generations left (less than 50%)
  if (percentUsed < 50 && !isCritical) return null;

  return (
  <div className={`sticky top-16 z-40 backdrop-blur-md border-b animate-in fade-in slide-in-from-top-4 duration-500 ${
    isCritical 
      ? 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500' 
      : isWarning
      ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400'
      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
  } text-white shadow-lg`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Message */}
          <div className="flex items-center gap-3">
            {isCritical ? (
              <Crown className="w-5 h-5 animate-bounce" />
            ) : (
              <TrendingUp className="w-5 h-5 animate-pulse" />
            )}
            <div>
              <p className="font-bold text-sm md:text-base">
                {isCritical ? (
                  <>🚨 You've used all {generationsLimit} generations this month!</>
                ) : (
                  <>⚠️ You've used {generationsUsed}/{generationsLimit} generations ({Math.round(percentUsed)}%)</>
                )}
              </p>
              <p className="text-xs md:text-sm opacity-90">
                {isCritical ? (
                  <>Upgrade now to continue creating websites</>
                ) : remaining === 1 ? (
                  <>Only {remaining} generation left! Upgrade for unlimited creativity</>
                ) : (
                  <>Only {remaining} generations remaining. Upgrade to keep building!</>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="bg-white text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 px-4 md:px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Crown className="w-4 h-4 text-orange-600" />
              <span className="text-orange-600">Upgrade Now</span>
              <ArrowRight className="w-4 h-4 text-orange-600" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isCritical && (
          <div className="mt-3 w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
