import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SettingsScreen({
  onNavigateBack,
  onLoggedOut
}: {
  onNavigateBack: () => void;
  onLoggedOut: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLoggedOut();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Вы уверены, что хотите навсегда удалить свой аккаунт? Ваши активные объявления будут скрыты. Исторические данные могут быть сохранены согласно Политике конфиденциальности.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: submitDeletionRequest
        }
      ]
    );
  };

  const submitDeletionRequest = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');
      
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({ user_id: user.id, reason: 'Запрошено из мобильного приложения' });
        
      if (error) throw error;
      
      Alert.alert('Запрос отправлен', 'Ваш аккаунт будет удален в течение 30 дней. Сейчас вы будете отключены.');
      await handleLogout();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки аккаунта</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Профиль</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Имя:</Text>
          <Text style={styles.value}>{profile?.full_name || 'Загрузка...'}</Text>
          
          <Text style={[styles.label, { marginTop: 12 }]}>Телефон:</Text>
          <Text style={styles.value}>{profile?.phone || 'Загрузка...'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Опасная зона</Text>
          <Text style={styles.dangerText}>Удаление аккаунта приведет к потере доступа к вашему профилю и скрытию ваших объявлений.</Text>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.deleteButtonText}>Удалить аккаунт</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 16 },
  backButtonText: { fontSize: 16, color: '#10b981' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#334155' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 16, fontWeight: '500', color: '#0f172a', marginTop: 4 },
  logoutButton: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#cbd5e1' },
  logoutButtonText: { color: '#334155', fontSize: 16, fontWeight: 'bold' },
  dangerZone: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  dangerTitle: { fontSize: 16, fontWeight: 'bold', color: '#b91c1c', marginBottom: 8 },
  dangerText: { fontSize: 14, color: '#991b1b', marginBottom: 16, lineHeight: 20 },
  deleteButton: { backgroundColor: '#fff', padding: 12, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  deleteButtonText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' }
});
