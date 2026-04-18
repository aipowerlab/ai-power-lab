import { Platform } from 'react-native';

function getBackendUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Native: check env variable
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;
  return '';
}

let BACKEND_URL = getBackendUrl();

// Export for other modules (like razorpay.ts) to construct URLs
export function getBackendBaseUrl(): string {
  if (!BACKEND_URL) BACKEND_URL = getBackendUrl();
  return BACKEND_URL;
}

// Token storage - works on both web (localStorage) and native (AsyncStorage)
let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _nativeStorageReady = false;
let _isRefreshing = false;
let _refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function _loadTokenSync(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('access_token');
    }
  } catch {}
  return null;
}

function _loadRefreshTokenSync(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('refresh_token');
    }
  } catch {}
  return null;
}

async function _saveToken(token: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) window.localStorage.setItem('access_token', token);
        else window.localStorage.removeItem('access_token');
      }
    } else {
      // Native: use AsyncStorage
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (token) await AsyncStorage.setItem('access_token', token);
      else await AsyncStorage.removeItem('access_token');
    }
  } catch {}
}

async function _saveRefreshToken(token: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) window.localStorage.setItem('refresh_token', token);
        else window.localStorage.removeItem('refresh_token');
      }
    } else {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (token) await AsyncStorage.setItem('refresh_token', token);
      else await AsyncStorage.removeItem('refresh_token');
    }
  } catch {}
}

export async function initAuth(): Promise<void> {
  if (_nativeStorageReady) return;
  _nativeStorageReady = true;
  // Refresh backend URL in case env wasn't ready at init
  if (!BACKEND_URL) BACKEND_URL = getBackendUrl();
  try {
    if (Platform.OS !== 'web') {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const saved = await AsyncStorage.getItem('access_token');
      if (saved && !_accessToken) _accessToken = saved;
      const savedRefresh = await AsyncStorage.getItem('refresh_token');
      if (savedRefresh && !_refreshToken) _refreshToken = savedRefresh;
    }
  } catch {}
}

// Initialize sync for web
_accessToken = _loadTokenSync();
_refreshToken = _loadRefreshTokenSync();

export function setAccessToken(token: string | null) {
  _accessToken = token;
  _saveToken(token);
}

