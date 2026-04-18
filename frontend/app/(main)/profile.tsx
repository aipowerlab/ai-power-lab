import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function ProfileScreen() {
  const { openDrawer } = useDrawer();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    try {
      const [annData, savedData] = await Promise.all([
        api.getAnnouncements().catch(() => ({ announcements: [] })),
        api.getOutputs().catch(() => ({ outputs: [] })),
      ]);
      setAnnouncements(annData.announcements || []);
      setSavedCount((savedData.outputs || []).length);
    } catch {}
    setRefreshing(false);
  };

  useEffect(() => { fetchProfileData(); }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isPremium = user?.subscription_status === 'premium';
  const trialUsed = user?.tool_uses || 0;
  const trialMax = 3;
  const trialPercent = Math.min((trialUsed / trialMax) * 100, 100);

  const quickActions = [
    { label: 'AI Tools', icon: 'flash', color: Colors.dark.primary, route: '/(main)/tools' },
    { label: 'Saved', icon: 'bookmark', color: Colors.dark.success, route: '/(main)/saved' },
    { label: 'Help', icon: 'help-circle', color: Colors.dark.info, route: '/(main)/help' },
    { label: 'Pricing', icon: 'diamond', color: Colors.dark.secondary, route: '/(main)/pricing' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="menu-btn" onPress={openDrawer} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => { setRefreshing(true); refreshUser(); fetchProfileData(); }} style={styles.menuBtn}>
          <Ionicons name="refresh-outline" size={22} color={Colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshUser(); fetchProfileData(); }} tintColor={Colors.dark.primary} />}
      >
        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={[Colors.dark.primary + '15', Colors.dark.secondary + '10', 'transparent']}
            style={styles.profileCardGlow}
          />
          <View style={styles.avatarOuter}>
            <LinearGradient
              colors={[Colors.dark.primary, Colors.dark.secondary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.planBadge, isPremium ? styles.premBadge : styles.freeBadge]}>
            <Ionicons
              name={isPremium ? 'diamond' : 'hourglass-outline'}
              size={12}
              color={isPremium ? Colors.dark.secondary : Colors.dark.primary}
            />
            <Text style={[styles.planBadgeText, isPremium ? { color: Colors.dark.secondary } : { color: Colors.dark.primary }]}>
              {isPremium ? `PREMIUM · ${(user?.subscription_plan || '').toUpperCase()}` : 'FREE TRIAL'}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{trialUsed}</Text>
              <Text style={styles.statLabel}>Uses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{savedCount}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user?.role === 'admin' ? 'Admin' : 'User'}</Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
          </View>
        </View>

        {/* Trial Progress (Free users only) */}
        {!isPremium && (
          <View style={styles.trialCard}>
            <View style={styles.trialHeader}>
              <Ionicons name="hourglass-outline" size={18} color={Colors.dark.warning} />
              <Text style={styles.trialTitle}>Free Trial Usage</Text>
              <Text style={styles.trialCount}>{trialUsed}/{trialMax}</Text>
            </View>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={trialPercent >= 100 ? [Colors.dark.error, Colors.dark.secondary] : [Colors.dark.primary, Colors.dark.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${trialPercent}%` as any }]}
              />
            </View>
            <Text style={styles.trialHint}>
              {trialPercent >= 100
                ? 'Trial expired! Upgrade to unlock unlimited AI tools.'
                : `${trialMax - trialUsed} free generation${trialMax - trialUsed !== 1 ? 's' : ''} remaining`}
            </Text>
            {trialPercent >= 100 && (
              <TouchableOpacity style={styles.upgradeSmallBtn} onPress={() => router.push('/(main)/pricing')}>
                <Ionicons name="rocket" size={16} color="#FFF" />
                <Text style={styles.upgradeSmallText}>Upgrade Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.annCard}>
            <View style={styles.annIconRow}>
              <Ionicons name="megaphone" size={18} color={Colors.dark.info} />
              <Text style={styles.annLabel}>Announcement</Text>
            </View>
            <Text style={styles.annTitle}>{announcements[0].title}</Text>
            <Text style={styles.annBody}>{announcements[0].message}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Email', value: user?.email || '', icon: 'mail-outline' },
            { label: 'Account Type', value: user?.role === 'admin' ? 'Administrator' : 'Standard User', icon: 'shield-outline' },
            { label: 'Subscription', value: isPremium ? `Premium (${user?.subscription_plan})` : 'Free Trial', icon: 'diamond-outline' },
            { label: 'AI Generations', value: String(trialUsed), icon: 'flash-outline' },
            { label: 'Saved Outputs', value: String(savedCount), icon: 'bookmark-outline' },
          ].map((item, idx) => (
            <View key={item.label} style={[styles.infoRow, idx > 0 && styles.infoRowBorder]}>
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon as any} size={18} color={Colors.dark.primary} />
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Upgrade CTA */}
        {!isPremium && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/(main)/pricing')} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.dark.primary, Colors.dark.secondary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.upgradeBannerGradient}
            >
              <View style={styles.upgradeBannerContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeBannerTitle}>Unlock Premium</Text>
                  <Text style={styles.upgradeBannerDesc}>Unlimited AI tools starting ₹299/mo</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <View style={styles.appInfoRow}>
            <Ionicons name="flash" size={16} color={Colors.dark.primary} />
            <Text style={styles.appInfoText}>AI Power Lab v1.0</Text>
          </View>
          <Text style={styles.appInfoSub}>Powered by Gemini 3 Flash & GPT Image 1</Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity testID="logout-profile-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dark.error} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 120 },

  // Profile Card
  profileCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center',
    marginBottom: Spacing.md, overflow: 'hidden',
  },
  profileCardGlow: {
    position: 'absolute', top: -80, left: -40, right: -40, height: 200, borderRadius: 100,
  },
  avatarOuter: { marginBottom: Spacing.md },
  avatarGradient: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', padding: 3,
  },
  avatarInner: {
    width: 82, height: 82, borderRadius: 41, backgroundColor: Colors.dark.background,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '900', color: Colors.dark.primary },
  userName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text, marginBottom: 2 },
  userEmail: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.sm },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  premBadge: { backgroundColor: 'rgba(236, 72, 153, 0.15)', borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.25)' },
  freeBadge: { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.25)' },
  planBadgeText: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.2 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.dark.border },

  // Trial Card
  trialCard: {
    backgroundColor: 'rgba(234,179,8,0.06)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)',
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  trialHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  trialTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.warning, flex: 1 },
  trialCount: { fontSize: FontSize.md, fontWeight: '800', color: Colors.dark.warning },
  progressBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: 8, borderRadius: 4 },
  trialHint: { fontSize: FontSize.sm, color: Colors.dark.textMuted },
  upgradeSmallBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.dark.warning, paddingVertical: 10, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  upgradeSmallText: { color: '#000', fontSize: FontSize.sm, fontWeight: '700' },

  // Announcements
  annCard: {
    backgroundColor: 'rgba(59,130,246,0.06)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  annIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  annLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.dark.info, textTransform: 'uppercase', letterSpacing: 1 },
  annTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text, marginBottom: 4 },
  annBody: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, lineHeight: 20 },

  // Quick Actions
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  actionCard: {
    width: '48%', backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 8,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textSecondary },

  // Account Info
  infoCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.dark.border },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoLabel: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
  infoValue: { fontSize: FontSize.md, color: Colors.dark.text, fontWeight: '600', maxWidth: '50%' },

  // Upgrade Banner
  upgradeBanner: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  upgradeBannerGradient: { padding: Spacing.lg },
  upgradeBannerContent: { flexDirection: 'row', alignItems: 'center' },
  upgradeBannerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' },
  upgradeBannerDesc: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // App Info
  appInfoCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
  },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  appInfoText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textSecondary },
  appInfoSub: { fontSize: FontSize.xs, color: Colors.dark.textMuted },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    height: 52, borderRadius: BorderRadius.md, backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutBtnText: { color: Colors.dark.error, fontSize: FontSize.md, fontWeight: '700' },
});
