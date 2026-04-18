import React, { useState, createContext, useContext, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Animated,
  Dimensions, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { NavIcon } from '../../src/components/PremiumIcon';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = 290;

interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
}
const DrawerContext = createContext<DrawerContextType>({ openDrawer: () => {}, closeDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Dashboard', icon: 'grid-outline' as const, activeIcon: 'grid' as const, route: '/(main)/dashboard', path: '/dashboard' },
    { label: 'AI Tools', icon: 'flash-outline' as const, activeIcon: 'flash' as const, route: '/(main)/tools', path: '/tools' },
    { label: 'Marketplace', icon: 'storefront-outline' as const, activeIcon: 'storefront' as const, route: '/(main)/marketplace', path: '/marketplace' },
    { label: 'Wallet', icon: 'wallet-outline' as const, activeIcon: 'wallet' as const, route: '/(main)/wallet', path: '/wallet' },
    { label: 'Saved Outputs', icon: 'bookmark-outline' as const, activeIcon: 'bookmark' as const, route: '/(main)/saved', path: '/saved' },
    { label: 'Pricing', icon: 'diamond-outline' as const, activeIcon: 'diamond' as const, route: '/(main)/pricing', path: '/pricing' },
    { label: 'Help Center', icon: 'help-circle-outline' as const, activeIcon: 'help-circle' as const, route: '/(main)/help', path: '/help' },
    { label: 'Profile', icon: 'person-outline' as const, activeIcon: 'person' as const, route: '/(main)/profile', path: '/profile' },
  ];
  if (user?.role === 'admin') {
    menuItems.push({ label: 'Admin Panel', icon: 'shield-outline' as const, activeIcon: 'shield' as const, route: '/(main)/admin', path: '/admin' });
  }

  const handleNav = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 150);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <View style={styles.drawer}>
      {/* Neon glow line at top */}
      <LinearGradient
        colors={[Colors.dark.primary, Colors.dark.secondary, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topGlow}
      />

      {/* Header with avatar */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatarOuter}>
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.drawerName} numberOfLines={1}>{user?.name || 'User'}</Text>
        <Text style={styles.drawerEmail} numberOfLines={1}>{user?.email}</Text>
        <View style={[styles.badge, user?.subscription_status === 'premium' ? styles.premiumBadge : styles.freeBadge]}>
          <Ionicons
            name={user?.subscription_status === 'premium' ? 'diamond' : 'hourglass-outline'}
            size={10}
            color={user?.subscription_status === 'premium' ? Colors.dark.secondary : Colors.dark.primary}
          />
          <Text style={[styles.badgeText, user?.subscription_status === 'premium' ? { color: Colors.dark.secondary } : { color: Colors.dark.primary }]}>
            {user?.subscription_status === 'premium' ? 'PREMIUM' : 'FREE TRIAL'}
          </Text>
        </View>
      </View>

      {/* Navigation menu */}
      <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
        <Text style={styles.menuSectionLabel}>NAVIGATION</Text>
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.route}
              testID={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => handleNav(item.route)}
              activeOpacity={0.7}
            >
              {active && (
                <View style={styles.activeIndicator} />
              )}
              <NavIcon
                name={active ? item.activeIcon : item.icon}
                size={21}
                color={active ? Colors.dark.primary : Colors.dark.textSecondary}
                active={active}
              />
              <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
              {item.label === 'AI Tools' && (
                <View style={styles.toolsBadge}>
                  <Text style={styles.toolsBadgeText}>25</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <View style={styles.appVersion}>
          <Ionicons name="flash" size={14} color={Colors.dark.primary} />
          <Text style={styles.versionText}>AI Power Lab v1.0</Text>
        </View>
        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dark.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -DRAWER_WIDTH,
        damping: 20,
        stiffness: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setDrawerOpen(false);
    });
  };

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="tools" />
          <Stack.Screen name="marketplace" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="pricing" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="help" />
          <Stack.Screen name="tool/[id]" />
          <Stack.Screen name="product/[id]" />
        </Stack>

        {drawerOpen && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 999 }]}>
            <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
              <SidebarContent onClose={closeDrawer} />
            </Animated.View>
          </View>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'rgba(10, 10, 12, 0.97)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(6, 182, 212, 0.15)',
    zIndex: 100,
    elevation: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      // @ts-ignore - web only
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },
  drawer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  drawerHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  avatarOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: Spacing.sm,
  },
  avatarGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.primary },
  drawerName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: 2 },
  drawerEmail: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  premiumBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  freeBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.2 },
  drawerMenu: { flex: 1, paddingTop: Spacing.md, paddingHorizontal: Spacing.md },
  menuSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 3,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.dark.primary,
  },
  menuLabel: { fontSize: FontSize.md, color: Colors.dark.textSecondary, fontWeight: '500', flex: 1 },
  menuLabelActive: { color: Colors.dark.primary, fontWeight: '700' },
  toolsBadge: {
    backgroundColor: Colors.dark.primary + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  toolsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  drawerFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.md,
  },
  appVersion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  versionText: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: { fontSize: FontSize.md, color: Colors.dark.error, fontWeight: '600' },
});
