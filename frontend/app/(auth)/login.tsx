import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, setUser } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(main)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/google-callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      const redirectUrl = `${BACKEND_URL}/google-callback`;
      Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={40} color={Colors.dark.primary} />
          </View>
          <Text style={styles.title}>AI Power Lab</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={18} color={Colors.dark.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(''); if (email && password) handleLogin(); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.dark.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.dark.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} testID="toggle-password-btn">
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} testID="forgot-password-link">
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="login-submit-btn"
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity testID="google-login-btn" style={styles.googleBtn} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color="#FFF" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} testID="register-link">
            <Text style={styles.footerLink}>Sign Up</Text>
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
    width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.dark.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.dark.textSecondary },
  errorBox: {
    flexDirection: 'column', backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  errorContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  errorText: { color: Colors.dark.error, fontSize: FontSize.sm, flex: 1 },
  retryBtn: { backgroundColor: Colors.dark.primary, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
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
  forgotText: { color: Colors.dark.primary, fontSize: FontSize.sm, textAlign: 'right', fontWeight: '600' },
  primaryBtn: {
    height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dark.primary, marginTop: Spacing.sm,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dividerText: { color: Colors.dark.textMuted, marginHorizontal: Spacing.md, fontSize: FontSize.sm },
  googleBtn: {
    height: 52, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: Colors.dark.border, gap: Spacing.sm,
  },
  googleBtnText: { color: Colors.dark.text, fontSize: FontSize.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSize.md },
  footerLink: { color: Colors.dark.primary, fontSize: FontSize.md, fontWeight: '700' },
});
