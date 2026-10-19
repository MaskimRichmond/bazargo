import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const THEME = {
  bg: '#090A0F',
  card: '#131620',
  cardBorder: '#1F2433',
  inputBg: '#181C2A',
  inputBorder: '#272E43',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#10B981',
  accentBg: 'rgba(16, 185, 129, 0.12)',
  accentBorder: 'rgba(16, 185, 129, 0.3)',
};

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Ошибка авторизации', error.message);
    } else {
      onLoginSuccess();
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Ошибка регистрации', error.message);
    } else {
      Alert.alert('Успех', 'Пожалуйста, проверьте свою почту для подтверждения аккаунта.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Feather name="cpu" size={24} color={THEME.accent} />
          </View>
          <Text style={styles.brandTitle}>BazaarOS</Text>
          <Text style={styles.brandSubtitle}>B2B-платформа AI-снабжения</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>Вход в аккаунт</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Корпоративный или личный Email</Text>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              placeholder="buyer@company.kg"
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              placeholder="Пароль"
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={THEME.accent} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={signInWithEmail}>
                <Text style={styles.primaryButtonText}>Войти</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={signUpWithEmail}>
                <Text style={styles.secondaryButtonText}>Создать аккаунт</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.accentBorder,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: THEME.textPrimary,
  },
  buttonContainer: {
    marginTop: 8,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: THEME.accent,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#090A0F',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.accent,
  },
  secondaryButtonText: {
    color: THEME.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
