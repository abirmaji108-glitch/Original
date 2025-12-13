// src/components/UpgradeBanner.tsx
import { useState } from 'react';
import { Crown, ArrowRight, X } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(true);
  
  // Don't show if user is Pro/Business
  if (tier === 'pro' || tier === 'business') return null;
  
  // Don't show if user has credits left
  if (generationsUsed < generationsLimit) return null;
  
  // Don't show if manually closed
  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-semibold text-sm">
              You've used all {generationsLimit} generations this month
            </p>
            <p className="text-xs opacity-90">
              Upgrade to Basic ($9/mo) for 5 generations or Pro ($19/mo) for 12 generations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/pricing"
            className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            Upgrade Now <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
