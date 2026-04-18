import { Platform, Alert, Linking } from 'react-native';
import { api, getBackendBaseUrl } from './api';

interface RazorpayOptions {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill_email: string;
  prefill_name: string;
  onSuccess: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onFailure: (error: string) => void;
  onDismiss?: () => void;
}

interface NativePaymentOptions {
  type: 'subscription' | 'wallet_topup' | 'marketplace';
  plan?: string;
  amount?: number;
  product_id?: string;
  onSuccess: () => void;
  onFailure: (error: string) => void;
  onDismiss?: () => void;
}

function ensureRazorpayLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('Not web')); return; }
    if ((window as any).Razorpay) { resolve(); return; }
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if ((window as any).Razorpay) { clearInterval(check); resolve(); }
      else if (attempts > 20) {
        clearInterval(check);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load payment gateway'));
        document.head.appendChild(script);
      }
    }, 200);
  });
}

// For WEB: Use Razorpay checkout.js popup
export async function openRazorpayCheckout(opts: RazorpayOptions): Promise<void> {
  if (Platform.OS !== 'web') {
    opts.onFailure('Use openNativePayment() for native apps');
    return;
  }
  try { await ensureRazorpayLoaded(); } catch {
    opts.onFailure('Payment gateway failed to load. Please refresh and try again.');
    return;
  }
  try {
    const rzp = new (window as any).Razorpay({
      key: opts.key_id, amount: opts.amount, currency: opts.currency,
      name: opts.name, description: opts.description, order_id: opts.order_id,
      prefill: { email: opts.prefill_email, name: opts.prefill_name },
      theme: { color: '#06B6D4' },
      method: { upi: true, card: true, netbanking: true, wallet: false, paylater: false },
      handler: (response: any) => {
        opts.onSuccess({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => { if (opts.onDismiss) opts.onDismiss(); },
        escape: true, confirm_close: true,
      },
    });
    rzp.on('payment.failed', (resp: any) => {
      opts.onFailure(resp?.error?.description || 'Payment failed. Please try again.');
    });
    rzp.open();
  } catch (e: any) {
    opts.onFailure(e.message || 'Failed to open payment.');
  }
}

// For NATIVE (Android/iOS): Create Razorpay payment link and open in browser
export async function openNativePayment(opts: NativePaymentOptions): Promise<void> {
  try {
    let linkData;
    try {
      linkData = await api.createPaymentLink({
        type: opts.type,
        plan: opts.plan || '',
        amount: opts.amount || 0,
        product_id: opts.product_id || '',
      });
    } catch (apiErr: any) {
      // Show actual error to user — do NOT hide behind generic message
      const msg = apiErr.message || '';
      if (msg.includes('Not authenticated') || msg.includes('Token expired') || msg.includes('Invalid token')) {
        opts.onFailure('Session expired. Please log in again to continue.');
      } else {
        opts.onFailure(msg || 'Failed to create payment. Please try again.');
      }
      return;
    }

    if (!linkData || !linkData.payment_link_id) {
      opts.onFailure('Failed to create payment link. Please try again.');
      return;
    }

    // Build checkout URL on frontend using correct backend URL (not backend-generated URL)
    const baseUrl = getBackendBaseUrl();
    const checkoutUrl = `${baseUrl}/api/razorpay/checkout/${linkData.payment_link_id}`;

    // Open in external browser
    const canOpen = await Linking.canOpenURL(checkoutUrl);
    if (!canOpen) {
      opts.onFailure('Cannot open browser. Please try from a web browser.');
      return;
    }

    await Linking.openURL(checkoutUrl);

    // Start polling for payment status after a delay
    const linkId = linkData.payment_link_id;
    if (linkId) {
      // Poll every 5 seconds for 3 minutes
      let pollCount = 0;
      const maxPolls = 36;
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const status = await api.checkPaymentLinkStatus(linkId);
          if (status.status === 'paid') {
            clearInterval(pollInterval);
            opts.onSuccess();
          }
        } catch { /* ignore poll errors */ }
      }, 5000);

      // Show info alert
      Alert.alert(
        'Payment Opened',
        'Complete the payment in your browser. The app will update automatically once payment is confirmed.',
        [{ text: 'OK' }]
      );
    }
  } catch (e: any) {
    opts.onFailure(e.message || 'Failed to create payment link.');
  }
}

// Universal payment function - works on both web and native
export async function startPayment(params: {
  type: 'subscription' | 'wallet_topup' | 'marketplace';
  plan?: string;
  amount?: number;
  product_id?: string;
  // Web-specific params (from order creation API response)
  orderData?: any;
  // Callbacks
  onWebSuccess?: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onNativeSuccess?: () => void;
  onFailure: (error: string) => void;
  onDismiss?: () => void;
}): Promise<void> {
  if (Platform.OS === 'web') {
    if (!params.orderData) {
      params.onFailure('Order data required for web payment');
      return;
    }
    const od = params.orderData;
    let desc = 'AI Power Lab Payment';
    if (params.type === 'subscription') desc = `${od.plan_name || 'Premium'} Plan`;
    else if (params.type === 'wallet_topup') desc = `Wallet Top-up ₹${od.amount / 100}`;
    else if (params.type === 'marketplace') desc = `Buy: ${od.product_title || 'Product'}`;

    await openRazorpayCheckout({
      key_id: od.key_id,
      order_id: od.order_id,
      amount: od.amount,
      currency: od.currency || 'INR',
      name: 'AI Power Lab',
      description: desc,
      prefill_email: od.user_email || '',
      prefill_name: od.user_name || '',
      onSuccess: params.onWebSuccess || (() => {}),
      onFailure: params.onFailure,
      onDismiss: params.onDismiss,
    });
  } else {
    // Native: use payment link
    await openNativePayment({
      type: params.type,
      plan: params.plan,
      amount: params.amount,
      product_id: params.product_id,
      onSuccess: params.onNativeSuccess || (() => {}),
      onFailure: params.onFailure,
      onDismiss: params.onDismiss,
    });
  }
}
