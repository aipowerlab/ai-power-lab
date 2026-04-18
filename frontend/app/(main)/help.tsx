import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function HelpScreen() {
  const { openDrawer } = useDrawer();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'feedback'>('faq');
  const [faqs, setFaqs] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getFaq().then((d) => setFaqs(d.faqs || [])).catch(() => {});
  }, []);

  const handleSubmit = async (type: string) => {
    if (!message.trim()) {
      Alert.alert('Required', 'Please enter your message');
      return;
    }
    setSending(true);
    try {
      const result = await api.submitSupportMessage({ type, subject, message, email: user?.email });
      Alert.alert('Sent!', result.message || 'Your message has been submitted.');
      setSubject('');
      setMessage('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message');
    } finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity testID="menu-btn" onPress={openDrawer} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={styles.menuBtn} />
        </View>

        <View style={styles.tabs}>
          {([
            { id: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
            { id: 'contact', label: 'Contact', icon: 'mail-outline' },
            { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              testID={`tab-${tab.id}`}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? Colors.dark.primary : Colors.dark.textMuted} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {activeTab === 'faq' && (
            <>
              <Text style={styles.sectionDesc}>Find answers to commonly asked questions</Text>
              {faqs.map((faq, i) => (
                <TouchableOpacity key={i} style={styles.faqCard} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)} activeOpacity={0.7}>
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQ}>{faq.q}</Text>
                    <Ionicons name={expandedFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.dark.textMuted} />
                  </View>
                  {expandedFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <Text style={styles.sectionDesc}>Have a question? We're here to help.</Text>
              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Ionicons name="mail" size={20} color={Colors.dark.primary} />
                  <Text style={styles.contactText}>support@aipowerlab.com</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="time" size={20} color={Colors.dark.primary} />
                  <Text style={styles.contactText}>Response within 24 hours</Text>
                </View>
              </View>
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="What's this about?"
                  placeholderTextColor={Colors.dark.textMuted}
                />
                <Text style={styles.formLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your issue or question..."
                  placeholderTextColor={Colors.dark.textMuted}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => handleSubmit('contact')}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="send" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Send Message</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === 'feedback' && (
            <>
              <Text style={styles.sectionDesc}>Help us improve AI Power Lab with your feedback</Text>
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Your Feedback</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Share your thoughts, suggestions, or feature requests..."
                  placeholderTextColor={Colors.dark.textMuted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: Colors.dark.success }]}
                  onPress={() => handleSubmit('feedback')}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="heart" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Submit Feedback</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  tabs: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.sm, backgroundColor: Colors.dark.paper, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
  },
  tabActive: { backgroundColor: Colors.dark.primary + '20' },
  tabText: { fontSize: FontSize.sm, color: Colors.dark.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.dark.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  sectionDesc: { fontSize: FontSize.md, color: Colors.dark.textMuted, marginBottom: Spacing.lg },
  faqCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text, flex: 1, marginRight: 8 },
  faqA: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
  contactInfo: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.md,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contactText: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
  formCard: {
    backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  formLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.dark.background, borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.md, color: Colors.dark.text, marginBottom: Spacing.md,
  },
  textArea: { minHeight: 120 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.dark.primary, height: 48, borderRadius: BorderRadius.md,
  },
  submitBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
});
