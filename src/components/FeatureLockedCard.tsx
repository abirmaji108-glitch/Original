// src/components/FeatureLockedCard.tsx
import { Crown, ArrowRight } from 'lucide-react';

interface FeatureLockedCardProps {
  featureName: string;
  description: string;
  requiredTier: 'basic' | 'pro' | 'business';
  icon?: React.ReactNode;
}

export function FeatureLockedCard({ 
  featureName, 
  description, 
  requiredTier,
  icon 
}: FeatureLockedCardProps) {
  const tierPricing = {
    basic: { name: 'Basic', price: '$9/mo' },
    pro: { name: 'Pro', price: '$19/mo' },
    business: { name: 'Business', price: '$39/mo' }
  };

  const tier = tierPricing[requiredTier];

  return (
    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50/50 backdrop-blur-sm">
      {/* Lock Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-4 p-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
            {icon || <Crown className="w-8 h-8" />}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {featureName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {description}
            </p>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-full text-yellow-800 text-xs font-medium mb-4">
              <Crown className="w-3 h-3" />
              Requires {tier.name} Plan ({tier.price})
            </div>
          </div>

          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 transform hover:scale-105"
          >
            Unlock Feature <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Blurred Content Preview */}
      <div className="blur-sm opacity-50 pointer-events-none">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
