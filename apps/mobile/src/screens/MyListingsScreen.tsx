import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, RefreshControl, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Listing } from '@bazargo/shared';

export function MyListingsScreen({ onBack, onNavigateToForm }: { onBack: () => void, onNavigateToForm: (id?: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, status, listing_images(url)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data as unknown as Listing[]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyListings();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      const { data, error } = await supabase.from('listings').update({ status: newStatus }).eq('id', id).eq('seller_id', user.id).select('id');
      if (!data || data.length === 0) throw new Error('Нет доступа');
      if (error) throw error;
      fetchMyListings();
    } catch (err: any) {
      Alert.alert('Ошибка обновления', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Удалить объявление?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Unauthorized');
            const { data, error } = await supabase.from('listings').update({ status: 'ARCHIVED' }).eq('id', id).eq('seller_id', user.id).select('id');
            if (!data || data.length === 0) throw new Error('Нет доступа');
            if (error) throw error;
            fetchMyListings();
          } catch (err: any) {
            Alert.alert('Ошибка удаления', err.message);
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const imageUrl = item.listing_images && item.listing_images.length > 0 
      ? item.listing_images[0].url 
      : 'https://via.placeholder.com/150';

    return (
      <View style={styles.card}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.price}>{item.price} ₸</Text>
          <Text style={styles.status}>Статус: {item.status}</Text>
          
          <View style={styles.actions}>
            {item.status === 'ACTIVE' ? (
              <TouchableOpacity onPress={() => handleStatusChange(item.id, 'DEACTIVATED')} style={styles.btnOutline}>
                <Text style={styles.btnTextOutline}>Снять</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => handleStatusChange(item.id, 'ACTIVE')} style={styles.btnOutline}>
                <Text style={styles.btnTextOutline}>Вкл</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onNavigateToForm(item.id)} style={styles.btnOutline}>
              <Text style={styles.btnTextOutline}>Изменить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.btnDelete}>
              <Text style={styles.btnTextDelete}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мои товары</Text>
        <TouchableOpacity onPress={() => onNavigateToForm()}>
          <Text style={{color: '#10b981', fontWeight: 'bold'}}>Добавить</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10b981"]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>У вас нет объявлений</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  backText: { color: '#6b7280', fontSize: 16 },
  list: { padding: 10 },
  card: {
    backgroundColor: '#fff',
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e5e7eb' },
  info: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  title: { fontSize: 14, color: '#374151' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  status: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  btnOutline: { borderWidth: 1, borderColor: '#10b981', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnTextOutline: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  btnDelete: { backgroundColor: '#ef4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnTextDelete: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
