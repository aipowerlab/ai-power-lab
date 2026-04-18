import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function NotificationsScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markRead = async () => {
    try { await api.markNotificationsRead(); setUnread(0); setNotifications(n => n.map(x => ({...x, read: true}))); } catch {}
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return { name: 'checkmark-circle', color: Colors.dark.success };
      case 'warning': return { name: 'alert-circle', color: Colors.dark.warning };
      case 'error': return { name: 'close-circle', color: Colors.dark.error };
      default: return { name: 'information-circle', color: Colors.dark.primary };
    }
  };

  if (loading) return <View style={s.loadingC}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn}><Ionicons name="menu" size={26} color={Colors.dark.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity style={s.menuBtn} onPress={markRead}><Text style={s.markReadText}>Read all</Text></TouchableOpacity>
        ) : <View style={s.menuBtn} />}
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.dark.primary} />}>
        {notifications.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={Colors.dark.textMuted} />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyText}>You'll see payment confirmations, sale alerts, and more here</Text>
          </View>
        ) : notifications.map((n: any, i: number) => {
          const icon = getIcon(n.type);
          return (
            <TouchableOpacity key={i} style={[s.notifCard, !n.read && s.notifUnread]}
              onPress={() => n.link && router.push(n.link as any)}>
              <View style={[s.notifIcon, { backgroundColor: icon.color + '20' }]}>
                <Ionicons name={icon.name as any} size={22} color={icon.color} />
              </View>
              <View style={s.notifContent}>
                <Text style={s.notifTitle}>{n.title}</Text>
                <Text style={s.notifMsg} numberOfLines={2}>{n.message}</Text>
                <Text style={s.notifTime}>{new Date(n.created_at).toLocaleString()}</Text>
              </View>
              {!n.read && <View style={s.unreadDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingC: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  menuBtn: { width: 64, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  markReadText: { fontSize: FontSize.sm, color: Colors.dark.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text },
  emptyText: { fontSize: FontSize.sm, color: Colors.dark.textMuted, textAlign: 'center', paddingHorizontal: Spacing.xl },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.sm },
  notifUnread: { borderColor: Colors.dark.primary + '40', backgroundColor: Colors.dark.primary + '08' },
  notifIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text, marginBottom: 4 },
  notifMsg: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, lineHeight: 20, marginBottom: 4 },
  notifTime: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary, marginTop: 6 },
});