export function setRefreshToken(token: string | null) {
  _refreshToken = token;
  _saveRefreshToken(token);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

// Token refresh logic
async function refreshAccessToken(): Promise<string> {
  if (_isRefreshing) {
    // Queue this request to wait for the refresh
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    });
  }

  _isRefreshing = true;

  try {
    if (!_refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = `${BACKEND_URL}/api/auth/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    if (data.access_token) {
      setAccessToken(data.access_token);
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
      }
      // Resolve all queued requests
      _refreshQueue.forEach(q => q.resolve(data.access_token));
      _refreshQueue = [];
      return data.access_token;
    }
    throw new Error('No access token in refresh response');
  } catch (err) {
    // Reject all queued requests
    _refreshQueue.forEach(q => q.reject(err));
    _refreshQueue = [];
    // Clear tokens - user needs to re-login
    setAccessToken(null);
    setRefreshToken(null);
    throw err;
  } finally {
    _isRefreshing = false;
  }
}

interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function apiRequest(endpoint: string, options: FetchOptions = {}) {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  // Ensure BACKEND_URL is set
  if (!BACKEND_URL) BACKEND_URL = getBackendUrl();

  const url = `${BACKEND_URL}/api${endpoint}`;
  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };

  if (!skipAuth && _accessToken) {
    reqHeaders['Authorization'] = `Bearer ${_accessToken}`;
  }

  const config: RequestInit = {
    method,
    headers: reqHeaders,
    credentials: 'include' as RequestCredentials,
  };
  if (body) config.body = JSON.stringify(body);

  let response: Response | undefined;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 3000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(url, config);

      // Handle 401 - try token refresh (only on first 401, not during retry)
      if (response.status === 401 && !skipAuth && _refreshToken && attempt === 0) {
        try {
          const newToken = await refreshAccessToken();
          // Retry the original request with new token
          config.headers = { ...reqHeaders, 'Authorization': `Bearer ${newToken}` };
          response = await fetch(url, config);
        } catch {
          // Refresh failed - continue with the 401 response
        }
      }

      // If proxy error and we have retries left, wait and retry
      if (response && response.status >= 502 && response.status <= 520 && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      break; // Success or final attempt
    } catch (networkErr: any) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  let data: any;
  const rawText = await response!.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    if (response!.status >= 502 && response!.status <= 520) {
      throw new Error('Server is temporarily unavailable. Please try again.');
    }
    if (!response!.ok) {
      throw new Error(`Server error (${response!.status}). Please try again.`);
    }
    throw new Error('Unexpected server response. Please try again.');
  }

  if (!response!.ok) {
    const detail = data.detail;
    let message = 'Something went wrong';
    if (typeof detail === 'string') message = detail;
    else if (Array.isArray(detail)) message = detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ');
    else if (detail?.msg) message = detail.msg;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    apiRequest('/auth/register', { method: 'POST', body: { email, password, name } }),
  login: (email: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/auth/me'),
  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, new_password: string) =>
    apiRequest('/auth/reset-password', { method: 'POST', body: { token, new_password } }),
  googleSession: (session_id: string) =>
    apiRequest('/auth/google/session', { method: 'POST', body: { session_id } }),
  refreshToken: (refresh_token: string) =>
    apiRequest('/auth/refresh', { method: 'POST', body: { refresh_token }, skipAuth: true }),

  // Tools
  getTools: () => apiRequest('/tools'),
  getTool: (toolId: string) => apiRequest(`/tools/${toolId}`),
  generate: (tool_id: string, inputs: Record<string, string>) =>
    apiRequest('/tools/generate', { method: 'POST', body: { tool_id, inputs } }),

  // Dashboard
  getDashboard: () => apiRequest('/dashboard'),

  // Outputs
  saveOutput: (data: { tool_id: string; tool_name: string; category: string; output: string; inputs: Record<string, string> }) =>
    apiRequest('/outputs/save', { method: 'POST', body: data }),
  getOutputs: () => apiRequest('/outputs'),
  deleteOutput: (outputId: string) => apiRequest(`/outputs/${outputId}`, { method: 'DELETE' }),

  // Subscription
  getPlans: () => apiRequest('/subscription/plans'),
  createCheckout: (plan: string, provider: string, origin_url: string) =>
    apiRequest('/subscription/checkout', { method: 'POST', body: { plan, provider, origin_url } }),
  checkPaymentStatus: (sessionId: string) => apiRequest(`/subscription/status/${sessionId}`),

  // Razorpay
  createRazorpayOrder: (plan: string) =>
    apiRequest('/razorpay/create-order', { method: 'POST', body: { plan, provider: 'razorpay', origin_url: typeof window !== 'undefined' ? window.location.origin : '' } }),
  verifyRazorpayPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan: string }) =>
    apiRequest('/razorpay/checkout-verify', { method: 'POST', body: data, skipAuth: true }),

  // Wallet
  getWalletBalance: () => apiRequest('/wallet/balance'),
  getWalletTransactions: () => apiRequest('/wallet/transactions'),
  walletTopup: (amount: number) =>
    apiRequest('/wallet/topup', { method: 'POST', body: { amount } }),
  verifyWalletTopup: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    apiRequest('/razorpay/checkout-verify', { method: 'POST', body: data, skipAuth: true }),

  // Withdrawals
  requestWithdrawal: (data: { amount: number; upi_id?: string; bank_name?: string; account_number?: string; ifsc_code?: string }) =>
    apiRequest('/withdraw/request', { method: 'POST', body: data }),
  getWithdrawalHistory: () => apiRequest('/withdraw/history'),

  // Marketplace
  getMarketplaceProducts: (category?: string) =>
    apiRequest(`/marketplace/products${category ? `?category=${category}` : ''}`),
  getMarketplaceProduct: (productId: string) => apiRequest(`/marketplace/products/${productId}`),
  createMarketplaceProduct: (data: { title: string; description: string; price: number; category: string; file_data?: string; file_name?: string }) =>
    apiRequest('/marketplace/products', { method: 'POST', body: data }),
  purchaseProduct: (productId: string) =>
    apiRequest(`/marketplace/purchase/${productId}`, { method: 'POST' }),
  getMyProducts: () => apiRequest('/marketplace/my-products'),
  getMyPurchases: () => apiRequest('/marketplace/my-purchases'),
  downloadProduct: (productId: string) => apiRequest(`/marketplace/download/${productId}`),

  // Razorpay Payment Links (for native apps)
  createPaymentLink: (data: { type: string; plan?: string; amount?: number; product_id?: string; callback_url?: string }) =>
    apiRequest('/razorpay/payment-link', { method: 'POST', body: data }),
  checkPaymentLinkStatus: (linkId: string) =>
    apiRequest(`/razorpay/payment-link-status/${linkId}`),

  // Marketplace Razorpay
  marketplaceCreateOrder: (productId: string) =>
    apiRequest(`/marketplace/razorpay-order/${productId}`, { method: 'POST' }),
  marketplaceVerifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; product_id: string }) =>
    apiRequest('/marketplace/razorpay-verify', { method: 'POST', body: data }),

  // Ebook
  generateEbook: (data: { title: string; topic: string; chapters: number; language: string }) =>
    apiRequest('/ebook/generate', { method: 'POST', body: data }),
  getEbook: (ebookId: string) => apiRequest(`/ebook/${ebookId}`),
  getUserEbooks: () => apiRequest('/ebooks'),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),

  // Search
  globalSearch: (q: string) => apiRequest(`/search?q=${encodeURIComponent(q)}`),

  // Enhanced Dashboard
  getFullDashboard: () => apiRequest('/dashboard/full'),

  // Admin Analytics
  adminGetAnalytics: () => apiRequest('/admin/analytics'),

  // Payment History
  getPaymentHistory: () => apiRequest('/payments/history'),

  // Support
  submitSupportMessage: (data: { type: string; subject?: string; message: string; email?: string }) =>
    apiRequest('/support/message', { method: 'POST', body: data }),
  getFaq: () => apiRequest('/support/faq'),
  getAnnouncements: () => apiRequest('/announcements'),

  // Admin
  adminGetUsers: () => apiRequest('/admin/users'),
  adminUpdateUser: (userId: string, data: any) =>
    apiRequest(`/admin/users/${userId}`, { method: 'PUT', body: data }),
  adminGetStats: () => apiRequest('/admin/stats'),
  adminToggleTool: (toolId: string, enabled: boolean) =>
    apiRequest(`/admin/tools/${toolId}`, { method: 'PUT', body: { enabled } }),
  adminGetPayments: () => apiRequest('/admin/payments'),
  adminUpdatePlanPrice: (planId: string, priceInr: number) =>
    apiRequest(`/admin/plans/${planId}`, { method: 'PUT', body: { plan: planId, price_inr: priceInr } }),
  adminGetSupportMessages: () => apiRequest('/admin/support-messages'),
  adminCreateAnnouncement: (title: string, message: string) =>
    apiRequest('/admin/announcements', { method: 'POST', body: { title, message } }),
  adminGetAnnouncements: () => apiRequest('/admin/announcements'),
  adminGetWithdrawals: () => apiRequest('/admin/withdrawals'),
  adminApproveWithdrawal: (withdrawId: string) =>
    apiRequest(`/admin/withdrawals/${withdrawId}/approve`, { method: 'PUT' }),
  adminRejectWithdrawal: (withdrawId: string) =>
    apiRequest(`/admin/withdrawals/${withdrawId}/reject`, { method: 'PUT' }),
  adminGetMarketplace: () => apiRequest('/admin/marketplace'),
  adminRemoveProduct: (productId: string) =>
    apiRequest(`/admin/marketplace/${productId}`, { method: 'DELETE' }),
};
