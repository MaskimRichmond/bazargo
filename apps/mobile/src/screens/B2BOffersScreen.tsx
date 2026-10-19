import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';

type B2BOffer = {
  id: string;
  status: string;
  offered_price: number | null;
  requested_price: number;
  offered_quantity: number | null;
  requested_quantity: number;
  listings: { title: string };
};

export function B2BOffersScreen({ onBack }: { onBack: () => void }) {
  const [offers, setOffers] = useState<B2BOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('b2b_offers')
        .select(`
          id, status, offered_price, requested_price, offered_quantity, requested_quantity,
          listings (title)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'ACCEPTED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data as unknown as B2BOffer[]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleB2BCheckout = async (offerId: string) => {
    setCheckoutLoading(offerId);
    try {
      const { error } = await supabase.rpc('create_order_from_b2b_offer', { p_offer_id: offerId });
      
      if (error) throw error;
      
      Alert.alert('Успех', 'B2B-заказ успешно оформлен!');
      fetchOffers(); // Refresh to remove the offer or change state
    } catch (err: any) {
      Alert.alert('Ошибка оформления', err.message || 'Повторите попытку.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const renderItem = ({ item }: { item: B2BOffer }) => {
    const price = item.offered_price || item.requested_price;
    const qty = item.offered_quantity || item.requested_quantity;
    
    return (
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.listings?.title || 'Товар'}</Text>
          <Text style={styles.details}>Цена: {price} ₸ x {qty} шт.</Text>
          <Text style={styles.total}>Итого: {price * qty} ₸</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutBtn, checkoutLoading === item.id && { opacity: 0.7 }]}
          onPress={() => handleB2BCheckout(item.id)}
          disabled={checkoutLoading === item.id}
        >
          {checkoutLoading === item.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Оформить</Text>
          )}
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>B2B Сделки</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={offers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOffers(); }} colors={["#10b981"]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Нет одобренных предложений</Text>
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
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  info: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  details: { fontSize: 14, color: '#4b5563' },
  total: { fontSize: 16, fontWeight: 'bold', color: '#10b981', marginTop: 4 },
  checkoutBtn: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
