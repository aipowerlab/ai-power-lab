import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../src/utils/api';
import { openRazorpayCheckout, openNativePayment, startPayment } from '../../../src/utils/razorpay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.getMarketplaceProduct(id!);
        setProduct(p);
        // Check if already purchased
        const purchases = await api.getMyPurchases();
        const found = (purchases.purchases || []).some((pu: any) => pu.product_id === id);
        setPurchased(found);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBuyRazorpay = async () => {
    if (!product) return;
    setBuying(true);
    try {
      if (Platform.OS === 'web') {
        const orderData = await api.marketplaceCreateOrder(product.product_id);
        await startPayment({
          type: 'marketplace',
          product_id: product.product_id,
          orderData,
          onWebSuccess: async (response) => {
            try {
              const result = await api.marketplaceVerifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                product_id: product.product_id,
              });
              if (result.status === 'success') {
                setPurchased(true);
                Alert.alert('Payment Successful', result.message);
              }
            } catch (e: any) { Alert.alert('Error', e.message); }
            finally { setBuying(false); }
          },
          onFailure: (error) => { Alert.alert('Payment Failed', error); setBuying(false); },
          onDismiss: () => setBuying(false),
        });
      } else {
        await openNativePayment({
          type: 'marketplace',
          product_id: product.product_id,
          onSuccess: () => { setPurchased(true); Alert.alert('Payment Successful', 'Product purchased!'); setBuying(false); },
          onFailure: (error) => { Alert.alert('Payment Failed', error); setBuying(false); },
          onDismiss: () => setBuying(false),
        });
      }
    } catch (e: any) { Alert.alert('Error', e.message); setBuying(false); }
  };

  if (loading) {
    return <View style={s.loadingC}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;
  }

  if (!product) {
    return (
      <View style={s.loadingC}>
        <Ionicons name="alert-circle" size={48} color={Colors.dark.error} />
        <Text style={s.errorText}>Product not found</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const desc = product.description || '';
  let badge = '';
  let cleanDesc = desc;
  if (desc.startsWith('[') && desc.includes(']')) {
    badge = desc.substring(1, desc.indexOf(']'));
    cleanDesc = desc.substring(desc.indexOf(']') + 2);
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Product Details</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Product Card */}
        <View style={s.card}>
          <View style={s.topRow}>
            <View style={s.catBadge}><Text style={s.catBadgeText}>{product.category}</Text></View>
            {badge ? (
              <LinearGradient colors={[Colors.dark.secondary, Colors.dark.primary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.tagBadge}>
                <Ionicons name="star" size={10} color="#FFF" />
                <Text style={s.tagText}>{badge}</Text>
              </LinearGradient>
            ) : null}
          </View>

          <Text style={s.title}>{product.title}</Text>

          <View style={s.priceRow}>
            <Text style={s.price}>₹{product.price}</Text>
            <Text style={s.sales}>{product.downloads || 0} sales</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.descLabel}>Description</Text>
          <Text style={s.desc}>{cleanDesc}</Text>

          <View style={s.divider} />

          <View style={s.sellerRow}>
            <Ionicons name="person-circle" size={24} color={Colors.dark.textMuted} />
            <View>
              <Text style={s.sellerName}>by {product.seller_name}</Text>
              <Text style={s.sellerSub}>{product.category}</Text>
            </View>
          </View>
        </View>

        {/* Buy / Purchased */}
        {purchased ? (
          <View style={s.purchasedCard}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.dark.success} />
            <Text style={s.purchasedText}>You own this product</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.buyBtn} onPress={handleBuyRazorpay} disabled={buying} activeOpacity={0.8}>
            <LinearGradient colors={[Colors.dark.primary, '#0891B2']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.buyGradient}>
              {buying ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="card" size={20} color="#FFF" />
                  <Text style={s.buyText}>Buy Now — ₹{product.price}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={s.methodsRow}>
          <Text style={s.methodLabel}>UPI</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.methodLabel}>Card</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.methodLabel}>Netbanking</Text>
        </View>

        {/* Features */}
        <View style={s.features}>
          {[
            { icon: 'shield-checkmark', text: 'Secure Razorpay payment' },
            { icon: 'download', text: 'Instant download after purchase' },
            { icon: 'cash', text: '10% platform commission' },
          ].map((f) => (
            <View key={f.text} style={s.featureRow}>
              <Ionicons name={f.icon as any} size={16} color={Colors.dark.primary} />
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingC: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: FontSize.lg, color: Colors.dark.textMuted, fontWeight: '600' },
  backBtn: { marginTop: 12, padding: 12, backgroundColor: Colors.dark.primary, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  catBadge: { backgroundColor: Colors.dark.primary + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.full },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.dark.primary },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  tagText: { fontSize: 10, fontWeight: '800', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.dark.text, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  price: { fontSize: 32, fontWeight: '900', color: Colors.dark.success },
  sales: { fontSize: FontSize.sm, color: Colors.dark.textMuted },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: Spacing.md },
  descLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  desc: { fontSize: FontSize.md, color: Colors.dark.textSecondary, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text },
  sellerSub: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  purchasedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  purchasedText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.success },
  buyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.sm },
  buyGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: BorderRadius.lg },
  buyText: { fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' },
  methodsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: Spacing.lg },
  methodLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  dot: { color: Colors.dark.textMuted },
  features: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary },
});
