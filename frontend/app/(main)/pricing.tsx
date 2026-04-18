import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { openRazorpayCheckout, openNativePayment, startPayment } from '../../src/utils/razorpay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

const PLANS = [
  { id: 'monthly', name: '1 Month', price: 299, color: Colors.dark.primary, popular: false, save: '', perMonth: 299 },
  { id: 'quarterly', name: '3 Months', price: 799, color: Colors.dark.info, popular: true, save: 'Save 11%', perMonth: 266 },
  { id: 'half_yearly', name: '6 Months', price: 1499, color: Colors.dark.secondary, popular: false, save: 'Save 16%', perMonth: 250 },
  { id: 'yearly', name: '1 Year', price: 2499, color: Colors.dark.success, popular: false, save: 'Save 30%', perMonth: 208 },
];

const FEATURES = ['Unlimited AI tool uses', 'All 25+ tools', 'AI Ebook Generator', 'Marketplace buy/sell', 'Download features', 'Smart Problem Solver AI'];

export default function PricingScreen() {
  const { openDrawer } = useDrawer();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const isPremium = user?.subscription_status === 'premium';

  const handlePay = async (planId: string) => {
    setLoading(planId);
    try {
      if (Platform.OS === 'web') {
        const orderData = await api.createRazorpayOrder(planId);
        await startPayment({
          type: 'subscription',
          plan: planId,
          orderData,
          onWebSuccess: async (response) => {
            try {
              const r = await api.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              });
              if (r.status === 'success') {
                Alert.alert('Success!', 'Premium activated!', [
                  { text: 'Go to Dashboard', onPress: () => { refreshUser(); router.replace('/(main)/dashboard'); } }
                ]);
              }
            } catch (e: any) { Alert.alert('Error', e.message); }
            finally { setLoading(null); }
          },
          onFailure: (error) => { Alert.alert('Payment Failed', error); setLoading(null); },
          onDismiss: () => setLoading(null),
        });
      } else {
        // Native: open Razorpay payment link in browser
        await openNativePayment({
          type: 'subscription',
          plan: planId,
          onSuccess: () => {
            Alert.alert('Success!', 'Premium activated!', [
              { text: 'Go to Dashboard', onPress: () => { refreshUser(); router.replace('/(main)/dashboard'); } }
            ]);
            setLoading(null);
          },
          onFailure: (error) => { Alert.alert('Payment Failed', error); setLoading(null); },
          onDismiss: () => setLoading(null),
        });
      }
    } catch (e: any) { Alert.alert('Error', e.message); setLoading(null); }
  };

  if (isPremium) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={openDrawer} style={s.menuBtn}><Ionicons name="menu" size={26} color={Colors.dark.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Premium</Text>
          <View style={s.menuBtn} />
        </View>
        <View style={s.premiumActive}>
          <LinearGradient colors={[Colors.dark.primary + '30', Colors.dark.secondary + '30']} style={s.premiumGlow} />
          <Ionicons name="diamond" size={56} color={Colors.dark.secondary} />
          <Text style={s.premiumTitle}>You're Premium!</Text>
          <Text style={s.premiumDesc}>Enjoy unlimited access to all AI tools</Text>
          <View style={s.premBadge}><Text style={s.premBadgeText}>PLAN: {user?.subscription_plan?.toUpperCase()}</Text></View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn}><Ionicons name="menu" size={26} color={Colors.dark.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Upgrade to Premium</Text>
        <View style={s.menuBtn} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.trialBanner}>
          <Ionicons name="hourglass-outline" size={22} color={Colors.dark.warning} />
          <View style={{ flex: 1 }}>
            <Text style={s.trialTitle}>Free Trial: {user?.tool_uses || 0} / 3 uses</Text>
            <Text style={s.trialDesc}>{(user?.tool_uses || 0) >= 3 ? 'Trial expired! Subscribe to continue.' : `${3 - (user?.tool_uses || 0)} free uses remaining`}</Text>
          </View>
        </View>

        {PLANS.map((plan) => (
          <View key={plan.id} style={[s.planCard, plan.popular && s.planCardPopular]}>
            {plan.popular && (
              <LinearGradient colors={[Colors.dark.secondary, Colors.dark.primary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.popularBadge}>
                <Text style={s.popularText}>MOST POPULAR</Text>
              </LinearGradient>
            )}
            <View style={s.planHeader}>
              <Text style={s.planName}>{plan.name}</Text>
              {plan.save ? <Text style={[s.saveTag, { color: plan.color }]}>{plan.save}</Text> : null}
            </View>
            <View style={s.priceRow}>
              <Text style={s.rupee}>₹</Text>
              <Text style={s.priceAmount}>{plan.price}</Text>
              {plan.perMonth !== plan.price && <Text style={s.perMonth}>  (₹{plan.perMonth}/mo)</Text>}
            </View>
            <View style={s.featuresCol}>
              {FEATURES.map((f) => (
                <View key={f} style={s.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[s.payBtn, { backgroundColor: plan.color }]} onPress={() => handlePay(plan.id)} disabled={loading !== null}>
              {loading === plan.id ? <ActivityIndicator color="#FFF" size="small" /> : (
                <><Ionicons name="card-outline" size={18} color="#FFF" /><Text style={s.payBtnText}>Pay ₹{plan.price}</Text></>
              )}
            </TouchableOpacity>
            <View style={s.methodsRow}>
              <Text style={s.methodLabel}>UPI</Text><Text style={s.dot}>·</Text>
              <Text style={s.methodLabel}>Card</Text><Text style={s.dot}>·</Text>
              <Text style={s.methodLabel}>Netbanking</Text>
            </View>
          </View>
        ))}

        <View style={s.compCard}>
          <Text style={s.compTitle}>Why Premium?</Text>
          {[
            { icon: 'infinite', label: 'Unlimited AI generations' },
            { icon: 'book', label: 'AI Ebook Generator' },
            { icon: 'storefront', label: 'Digital Marketplace access' },
            { icon: 'download', label: 'Download all outputs' },
            { icon: 'shield-checkmark', label: 'Secure Razorpay payment' },
            { icon: 'headset', label: 'Priority support' },
          ].map((item) => (
            <View key={item.label} style={s.compRow}>
              <Ionicons name={item.icon as any} size={20} color={Colors.dark.primary} />
              <Text style={s.compLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  trialTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.warning },
  trialDesc: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginTop: 2 },
  planCard: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, overflow: 'hidden' },
  planCardPopular: { borderColor: Colors.dark.secondary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: Spacing.md, paddingVertical: 4, borderBottomLeftRadius: BorderRadius.md },
  popularText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  planName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text },
  saveTag: { fontSize: FontSize.xs, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.md },
  rupee: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: 6 },
  priceAmount: { fontSize: 40, fontWeight: '900', color: Colors.dark.text },
  perMonth: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: 8 },
  featuresCol: { gap: 8, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: BorderRadius.md },
  payBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
  methodsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  methodLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  dot: { color: Colors.dark.textMuted },
  premiumActive: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  premiumGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  premiumTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.dark.text },
  premiumDesc: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
  premBadge: { backgroundColor: 'rgba(236,72,153,0.15)', paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.full },
  premBadgeText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.dark.secondary, letterSpacing: 1.5 },
  compCard: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.sm },
  compTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  compLabel: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
});
