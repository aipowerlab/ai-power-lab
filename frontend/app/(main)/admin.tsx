import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform, Alert, Switch, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

type AdminTab = 'stats' | 'users' | 'tools' | 'payments' | 'support' | 'announce';

export default function AdminScreen() {
  const { openDrawer } = useDrawer();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [supportMsgs, setSupportMsgs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const s = await api.adminGetStats();
      setStats(s);
      setErrorMsg('');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load admin data');
      setLoading(false);
      return;
    }
    try {
      const u = await api.adminGetUsers();
      setUsers(u.users || []);
    } catch {}
    try {
      const t = await api.getTools();
      setTools(t.tools || []);
    } catch {}
    api.adminGetPayments().then(d => setPayments(d.payments || [])).catch(() => {});
    api.adminGetSupportMessages().then(d => setSupportMsgs(d.messages || [])).catch(() => {});
    api.adminGetAnnouncements().then(d => setAnnouncements(d.announcements || [])).catch(() => {});
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePremium = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'premium' ? 'free' : 'premium';
    try {
      await api.adminUpdateUser(userId, { subscription_status: newStatus, subscription_plan: newStatus === 'premium' ? 'admin_granted' : null });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscription_status: newStatus } : u));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const toggleTool = async (toolId: string, currentEnabled: boolean) => {
    try {
      await api.adminToggleTool(toolId, !currentEnabled);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: !currentEnabled } : t));
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const sendAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) { Alert.alert('Required', 'Fill title and message'); return; }
    setSending(true);
    try {
      await api.adminCreateAnnouncement(annTitle, annMessage);
      Alert.alert('Sent!', 'Announcement created');
      setAnnTitle(''); setAnnMessage('');
      const d = await api.adminGetAnnouncements();
      setAnnouncements(d.announcements || []);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSending(false); }
  };

  if (errorMsg) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={48} color={Colors.dark.error} />
        <Text style={styles.adTitle}>Admin Access Required</Text>
        <Text style={{ color: Colors.dark.textMuted, marginTop: 8, fontSize: 14 }}>{errorMsg}</Text>
        <TouchableOpacity onPress={() => { setErrorMsg(''); setLoading(true); fetchData(); }} style={{ marginTop: 16, padding: 12, backgroundColor: Colors.dark.primary, borderRadius: 8 }}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Stats', icon: 'analytics' },
    { id: 'users', label: 'Users', icon: 'people' },
    { id: 'tools', label: 'Tools', icon: 'flash' },
    { id: 'payments', label: 'Payments', icon: 'card' },
    { id: 'support', label: 'Support', icon: 'chatbubbles' },
    { id: 'announce', label: 'Announce', icon: 'megaphone' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="menu-btn" onPress={openDrawer} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.menuBtn} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.id} testID={`tab-${tab.id}`} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? Colors.dark.primary : Colors.dark.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.dark.primary} />}>

        {activeTab === 'stats' && (
          <>
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Users', value: stats?.total_users || 0, icon: 'people', color: Colors.dark.primary },
                { label: 'Premium', value: stats?.premium_users || 0, icon: 'diamond', color: Colors.dark.secondary },
                { label: 'Generations', value: stats?.total_generations || 0, icon: 'flash', color: Colors.dark.warning },
                { label: 'Saved', value: stats?.total_saved || 0, icon: 'bookmark', color: Colors.dark.success },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                    <Ionicons name={s.icon as any} size={22} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            {stats?.recent_users?.map((u: any) => (
              <View key={u.user_id} style={styles.listRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.name?.charAt(0)?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{u.name}</Text>
                  <Text style={styles.rowSub}>{u.email}</Text>
                </View>
                <Text style={[styles.badge, u.subscription_status === 'premium' && styles.premBadge]}>{u.subscription_status}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <Text style={styles.countText}>{users.length} users total</Text>
            {users.map(u => (
              <View key={u.user_id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{u.name?.charAt(0)?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{u.name}</Text>
                    <Text style={styles.rowSub}>{u.email}</Text>
                    <Text style={styles.rowMeta}>Role: {u.role} · Uses: {u.tool_uses || 0}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, u.subscription_status === 'premium' ? styles.dangerBtn : styles.successBtn]}
                  onPress={() => togglePremium(u.user_id, u.subscription_status)}
                >
                  <Text style={[styles.actionBtnText, u.subscription_status === 'premium' ? { color: Colors.dark.error } : { color: Colors.dark.success }]}>
                    {u.subscription_status === 'premium' ? 'Remove Premium' : 'Grant Premium'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {activeTab === 'tools' && (
          <>
            <Text style={styles.countText}>{tools.length} tools</Text>
            {tools.map(t => (
              <View key={t.id} style={[styles.toolRow, !t.enabled && { opacity: 0.5 }]}>
                <View style={styles.toolLeft}>
                  <Ionicons name={(t.icon || 'flash') as any} size={18} color={t.enabled ? Colors.dark.primary : Colors.dark.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{t.name}</Text>
                    <Text style={styles.rowMeta}>{t.category} · {t.type}</Text>
                  </View>
                </View>
                <Switch value={t.enabled} onValueChange={() => toggleTool(t.id, t.enabled)}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.dark.primary + '60' }}
                  thumbColor={t.enabled ? Colors.dark.primary : Colors.dark.textMuted} />
              </View>
            ))}
          </>
        )}

        {activeTab === 'payments' && (
          <>
            <Text style={styles.countText}>{payments.length} transactions</Text>
            {payments.length === 0 && <Text style={styles.emptyText}>No payment history yet</Text>}
            {payments.map((p, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.payRow}>
                  <View style={[styles.payIcon, { backgroundColor: p.payment_status === 'paid' ? Colors.dark.success + '20' : Colors.dark.warning + '20' }]}>
                    <Ionicons name={p.payment_status === 'paid' ? 'checkmark-circle' : 'time'} size={20}
                      color={p.payment_status === 'paid' ? Colors.dark.success : Colors.dark.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{p.provider?.toUpperCase()} - {p.plan}</Text>
                    <Text style={styles.rowSub}>{p.user_id}</Text>
                    <Text style={styles.rowMeta}>{new Date(p.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.payAmount}>{p.currency === 'INR' ? '₹' : '$'}{p.amount}</Text>
                    <Text style={[styles.payStatus, p.payment_status === 'paid' && { color: Colors.dark.success }]}>{p.payment_status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'support' && (
          <>
            <Text style={styles.countText}>{supportMsgs.length} messages</Text>
            {supportMsgs.length === 0 && <Text style={styles.emptyText}>No support messages yet</Text>}
            {supportMsgs.map((m, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.msgHeader}>
                  <View style={[styles.msgTypeBadge, { backgroundColor: m.type === 'feedback' ? Colors.dark.success + '20' : Colors.dark.primary + '20' }]}>
                    <Text style={[styles.msgTypeText, { color: m.type === 'feedback' ? Colors.dark.success : Colors.dark.primary }]}>{m.type}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{new Date(m.created_at).toLocaleDateString()}</Text>
                </View>
                {m.subject ? <Text style={styles.msgSubject}>{m.subject}</Text> : null}
                <Text style={styles.msgBody}>{m.message}</Text>
                <Text style={styles.rowSub}>From: {m.user_name} ({m.user_email})</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'announce' && (
          <>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>New Announcement</Text>
              <TextInput style={styles.input} value={annTitle} onChangeText={setAnnTitle}
                placeholder="Announcement title" placeholderTextColor={Colors.dark.textMuted} />
              <TextInput style={[styles.input, { minHeight: 80 }]} value={annMessage} onChangeText={setAnnMessage}
                placeholder="Announcement message..." placeholderTextColor={Colors.dark.textMuted} multiline textAlignVertical="top" />
              <TouchableOpacity style={styles.submitBtn} onPress={sendAnnouncement} disabled={sending}>
                {sending ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <><Ionicons name="megaphone" size={18} color="#FFF" /><Text style={styles.submitBtnText}>Send Announcement</Text></>
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Previous Announcements</Text>
            {announcements.map((a, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.rowName}>{a.title}</Text>
                <Text style={styles.msgBody}>{a.message}</Text>
                <Text style={styles.rowMeta}>{new Date(a.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  accessDenied: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  adTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.dark.text },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  tabScroll: { backgroundColor: Colors.dark.paper, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  tabContent: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.dark.primary + '20' },
  tabText: { fontSize: FontSize.xs, color: Colors.dark.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.dark.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { width: '48%', backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.dark.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md },
  countText: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.dark.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  card: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(6,182,212,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.dark.primary },
  rowName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text },
  rowSub: { fontSize: FontSize.sm, color: Colors.dark.textMuted },
  rowMeta: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  badge: { fontSize: FontSize.xs, color: Colors.dark.textMuted, fontWeight: '600' },
  premBadge: { color: Colors.dark.secondary },
  actionBtn: { paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.12)' },
  successBtn: { backgroundColor: 'rgba(34,197,94,0.12)' },
  actionBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  toolLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  payIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text },
  payStatus: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.dark.warning },
  msgHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  msgTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  msgTypeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  msgSubject: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text, marginBottom: 4 },
  msgBody: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, lineHeight: 20, marginBottom: 6 },
  formCard: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  formLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.dark.background, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.md, color: Colors.dark.text, marginBottom: Spacing.md },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.primary, height: 48, borderRadius: BorderRadius.md },
  submitBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
});
