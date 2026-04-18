import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { api } from '../../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import * as Clipboard from 'expo-clipboard';

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [tool, setTool] = useState<any>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTool(id || '');
        setTool(data);
        const initialInputs: Record<string, string> = {};
        data.inputs?.forEach((inp: any) => { initialInputs[inp.key] = ''; });
        setInputs(initialInputs);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleGenerate = async () => {
    const emptyFields = Object.entries(inputs).filter(([_, v]) => !v.trim());
    if (emptyFields.length > 0) {
      setError('Please fill in all fields');
      return;
    }
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const data = await api.generate(id || '', inputs);
      setResult(data);
      await refreshUser();
    } catch (e: any) {
      if (e.message?.includes('Free trial limit')) {
        setShowUpgrade(true);
      } else {
        setError(e.message || 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (result?.result) {
      await Clipboard.setStringAsync(result.type === 'image' ? 'Image copied to clipboard' : result.result);
      Alert.alert('Copied!', 'Result copied to clipboard');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await api.saveOutput({
        tool_id: id || '',
        tool_name: tool?.name || '',
        category: tool?.category || '',
        output: result.type === 'image' ? `[IMAGE]${result.result.substring(0, 100)}...` : result.result,
        inputs,
      });
      Alert.alert('Saved!', 'Output saved to your dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.menuBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tool?.name || 'AI Tool'}</Text>
        <View style={styles.menuBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.toolHeader}>
          <View style={[styles.toolIconBg, { backgroundColor: Colors.dark.primary + '20' }]}>
            <Ionicons name={(tool?.icon || 'flash') as any} size={28} color={Colors.dark.primary} />
          </View>
          <Text style={styles.toolName}>{tool?.name}</Text>
          <Text style={styles.toolDesc}>{tool?.description}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{tool?.type === 'image' ? 'Image Generation' : 'Text Generation'}</Text>
          </View>
        </View>

        <View style={styles.inputsSection}>
          <Text style={styles.sectionTitle}>Configure Your Input</Text>
          {tool?.inputs?.map((inp: any) => (
            <View key={inp.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{inp.label}</Text>
              <TextInput
                testID={`tool-input-${inp.key}`}
                style={styles.textInput}
                placeholder={inp.placeholder}
                placeholderTextColor={Colors.dark.textMuted}
                value={inputs[inp.key] || ''}
                onChangeText={(val) => setInputs((prev) => ({ ...prev, [inp.key]: val }))}
                multiline={inp.key === 'description' || inp.key === 'goals'}
              />
            </View>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.dark.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          testID="generate-btn"
          style={[styles.generateBtn, generating && styles.disabledBtn]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <View style={styles.genBtnContent}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.generateBtnText}>Generating...</Text>
            </View>
          ) : (
            <View style={styles.genBtnContent}>
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.generateBtnText}>Generate</Text>
            </View>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Result</Text>
              <View style={styles.resultActions}>
                <TouchableOpacity testID="copy-btn" style={styles.actionBtn} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={20} color={Colors.dark.primary} />
                </TouchableOpacity>
                <TouchableOpacity testID="save-btn" style={styles.actionBtn} onPress={handleSave}>
                  <Ionicons name="bookmark-outline" size={20} color={Colors.dark.secondary} />
                </TouchableOpacity>
              </View>
            </View>
            {result.type === 'image' ? (
              <View style={styles.imageResult}>
                <Image
                  source={{ uri: `data:image/png;base64,${result.result}` }}
                  style={styles.generatedImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.textResult}>
                <Text style={styles.resultText} selectable>{result.result}</Text>
              </View>
            )}
          </View>
        )}

        {showUpgrade && (
          <View style={styles.upgradeModal}>
            <Ionicons name="lock-closed" size={40} color={Colors.dark.secondary} />
            <Text style={styles.upgradeTitle}>Free Trial Limit Reached</Text>
            <Text style={styles.upgradeDesc}>You've used all 3 free tool uses. Upgrade to Premium for unlimited access.</Text>
            <TouchableOpacity testID="upgrade-btn" style={styles.upgradeBtn} onPress={() => { setShowUpgrade(false); router.push('/(main)/pricing'); }}>
              <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowUpgrade(false)}>
              <Text style={styles.upgradeLater}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  toolHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  toolIconBg: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  toolName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text, marginBottom: Spacing.xs, textAlign: 'center' },
  toolDesc: { fontSize: FontSize.md, color: Colors.dark.textSecondary, textAlign: 'center', marginBottom: Spacing.sm },
  typeBadge: { backgroundColor: Colors.dark.primary + '20', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full },
  typeBadgeText: { fontSize: FontSize.xs, color: Colors.dark.primary, fontWeight: '700' },
  inputsSection: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.md },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textSecondary, marginBottom: Spacing.xs },
  textInput: {
    backgroundColor: Colors.dark.inputBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    color: Colors.dark.text, fontSize: FontSize.md, minHeight: 48,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  errorText: { color: Colors.dark.error, fontSize: FontSize.sm, flex: 1 },
  generateBtn: {
    height: 56, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dark.primary, marginBottom: Spacing.lg,
  },
  disabledBtn: { opacity: 0.6 },
  genBtnContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  generateBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  resultSection: { marginTop: Spacing.md },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  resultActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.dark.cardBg,
    borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center',
  },
  imageResult: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.dark.border },
  generatedImage: { width: '100%', aspectRatio: 1 },
  textResult: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  resultText: { color: Colors.dark.text, fontSize: FontSize.md, lineHeight: 24 },
  upgradeModal: {
    backgroundColor: Colors.dark.paper, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.lg,
  },
  upgradeTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.dark.text, marginTop: Spacing.md },
  upgradeDesc: { fontSize: FontSize.md, color: Colors.dark.textSecondary, textAlign: 'center', marginVertical: Spacing.md },
  upgradeBtn: {
    width: '100%', height: 52, borderRadius: BorderRadius.md, alignItems: 'center',
    justifyContent: 'center', backgroundColor: Colors.dark.secondary, marginTop: Spacing.sm,
  },
  upgradeBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  upgradeLater: { color: Colors.dark.textMuted, fontSize: FontSize.md, marginTop: Spacing.md },
});
