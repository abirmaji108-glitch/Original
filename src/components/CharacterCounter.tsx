import { useAuth } from '@/contexts/AuthContext';

interface CharacterCounterProps {
  currentLength: number;
}

export const CharacterCounter = ({ currentLength }: CharacterCounterProps) => {
  // ✅ FIX #27: Get server-verified tier from AuthContext
  const { userTier } = useAuth();
 
  // ✅ Define limits (must match server validation in server.js)
  const TIER_LIMITS_MAP = {
    free: 500,
    basic: 1000,
    pro: 2000
  };
 
  const maxLength = TIER_LIMITS_MAP[userTier as keyof typeof TIER_LIMITS_MAP] || 500;
 
  // Calculate percentage for visual feedback
  const percentage = (currentLength / maxLength) * 100;
  const isNearLimit = currentLength > maxLength * 0.9;
  const isOverLimit = currentLength > maxLength;

  return (
    <div className="space-y-2">
      {/* Character count with color coding */}
      <div className="flex items-center justify-between">
        <div className={`text-sm font-medium ${
          isOverLimit
            ? 'text-destructive'
            : isNearLimit
              ? 'text-yellow-600 dark:text-yellow-500'
              : 'text-muted-foreground'
        }`}>
          {currentLength} / {maxLength} characters
        </div>
       
        {/* ✅ FIX #28: Upgrade hint when approaching limit */}
        {/* ✅ FIX: Show correct tier name */}
        {isNearLimit && !isOverLimit && userTier !== 'pro' && (
          <span className="text-xs text-yellow-600 dark:text-yellow-500">
            Upgrade to {userTier === 'free' ? 'Basic' : 'Pro'} for {
              userTier === 'free' ? '1,000' : '2,000'
            } chars
          </span>
        )}
       
        {/* Error indicator when exceeded */}
        {isOverLimit && (
          <span className="text-xs text-destructive font-medium">
            Exceeds by {currentLength - maxLength}
          </span>
        )}
      </div>
     
      {/* ✅ Visual progress bar */}
      {/* ✅ FIX: Add pulse animation when approaching limit */}
      <div className={`w-full h-2 bg-secondary rounded-full overflow-hidden ${
        isNearLimit ? 'animate-pulse' : ''
      }`}>
        <div 
          className={`h-full transition-all duration-300 ease-out ${
            isOverLimit 
              ? 'bg-destructive animate-pulse' 
              : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-primary'
          }`}
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            // ✅ FIX: Smooth transition
            transition: 'width 0.3s ease-out, background-color 0.3s ease-out'
          }}
        />
      </div>
     
      {/* Tier-specific message */}
      {isOverLimit && (
        <p className="text-xs text-destructive">
          {userTier === 'free'
            ? 'Free tier allows up to 500 characters. Upgrade to Basic for 1,000 or Pro for 2,000.'
            : userTier === 'basic'
              ? 'Basic tier allows up to 1,000 characters. Upgrade to Pro for 2,000.'
              : 'Maximum 2,000 characters allowed.'}
        </p>
      )}
    </div>
  );
};
