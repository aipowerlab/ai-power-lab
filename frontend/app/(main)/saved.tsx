import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function SavedScreen() {
  const { openDrawer } = useDrawer();
  const [outputs, setOutputs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOutputs = useCallback(async () => {
    try {
      const data = await api.getOutputs();
      setOutputs(data.outputs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOutputs(); }, [fetchOutputs]);

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Output', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteOutput(id);
            setOutputs((prev) => prev.filter((o) => o.output_id !== id));
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Saved Outputs</Text>
        <View style={styles.menuBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOutputs(); }} tintColor={Colors.dark.primary} />}
      >
        {outputs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={Colors.dark.textMuted} />
            <Text style={styles.emptyTitle}>No saved outputs yet</Text>
            <Text style={styles.emptyDesc}>Generate content with AI tools and save your results here</Text>
          </View>
        ) : (
          outputs.map((output) => (
            <View key={output.output_id} style={styles.outputCard}>
              <View style={styles.outputHeader}>
                <View style={styles.outputMeta}>
                  <Text style={styles.outputTool}>{output.tool_name}</Text>
                  <Text style={styles.outputCategory}>{output.category}</Text>
                </View>
                <TouchableOpacity testID={`delete-${output.output_id}`} onPress={() => handleDelete(output.output_id)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.dark.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.outputText} numberOfLines={6}>{output.output}</Text>
              <Text style={styles.outputDate}>{new Date(output.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
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
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.dark.text },
  emptyDesc: { fontSize: FontSize.md, color: Colors.dark.textMuted, textAlign: 'center' },
  outputCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  outputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  outputMeta: { flex: 1 },
  outputTool: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text },
  outputCategory: { fontSize: FontSize.sm, color: Colors.dark.primary },
  outputText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  outputDate: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
});
