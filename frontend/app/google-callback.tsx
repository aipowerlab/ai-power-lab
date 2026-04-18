import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/utils/api';
import { Colors } from '../src/constants/theme';

export default function GoogleCallback() {
  const router = useRouter();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const processSession = async () => {
      try {
        let sessionId = '';
        if (Platform.OS === 'web') {
          const hash = window.location.hash;
          if (hash.includes('session_id=')) {
            sessionId = hash.split('session_id=')[1]?.split('&')[0] || '';
          }
        }
        if (!sessionId) {
          router.replace('/(auth)/login');
          return;
        }
        const userData = await api.googleSession(sessionId);
        if (userData.access_token) {
          const { setAccessToken } = require('../src/utils/api');
          setAccessToken(userData.access_token);
        }
        setUser(userData);
        router.replace('/(main)/dashboard');
      } catch (e) {
        console.error('Google auth error:', e);
        router.replace('/(auth)/login');
      }
    };

    processSession();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { color: Colors.dark.textSecondary, fontSize: 16 },
});
