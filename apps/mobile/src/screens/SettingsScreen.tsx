import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
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
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
};

export function SettingsScreen({
  onNavigateBack,
  onLoggedOut,
}: {
  onNavigateBack?: () => void;
  onLoggedOut: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<'buyer' | 'supplier' | 'both'>('buyer');

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setFullName(data.full_name || '');
        setCompanyName(data.company_name || '');
        setPhone(data.phone || '');
        setTelegramUsername(data.telegram_username ? data.telegram_username.replace('@', '') : '');
        if (data.b2b_role) {
          setRole(data.b2b_role);
        }
      }
    } catch (err: any) {
      console.warn('Error fetching profile:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Не авторизован');

      const cleanTg = telegramUsername.trim() ? telegramUsername.trim().replace(/^@/, '') : null;

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        phone: phone.trim() || null,
        telegram_username: cleanTg,
        b2b_role: role,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      Alert.alert('Успех', 'Данные профиля успешно сохранены');
    } catch (err: any) {
      Alert.alert('Ошибка сохранения', err.message || 'Не удалось обновить профиль');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Выход из аккаунта', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          onLoggedOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Вы уверены, что хотите навсегда удалить свой аккаунт? Ваши активные тендеры будут закрыты.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить аккаунт',
          style: 'destructive',
          onPress: submitDeletionRequest,
        },
      ]
    );
  };

  const submitDeletionRequest = async () => {
    setDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Не авторизован');

      const { error } = await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        reason: 'Запрос на удаление из мобильного приложения BazaarOS',
      });

      if (error) throw error;

      Alert.alert(
        'Запрос отправлен',
        'Ваш аккаунт будет удален в течение 30 дней. Сейчас сессия будет завершена.'
      );
      await supabase.auth.signOut();
      onLoggedOut();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.accent} />
          <Text style={styles.loadingText}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {onNavigateBack ? (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Feather name="arrow-left" size={18} color={THEME.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.headerTitle}>Профиль и настройки</Text>
          <Text style={styles.headerSubtitle}>Управление аккаунтом компании</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={16} color={THEME.accent} />
            <Text style={styles.cardTitle}>Контактные данные B2B</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email (аккаунт)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userEmail}
              editable={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ФИО представителя</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Азамат Токтогулов"
              placeholderTextColor={THEME.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Название компании / ИП</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Сеть кофеен «Bishkek Coffee» или ОсОО"
              placeholderTextColor={THEME.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Телефон</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+996 555 123 456"
              placeholderTextColor={THEME.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Telegram @username (для оповещений)</Text>
            <TextInput
              style={styles.input}
              value={telegramUsername}
              onChangeText={setTelegramUsername}
              placeholder="@username"
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Основная роль на платформе</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleChip, role === 'buyer' && styles.roleChipActive]}
                onPress={() => setRole('buyer')}
              >
                <Text style={[styles.roleChipText, role === 'buyer' && styles.roleChipTextActive]}>
                  Закупщик
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleChip, role === 'supplier' && styles.roleChipActive]}
                onPress={() => setRole('supplier')}
              >
                <Text
                  style={[styles.roleChipText, role === 'supplier' && styles.roleChipTextActive]}
                >
                  Поставщик
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleChip, role === 'both' && styles.roleChipActive]}
                onPress={() => setRole('both')}
              >
                <Text style={[styles.roleChipText, role === 'both' && styles.roleChipTextActive]}>
                  Обе роли
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#090A0F" />
            ) : (
              <>
                <Feather name="check" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>Сохранить изменения</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* System Information */}
        <View style={styles.systemCard}>
          <Text style={styles.systemTitle}>О платформе</Text>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Версия системы:</Text>
            <Text style={styles.systemValue}>BazaarOS v1.0.0</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>AI-ядро:</Text>
            <Text style={styles.systemValue}>Gemini Flash + Local RFQ Parser</Text>
          </View>
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Регион:</Text>
            <Text style={styles.systemValue}>Кыргызстан (B2B)</Text>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={THEME.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Опасная зона</Text>
          <Text style={styles.dangerText}>
            Удаление аккаунта приведет к закрытию ваших активных заявок и скрытию предложений.
          </Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={THEME.danger} />
            ) : (
              <>
                <Feather name="trash-2" size={14} color={THEME.danger} style={{ marginRight: 6 }} />
                <Text style={styles.deleteBtnText}>Удалить аккаунт</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    color: THEME.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  disabledInput: {
    opacity: 0.6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  roleChipActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accent,
  },
  roleChipText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  roleChipTextActive: {
    color: THEME.accent,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  saveButtonText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '700',
  },
  systemCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  systemTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  systemLabel: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  systemValue: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.card,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  logoutBtnText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.dangerBorder,
  },
  dangerTitle: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  dangerText: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.dangerBg,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.dangerBorder,
  },
  deleteBtnText: {
    color: THEME.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: THEME.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
});
