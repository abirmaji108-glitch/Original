import React from 'react';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';

interface CharacterCounterProps {
  current: number;
  limit: number;
  tier: 'free' | 'basic' | 'pro' | 'business';
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, limit, tier }) => {
  const percentage = (current / limit) * 100;
  
  const getStatus = () => {
    if (current > limit) return 'over';
    if (current < 50) return 'too-short';
    if (current < 100) return 'short';
    return 'good';
  };

  const status = getStatus();

  const getColor = () => {
    switch (status) {
      case 'over': return 'text-red-500';
      case 'too-short': return 'text-red-400';
      case 'short': return 'text-yellow-400';
      case 'good': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'over': return <AlertCircle className="w-4 h-4" />;
      case 'too-short': return <AlertCircle className="w-4 h-4" />;
      case 'short': return <Zap className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getMessage = () => {
    if (current > limit) {
      return `Exceeds ${tier} limit by ${current - limit} characters`;
    }
    if (current < 50) {
      return `${50 - current} more characters needed (minimum 50)`;
    }
    if (current < 100) {
      return `Add ${100 - current} more for better results`;
    }
    return `Perfect! ${limit - current} characters remaining`;
  };

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            status === 'over' 
              ? 'bg-red-500' 
              : status === 'too-short'
              ? 'bg-red-400'
              : status === 'short'
              ? 'bg-yellow-400'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Counter Info */}
      <div className="flex items-center justify-between text-sm">
        <div className={`flex items-center gap-2 font-semibold ${getColor()}`}>
          {getIcon()}
          <span>
            {current} / {limit} characters
          </span>
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-xs">
          {getMessage()}
        </span>
      </div>

      {/* Upgrade Prompt if at limit */}
      {current > limit && tier !== 'business' && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {tier === 'free' && 'Upgrade to Basic for 2000 characters!'}
          {tier === 'basic' && 'Upgrade to Pro for 5000 characters!'}
          {tier === 'pro' && 'Upgrade to Business for 10000 characters!'}
        </div>
      )}
    </div>
  );
};
