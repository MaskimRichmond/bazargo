import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { updateCartQuantitySchema } from '@bazargo/shared';

type CartListing = {
  id: string;
  title: string;
  price: number;
  city: string;
  status: string;
  listing_images?: { url: string }[];
  quantity: number;
  listing_type: string;
};

type CartItem = {
  id: string;
  quantity: number;
  listings: CartListing;
};

export function CartScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          listings (
            id, title, price, city, status, quantity, listing_type,
            listing_images(url)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setItems(data as unknown as CartItem[]);
    } catch (err: any) {
      Alert.alert('Ошибка загрузки корзины', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart();
  };

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await supabase.from('cart_items').delete().eq('id', cartItemId);
      } else {
        const parsed = updateCartQuantitySchema.safeParse({ cartItemId, newQuantity });
        if (!parsed.success) {
          Alert.alert('Ошибка', parsed.error.errors[0].message);
          return;
        }

        const item = items.find(i => i.id === cartItemId);
        if (item && item.listings.listing_type === 'INVENTORY' && newQuantity > item.listings.quantity) {
          Alert.alert('Ошибка', `Доступно только ${item.listings.quantity} шт.`);
          return;
        }

        await supabase.from('cart_items').update({ quantity: newQuantity }).eq('id', cartItemId);
      }
      fetchCart();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_orders_from_cart');
      if (error) throw error;
      
      Alert.alert('Успех', 'Заказ успешно оформлен!');
      fetchCart();
    } catch (err: any) {
      Alert.alert('Ошибка оформления', err.message || 'Повторите попытку.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const listing = item.listings;
    const imageUrl = listing.listing_images && listing.listing_images.length > 0 
      ? listing.listing_images[0].url 
      : 'https://via.placeholder.com/150';

    return (
      <View style={styles.card}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.price}>{listing.price} ₸</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={styles.btn}>
              <Text style={styles.btnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={styles.btn}>
              <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const total = items.reduce((acc, item) => acc + (item.listings.price * item.quantity), 0);

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
        <Text style={styles.headerTitle}>Корзина</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10b981"]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Корзина пуста</Text>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>Итого: {total} ₸</Text>
          <TouchableOpacity 
            style={[styles.checkoutBtn, checkoutLoading && { opacity: 0.7 }]} 
            onPress={handleCheckout}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutBtnText}>Оформить заказ</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  btn: { width: 32, height: 32, backgroundColor: '#f3f4f6', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  quantityText: { marginHorizontal: 16, fontSize: 16, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  checkoutBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
