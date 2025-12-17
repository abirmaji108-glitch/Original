import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTier, setUserTier] = useState('free');
  const [retryCount, setRetryCount] = useState(0); // ✅ FIX: Track retry attempts
  const MAX_RETRIES = 5; // ✅ FIX: Maximum 5 retries (15 seconds total)

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      // ✅ FIX: Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (loading) {
          setError('Verification timed out. Please refresh the page or contact support.');
          setLoading(false);
        }
      }, 30000); // 30 second timeout

      try {
        // ✅ FIX: Validate session ID format (Stripe session IDs start with "cs_")
        if (!sessionId) {
          clearTimeout(timeoutId); // ✅ Clear timeout on early return
          setError('No payment session found. If you just completed a payment, please check your email for confirmation and contact support with your order number.');
          setLoading(false);
          return;
        }

        if (!sessionId.startsWith('cs_')) {
          clearTimeout(timeoutId);
          setError('Invalid session ID format. Please contact support.');
          setLoading(false);
          return;
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
      
        if (!user) {
          clearTimeout(timeoutId);
          setError('Session expired. Please log in again and check your email for payment confirmation.');
          setLoading(false);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // ✅ FIX: Verify session with Stripe via backend (SECURITY CRITICAL)
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!backendUrl) {
          clearTimeout(timeoutId);
          setError('Configuration error. Please contact support.');
          setLoading(false);
          return;
        }

        // Call backend to verify session with Stripe
        try {
          const verifyResponse = await fetch(`${backendUrl}/api/verify-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              userId: user.id
            })
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyData.verified) {
            clearTimeout(timeoutId);
            setError(verifyData.message || 'Payment verification failed. Please contact support.');
            setLoading(false);
            return;
          }

          console.log('✅ Stripe session verified:', verifyData);
         
        } catch (verifyError) {
          clearTimeout(timeoutId);
          console.error('Session verification error:', verifyError);
          setError('Unable to verify payment. Please contact support with your order confirmation.');
          setLoading(false);
          return;
        }

        // Verify the user tier was updated by webhook
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_tier')
          .eq('id', user.id)
          .single();

        if (profileError) {
          clearTimeout(timeoutId);
          console.error('Profile fetch error:', profileError);
          setError('Could not verify payment. Please contact support.');
          setLoading(false);
          return;
        }

        // ✅ FIX: Check if tier was updated (should be 'basic', 'pro', or 'business')
        if (profile.user_tier === 'free') {
          // Webhook might not have processed yet
          if (retryCount >= MAX_RETRIES) {
            clearTimeout(timeoutId);
            setError('Payment verification timed out. Your payment was successful, but tier upgrade is delayed. Please refresh in a few moments or contact support if issue persists.');
            setLoading(false);
            return;
          }
         
          console.log(`Tier still free, retry ${retryCount + 1}/${MAX_RETRIES}...`);
          setRetryCount(prev => prev + 1);
         
          // Retry after 3 seconds
          setTimeout(() => {
            verifyPayment(); // ✅ FIX: Re-run verification instead of reload
          }, 3000);
          return;
        }

        // Success! Tier was updated
        setUserTier(profile.user_tier);
        setLoading(false);
        clearTimeout(timeoutId); // ✅ FIX: Clear timeout on success

        // Optional: Track successful payment
        console.log('Payment successful! New tier:', profile.user_tier);
      
      } catch (err) {
        clearTimeout(timeoutId); // ✅ FIX: Clear timeout on error
        console.error('Payment verification error:', err);
        setError('Unable to verify payment status. Your payment may have succeeded - please check your email for confirmation or contact support.');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, retryCount]); // ✅ FIX #1: Added retryCount to dependency array

  // Get tier display name and benefits
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'basic':
        return {
          name: 'Basic',
          generations: '5',
          color: 'from-blue-600 to-cyan-600'
        };
      case 'pro':
        return {
          name: 'Pro',
          generations: '12',
          color: 'from-purple-600 to-blue-600'
        };
      case 'business':
        return {
          name: 'Business',
          generations: '40',
          color: 'from-orange-600 to-red-600'
        };
      default:
        return {
          name: 'Free',
          generations: '2',
          color: 'from-gray-600 to-gray-700'
        };
    }
  };

  const tierInfo = getTierInfo(userTier);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verifying your payment...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Issue</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Pricing
            </button>
            <button
              onClick={() => navigate('/app')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Success Icon with Tier Color */}
        <div className={`w-20 h-20 bg-gradient-to-r ${tierInfo.color} rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce`}>
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600">
            Welcome to Sento AI <span className="font-semibold">{tierInfo.name}</span>! Your account has been upgraded.
          </p>
        </div>

        {/* Tier-specific Benefits */}
        <div className={`bg-gradient-to-r ${tierInfo.color} bg-opacity-10 rounded-xl p-6 mb-6`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            What's unlocked:
          </h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">
                <strong>{tierInfo.generations} website generations</strong> per month
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Priority AI processing</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Advanced templates & themes</span>
            </li>
            {(userTier === 'pro' || userTier === 'business') && (
              <>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Custom branding options</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Priority email support</span>
                </li>
              </>
            )}
            {userTier === 'business' && (
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Dedicated account manager</span>
              </li>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/app')}
            className={`w-full bg-gradient-to-r ${tierInfo.color} text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 font-semibold`}
          >
            Start Creating Websites
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/my-websites')}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            View My Websites
          </button>
        </div>

        {/* Email Confirmation Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          📧 A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
