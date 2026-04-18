import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';

type PaymentStatus = 'checking' | 'paid' | 'pending' | 'failed' | 'error';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id: string }>();
  const [status, setStatus] = useState<PaymentStatus>('checking');
  const [plan, setPlan] = useState<string>('');
  const [error, setError] = useState<string>('');
  const pollCount = useRef(0);
  const maxPolls = 6;

  useEffect(() => {
    const sessionId = params.session_id;
    if (!sessionId) {
      setStatus('error');
      setError('No payment session found');
      return;
    }
    pollPaymentStatus(sessionId);
  }, [params.session_id]);

  const pollPaymentStatus = async (sessionId: string) => {
    if (pollCount.current >= maxPolls) {
      setStatus('pending');
      return;
    }

    pollCount.current += 1;

    try {
      const data = await api.checkPaymentStatus(sessionId);
      if (data.status === 'paid') {
        setStatus('paid');
        setPlan(data.plan || '');
        return;
      } else if (data.status === 'expired') {
        setStatus('failed');
        setError('Payment session expired');
        return;
      }
      // Still pending — poll again after 2.5s
      setStatus('checking');
      setTimeout(() => pollPaymentStatus(sessionId), 2500);
    } catch (e: any) {
      console.error('Payment status check error:', e);
      if (pollCount.current < maxPolls) {
        setTimeout(() => pollPaymentStatus(sessionId), 2500);
      } else {
        setStatus('error');
        setError(e.message || 'Failed to verify payment');
      }
    }
  };

  const statusConfig = {
    checking: {
      icon: 'hourglass-outline' as const,
      color: Colors.dark.warning,
      title: 'Verifying Payment...',
      subtitle: 'Please wait while we confirm your payment',
    },
    paid: {
      icon: 'checkmark-circle' as const,
      color: Colors.dark.success,
      title: 'Payment Successful!',
      subtitle: `Your ${plan || 'premium'} plan is now active`,
    },
    pending: {
      icon: 'time-outline' as const,
      color: Colors.dark.warning,
      title: 'Payment Processing',
      subtitle: 'Your payment is still being processed. Please check back shortly.',
    },
    failed: {
      icon: 'close-circle' as const,
      color: Colors.dark.error,
      title: 'Payment Failed',
      subtitle: error || 'Something went wrong with your payment',
    },
    error: {
      icon: 'alert-circle' as const,
      color: Colors.dark.error,
      title: 'Error',
      subtitle: error || 'Unable to verify payment status',
    },
  };

  const config = statusConfig[status];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'paid' && (
          <LinearGradient
            colors={['rgba(34,197,94,0.15)', 'transparent']}
            style={styles.successGlow}
          />
        )}

        <View style={[styles.iconCircle, { backgroundColor: config.color + '20', borderColor: config.color + '40' }]}>
          {status === 'checking' ? (
            <ActivityIndicator size="large" color={config.color} />
          ) : (
            <Ionicons name={config.icon} size={56} color={config.color} />
          )}
        </View>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        {status === 'paid' && (
          <View style={styles.planBadge}>
            <Ionicons name="diamond" size={16} color={Colors.dark.secondary} />
            <Text style={styles.planBadgeText}>PREMIUM</Text>
          </View>
        )}

        {(status === 'paid' || status === 'pending') && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(main)/dashboard')}
          >
            <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        {(status === 'failed' || status === 'error') && (
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(main)/pricing')}
            >
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(main)/dashboard')}
            >
              <Text style={styles.secondaryBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'checking' && (
          <Text style={styles.pollNote}>
            Attempt {pollCount.current} of {maxPolls}...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  successGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    borderRadius: 999,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  planBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.dark.secondary,
    letterSpacing: 1.5,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dark.primary,
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  btnGroup: {
    width: '100%',
    gap: Spacing.md,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.cardBg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  secondaryBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  pollNote: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    marginTop: Spacing.lg,
  },
});
