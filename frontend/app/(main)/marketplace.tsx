import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, Alert, TextInput, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

const CATEGORIES = ['All', 'AI Prompts', 'Ebooks', 'Templates', 'Business Guides', 'Courses', 'AI Tool Packs'];

export default function MarketplaceScreen() {
  const { openDrawer } = useDrawer();
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState('All');
  const [tab, setTab] = useState<'browse' | 'sell' | 'purchases'>('browse');
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellForm, setSellForm] = useState({ title: '', description: '', price: '', category: 'AI Prompts' });
  const [sellLoading, setSellLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const cat = selectedCat === 'All' ? undefined : selectedCat;
      // Fetch public products separately from auth-required data
      // to ensure products always load even if auth fails
      const productsPromise = api.getMarketplaceProducts(cat).catch((e: any) => {
        console.error('Failed to fetch marketplace products:', e);
        return { products: [] };
      });
      const myProdsPromise = api.getMyProducts().catch(() => ({ products: [] }));
      const myPurchsPromise = api.getMyPurchases().catch(() => ({ purchases: [] }));

      const [prods, myProds, myPurchs] = await Promise.all([
        productsPromise,
        myProdsPromise,
        myPurchsPromise,
      ]);
      setProducts(prods.products || []);
      setMyProducts(myProds.products || []);
      setMyPurchases(myPurchs.purchases || []);
    } catch (e) { console.error('Marketplace fetchData error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedCat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSell = async () => {
    if (!sellForm.title || !sellForm.description || !sellForm.price) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setSellLoading(true);
    try {
      await api.createMarketplaceProduct({
        title: sellForm.title, description: sellForm.description,
        price: parseFloat(sellForm.price), category: sellForm.category,
      });
      Alert.alert('Success', 'Product listed on marketplace!');
      setShowSellModal(false);
      setSellForm({ title: '', description: '', price: '', category: 'AI Prompts' });
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSellLoading(false); }
  };

  const handleBuy = async (productId: string, title: string, price: number) => {
    Alert.alert('Confirm Purchase', `Buy "${title}" for ₹${price}?\n\nAmount will be deducted from your wallet.`, [
      { text: 'Cancel' },
      { text: 'Buy Now', onPress: async () => {
        setBuyLoading(productId);
        try {
          const result = await api.purchaseProduct(productId);
          Alert.alert('Success!', result.message);
          fetchData();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setBuyLoading(null); }
      }},
    ]);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn}><Ionicons name="menu" size={26} color={Colors.dark.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Marketplace</Text>
        <TouchableOpacity style={s.menuBtn} onPress={() => setShowSellModal(true)}><Ionicons name="add-circle-outline" size={24} color={Colors.dark.primary} /></TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['browse', 'sell', 'purchases'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'browse' ? 'Browse' : t === 'sell' ? 'My Products' : 'Purchased'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.dark.primary} />}>
        {tab === 'browse' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[s.catChip, selectedCat === c && s.catChipActive]} onPress={() => setSelectedCat(c)}>
                  <Text style={[s.catChipText, selectedCat === c && s.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {products.length === 0 ? (
              <View style={s.empty}><Ionicons name="storefront-outline" size={48} color={Colors.dark.textMuted} /><Text style={s.emptyText}>No products yet. Be the first to sell!</Text></View>
            ) : products.map((p: any) => (
              <TouchableOpacity key={p.product_id} style={s.productCard} onPress={() => router.push(`/(main)/product/${p.product_id}` as any)} activeOpacity={0.7}>
                <View style={s.productHeader}>
                  <View style={s.catBadge}><Text style={s.catBadgeText}>{p.category}</Text></View>
                  <Text style={s.productPrice}>₹{p.price}</Text>
                </View>
                <Text style={s.productTitle}>{p.title}</Text>
                <Text style={s.productDesc} numberOfLines={2}>{p.description}</Text>
                <View style={s.productFooter}>
                  <Text style={s.sellerText}>by {p.seller_name}</Text>
                  <Text style={s.downloadCount}>{p.downloads} sales</Text>
                </View>
                <TouchableOpacity style={s.buyBtn} onPress={() => router.push(`/(main)/product/${p.product_id}` as any)}>
                  <Ionicons name="cart" size={16} color="#FFF" /><Text style={s.buyBtnText}>Buy Now</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {tab === 'sell' && (
          <>
            <TouchableOpacity style={s.addProductBtn} onPress={() => setShowSellModal(true)}>
              <Ionicons name="add-circle" size={24} color={Colors.dark.primary} />
              <Text style={s.addProductText}>List New Product</Text>
            </TouchableOpacity>
            {myProducts.length === 0 ? (
              <View style={s.empty}><Ionicons name="cube-outline" size={48} color={Colors.dark.textMuted} /><Text style={s.emptyText}>You haven't listed any products yet</Text></View>
            ) : myProducts.map((p: any) => (
              <View key={p.product_id} style={s.productCard}>
                <View style={s.productHeader}><View style={s.catBadge}><Text style={s.catBadgeText}>{p.category}</Text></View><Text style={s.productPrice}>₹{p.price}</Text></View>
                <Text style={s.productTitle}>{p.title}</Text>
                <View style={s.productFooter}><Text style={s.downloadCount}>{p.downloads} sales</Text><View style={[s.statusBadge, p.status === 'active' ? s.activeBadge : s.removedBadge]}><Text style={s.statusText}>{p.status}</Text></View></View>
              </View>
            ))}
          </>
        )}

        {tab === 'purchases' && (
          myPurchases.length === 0 ? (
            <View style={s.empty}><Ionicons name="bag-outline" size={48} color={Colors.dark.textMuted} /><Text style={s.emptyText}>No purchases yet</Text></View>
          ) : myPurchases.map((p: any) => (
            <View key={p.purchase_id} style={s.productCard}>
              <Text style={s.productTitle}>{p.product_title}</Text>
              <View style={s.productFooter}>
                <Text style={s.sellerText}>₹{p.amount} · {new Date(p.created_at).toLocaleDateString()}</Text>
                <TouchableOpacity style={s.downloadBtn} onPress={() => Alert.alert('Download', 'Product content downloaded!')}>
                  <Ionicons name="download" size={16} color={Colors.dark.primary} /><Text style={s.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Sell Modal */}
      <Modal visible={showSellModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>List Product</Text>
              <TouchableOpacity onPress={() => setShowSellModal(false)}><Ionicons name="close" size={24} color={Colors.dark.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <TextInput style={s.input} placeholder="Product Title" placeholderTextColor={Colors.dark.textMuted} value={sellForm.title} onChangeText={t => setSellForm(f => ({ ...f, title: t }))} />
              <TextInput style={[s.input, { height: 100 }]} placeholder="Description" placeholderTextColor={Colors.dark.textMuted} multiline value={sellForm.description} onChangeText={t => setSellForm(f => ({ ...f, description: t }))} />
              <TextInput style={s.input} placeholder="Price (₹)" placeholderTextColor={Colors.dark.textMuted} keyboardType="numeric" value={sellForm.price} onChangeText={t => setSellForm(f => ({ ...f, price: t }))} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity key={c} style={[s.catChip, sellForm.category === c && s.catChipActive]} onPress={() => setSellForm(f => ({ ...f, category: c }))}>
                    <Text style={[s.catChipText, sellForm.category === c && s.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.commissionNote}>Platform commission: 10% per sale</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSell} disabled={sellLoading}>
                {sellLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>List Product</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loading: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  tabs: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.xs, backgroundColor: Colors.dark.paper },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.dark.primary + '20' },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.dark.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  catScroll: { marginBottom: Spacing.md },
  catRow: { gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border },
  catChipActive: { backgroundColor: Colors.dark.primary + '20', borderColor: Colors.dark.primary },
  catChipText: { fontSize: FontSize.sm, color: Colors.dark.textMuted, fontWeight: '600' },
  catChipTextActive: { color: Colors.dark.primary },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.dark.textMuted, textAlign: 'center' },
  productCard: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  catBadge: { backgroundColor: Colors.dark.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.dark.primary },
  productPrice: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.dark.success },
  productTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: 6 },
  productDesc: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, marginBottom: Spacing.sm, lineHeight: 20 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sellerText: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  downloadCount: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.dark.success },
  buyBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: Colors.dark.primary, borderStyle: 'dashed', marginBottom: Spacing.md },
  addProductText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  activeBadge: { backgroundColor: 'rgba(34,197,94,0.15)' },
  removedBadge: { backgroundColor: 'rgba(239,68,68,0.15)' },
  statusText: { fontSize: 10, fontWeight: '700', color: Colors.dark.success, textTransform: 'uppercase' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  downloadBtnText: { fontSize: FontSize.sm, color: Colors.dark.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.dark.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text },
  input: { backgroundColor: Colors.dark.inputBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSize.md, marginBottom: Spacing.md },
  commissionNote: { fontSize: FontSize.xs, color: Colors.dark.warning, textAlign: 'center', marginBottom: Spacing.md },
  primaryBtn: { height: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
});
