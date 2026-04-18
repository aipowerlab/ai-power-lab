import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function ToolsScreen() {
  const router = useRouter();
  const { openDrawer } = useDrawer();
  const [tools, setTools] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTools();
        setTools(data.tools || []);
        setCategories(data.categories || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filteredTools = tools.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || t.category === activeCategory;
    return matchSearch && matchCat && t.enabled;
  });

  const getCategoryColor = (cat: string) => {
    const c = categories.find((c) => c.name === cat);
    return c?.color || Colors.dark.primary;
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="menu-btn" onPress={openDrawer} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Tools</Text>
        <View style={styles.menuBtn} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.dark.textMuted} />
        <TextInput
          testID="tools-search-input"
          style={styles.searchInput}
          placeholder="Search AI tools..."
          placeholderTextColor={Colors.dark.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        <TouchableOpacity
          testID="category-all"
          style={[styles.catChip, !activeCategory && styles.catChipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.catChipText, !activeCategory && styles.catChipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            testID={`category-${cat.id}`}
            style={[styles.catChip, activeCategory === cat.name && { backgroundColor: cat.color + '30', borderColor: cat.color }]}
            onPress={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
          >
            <Text style={[styles.catChipText, activeCategory === cat.name && { color: cat.color }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.toolsList} contentContainerStyle={styles.toolsContent}>
        <Text style={styles.resultsCount}>{filteredTools.length} tools available</Text>
        {filteredTools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            testID={`tool-card-${tool.id}`}
            style={styles.toolCard}
            onPress={() => router.push(`/(main)/tool/${tool.id}` as any)}
          >
            <View style={[styles.toolIconBg, { backgroundColor: getCategoryColor(tool.category) + '20' }]}>
              <Ionicons name={(tool.icon || 'flash') as any} size={24} color={getCategoryColor(tool.category)} />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDesc} numberOfLines={2}>{tool.description}</Text>
              <View style={styles.toolMeta}>
                <View style={[styles.catBadge, { backgroundColor: getCategoryColor(tool.category) + '15' }]}>
                  <Text style={[styles.catBadgeText, { color: getCategoryColor(tool.category) }]}>{tool.category}</Text>
                </View>
                {tool.type === 'image' && (
                  <View style={[styles.catBadge, { backgroundColor: Colors.dark.warning + '15' }]}>
                    <Ionicons name="image" size={12} color={Colors.dark.warning} />
                    <Text style={[styles.catBadgeText, { color: Colors.dark.warning }]}>Image</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBg,
    borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, height: 48, margin: Spacing.md, gap: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: FontSize.md },
  catScroll: { maxHeight: 48 },
  catContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.cardBg,
  },
  catChipActive: { backgroundColor: Colors.dark.primary + '20', borderColor: Colors.dark.primary },
  catChipText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: Colors.dark.primary },
  toolsList: { flex: 1 },
  toolsContent: { padding: Spacing.md, paddingBottom: 100 },
  resultsCount: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.md },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.cardBg,
    borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md,
  },
  toolIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolInfo: { flex: 1 },
  toolName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text, marginBottom: 2 },
  toolDesc: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.xs },
  toolMeta: { flexDirection: 'row', gap: Spacing.xs },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
});
