import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';

type OrderItem = {
  id: string;
  title_snapshot: string;
  quantity: number;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  profiles: { full_name: string } | null;
  order_items: OrderItem[];
};

export function SellerOrdersScreen({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount, created_at,
          profiles!buyer_id (full_name),
          order_items (id, title_snapshot, quantity)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as unknown as Order[]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateStatus = async (orderId: string, action: 'confirm_order' | 'reject_order' | 'complete_order') => {
    setActionLoading(orderId);
    try {
      const { error } = await supabase.rpc(action, { order_id_param: orderId });
      if (error) throw error;
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Ошибка изменения статуса', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const buyerName = item.profiles?.full_name || 'Неизвестный покупатель';
    const itemsText = item.order_items.map(i => `${i.title_snapshot} (x${i.quantity})`).join(', ');

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{item.id.split('-')[0]}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.info}>
          <Text style={styles.buyer}>Покупатель: {buyerName}</Text>
          <Text style={styles.items} numberOfLines={2}>{itemsText}</Text>
          <Text style={styles.total}>{item.total_amount} ₸</Text>
        </View>

        <View style={styles.actions}>
          {item.status === 'PENDING' && (
            <>
              <TouchableOpacity 
                style={[styles.btn, styles.btnAccept]} 
                onPress={() => updateStatus(item.id, 'confirm_order')}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.btnTextWhite}>Принять</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, styles.btnReject]} 
                onPress={() => updateStatus(item.id, 'reject_order')}
                disabled={actionLoading === item.id}
              >
                <Text style={styles.btnTextWhite}>Отклонить</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'CONFIRMED' && (
            <TouchableOpacity 
              style={[styles.btn, styles.btnComplete]} 
              onPress={() => updateStatus(item.id, 'complete_order')}
              disabled={actionLoading === item.id}
            >
              <Text style={styles.btnTextWhite}>Завершить сделку</Text>
            </TouchableOpacity>
          )}
          {actionLoading === item.id && <ActivityIndicator size="small" color="#10b981" />}
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
        <Text style={styles.headerTitle}>Продажи</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10b981"]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>У вас нет входящих заказов</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  statusBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  info: { marginBottom: 16 },
  buyer: { fontSize: 14, color: '#374151', marginBottom: 4 },
  items: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  total: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  btnAccept: { backgroundColor: '#10b981' },
  btnReject: { backgroundColor: '#ef4444' },
  btnComplete: { backgroundColor: '#3b82f6' },
  btnTextWhite: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
