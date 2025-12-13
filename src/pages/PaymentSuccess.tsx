import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setLoading(false);
        return;
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Not authenticated');
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
          console.error('Profile fetch error:', profileError);
          setError('Could not verify payment');
          setLoading(false);
          return;
        }

        // Check if tier was updated (should be 'pro' or 'basic')
        if (profile.user_tier === 'free') {
          // Webhook might not have processed yet, wait a bit
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Payment verification error:', err);
        setError('Payment verification failed');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600">
            Welcome to Sento AI Pro! Your account has been upgraded.
          </p>
        </div>

        {/* Benefits List */}
        <div className="bg-purple-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            What's unlocked:
          </h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Unlimited website generations</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Priority AI processing</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Advanced templates & themes</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Custom branding options</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">24/7 priority support</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 font-semibold"
          >
            Start Creating
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Email Confirmation Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
