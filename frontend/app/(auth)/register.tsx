import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email, password, name);
      router.replace('/(main)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={40} color={Colors.dark.secondary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your AI journey with 3 free uses</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.dark.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="register-name-input"
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={Colors.dark.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="register-email-input"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.dark.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="register-password-input"
                style={styles.input}
                placeholder="Min 6 characters"
                placeholderTextColor={Colors.dark.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            testID="register-submit-btn"
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.trialBadge}>
            <Ionicons name="gift" size={18} color={Colors.dark.primary} />
            <Text style={styles.trialText}>3 free AI tool uses included!</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} testID="login-link">
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(236, 72, 153, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.dark.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  errorText: { color: Colors.dark.error, fontSize: FontSize.sm, flex: 1 },
  form: { gap: Spacing.md },
  inputGroup: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.textSecondary },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.inputBg,
    borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.dark.text, fontSize: FontSize.md },
  primaryBtn: {
    height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dark.secondary, marginTop: Spacing.sm,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  trialText: { color: Colors.dark.primary, fontSize: FontSize.sm, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSize.md },
  footerLink: { color: Colors.dark.secondary, fontSize: FontSize.md, fontWeight: '700' },
});
