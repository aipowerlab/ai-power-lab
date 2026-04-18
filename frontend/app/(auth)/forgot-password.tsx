import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true); setError('');
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="key" size={48} color={Colors.dark.primary} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {sent ? 'Check your email for the reset link' : 'Enter your email to receive a reset link'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {sent ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.dark.success} />
            <Text style={styles.successText}>Reset link sent! Check your email.</Text>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="forgot-email-input"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.dark.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              testID="forgot-submit-btn"
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.dark.text },
  subtitle: { fontSize: FontSize.md, color: Colors.dark.textSecondary, textAlign: 'center' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: BorderRadius.sm,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { color: Colors.dark.error, fontSize: FontSize.sm },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: BorderRadius.md, padding: Spacing.lg,
  },
  successText: { color: Colors.dark.success, fontSize: FontSize.md, fontWeight: '600' },
  form: { gap: Spacing.md },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBg,
    borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.dark.text, fontSize: FontSize.md },
  primaryBtn: {
    height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
});
