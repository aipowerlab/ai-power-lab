import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import PremiumIcon, { PremiumIconSmall } from '../../src/components/PremiumIcon';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { openDrawer } = useDrawer();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.getFullDashboard();
      setData(d);
    } catch {
      try { const d = await api.getDashboard(); setData(d); } catch (e) { console.error(e); }
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <View style={s.loadingC}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;

  const isPremium = data?.is_premium;
  const stats = [
    { label: 'Total Uses', value: data?.total_uses || 0, icon: 'sparkles', color: Colors.dark.primary },
    { label: 'Remaining', value: data?.remaining_uses ?? 0, icon: 'timer', color: Colors.dark.warning },
    { label: 'Wallet', value: `₹${data?.wallet_balance || 0}`, icon: 'cash', color: Colors.dark.success },
    { label: 'Plan', value: isPremium ? 'Premium' : 'Free', icon: 'shield-checkmark', color: isPremium ? Colors.dark.secondary : Colors.dark.textMuted },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity testID="menu-btn" onPress={openDrawer} style={s.menuBtn}>
          <Ionicons name="menu" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}><Text style={s.headerTitle}>AI Power Lab</Text></View>
        <TouchableOpacity style={s.menuBtn} onPress={() => router.push('/(main)/notifications' as any)}>
          <Ionicons name="notifications-outline" size={24} color={Colors.dark.textSecondary} />
          {(data?.unread_notifications || 0) > 0 && (
            <View style={s.notifBadge}><Text style={s.notifBadgeText}>{data.unread_notifications}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.dark.primary} />}>

        <Text style={s.greeting}>Welcome back, {user?.name?.split(' ')[0] || 'User'}</Text>
        <Text style={s.greetingSub}>What would you like to create today?</Text>

        {!isPremium && (
          <TouchableOpacity style={s.upgradeBanner} onPress={() => router.push('/(main)/pricing')}>
            <LinearGradient colors={[Colors.dark.secondary, Colors.dark.primary]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.upgradeGradient}>
              <View style={s.upgradeLeft}>
                <Ionicons name="trending-up" size={24} color="#FFF" />
                <View>
                  <Text style={s.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={s.upgradeSub}>Starting at ₹299/month</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={s.statsGrid}>
          {stats.map((st) => (
            <View key={st.label} style={s.statCard}>
              <PremiumIcon name={st.icon} size={20} color={st.color} bgSize={40} borderRadius={14} />
              <Text style={s.statValue}>{String(st.value)}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickActions}>
            {[
              { label: 'AI Tools', icon: 'color-wand', color: Colors.dark.primary, route: '/(main)/tools' },
              { label: 'Marketplace', icon: 'bag-handle', color: Colors.dark.secondary, route: '/(main)/marketplace' },
              { label: 'Wallet', icon: 'card', color: Colors.dark.success, route: '/(main)/wallet' },
              { label: 'Pricing', icon: 'ribbon', color: Colors.dark.warning, route: '/(main)/pricing' },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={s.quickCard} onPress={() => router.push(a.route as any)}>
                <PremiumIcon name={a.icon} size={24} color={a.color} bgSize={48} borderRadius={16} />
                <Text style={s.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Sections */}
        {(data?.my_ebooks?.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Ebooks</Text>
            {data.my_ebooks.map((eb: any) => (
              <View key={eb.ebook_id} style={s.listItem}>
                <PremiumIconSmall name="reader" color={Colors.dark.secondary} />
                <View style={s.listContent}>
                  <Text style={s.listTitle} numberOfLines={1}>{eb.title}</Text>
                  <Text style={s.listSub}>{eb.chapters} chapters · {eb.language}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(data?.my_purchases?.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Purchases</Text>
            {data.my_purchases.map((p: any, i: number) => (
              <View key={i} style={s.listItem}>
                <PremiumIconSmall name="receipt" color={Colors.dark.success} />
                <View style={s.listContent}>
                  <Text style={s.listTitle} numberOfLines={1}>{p.product_title}</Text>
                  <Text style={s.listSub}>₹{p.amount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(data?.my_products?.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Products</Text>
            {data.my_products.map((p: any) => (
              <View key={p.product_id} style={s.listItem}>
                <PremiumIconSmall name="cube" color={Colors.dark.primary} />
                <View style={s.listContent}>
                  <Text style={s.listTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={s.listSub}>₹{p.price} · {p.downloads} sales</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          {data?.recent_activity?.length > 0 ? data.recent_activity.slice(0, 5).map((a: any, i: number) => (
            <View key={i} style={s.listItem}>
              <View style={s.activityDot} />
              <View style={s.listContent}>
                <Text style={s.listTitle}>{a.tool_name}</Text>
                <Text style={s.listSub}>{a.category}</Text>
              </View>
              <Text style={s.activityTime}>{new Date(a.timestamp).toLocaleDateString()}</Text>
            </View>
          )) : (
            <View style={s.empty}><Ionicons name="analytics-outline" size={32} color={Colors.dark.textMuted} /><Text style={s.emptyText}>No activity yet. Try an AI tool!</Text></View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingC: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.primary },
  notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.dark.error, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text, marginBottom: 4 },
  greetingSub: { fontSize: FontSize.md, color: Colors.dark.textSecondary, marginBottom: Spacing.lg },
  upgradeBanner: { marginBottom: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  upgradeTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#FFF' },
  upgradeSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md },
  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  quickCard: { flex: 1, backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  quickIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textSecondary },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listContent: { flex: 1 },
  listTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text },
  listSub: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },
  activityTime: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.dark.textMuted },
});
