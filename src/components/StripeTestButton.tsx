// components/StripeTestButton.tsx
import { testStripeCheckout } from '../utils/stripe';

export default function StripeTestButton() {
  return (
    <button
      onClick={testStripeCheckout}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Test Stripe Connection
    </button>
  );
}
