import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

import { Listing } from '@bazargo/shared';

export function CatalogScreen({ 
  onNavigateToCart, 
  onNavigateToB2B,
  onNavigateToMyListings,
  onNavigateToSellerOrders,
  onNavigateToProduct,
  onNavigateToSettings
}: { 
  onNavigateToCart: () => void, 
  onNavigateToB2B: () => void,
  onNavigateToMyListings: () => void,
  onNavigateToSellerOrders: () => void,
  onNavigateToProduct: (id: string) => void,
  onNavigateToSettings: () => void
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = async () => {
    try {
      setError(null);
      
      const { data, error: sbError } = await supabase
        .from('listings')
        .select('id, title, price, city, status, listing_images(url)')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;
      
      setListings(data || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки каталога');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleAddToCart = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .single();
        
      if (existing) {
        await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({ user_id: user.id, listing_id: listingId, quantity: 1 });
      }
      Alert.alert('Успех', 'Товар добавлен в корзину');
    } catch (err: any) {
      Alert.alert('Ошибка добавления', err.message);
    }
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const imageUrl = item.listing_images && item.listing_images.length > 0 
      ? item.listing_images[0].url 
      : 'https://via.placeholder.com/150';

    return (
      <View style={styles.card}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => onNavigateToProduct(item.id)}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.price}>{item.price} ₸</Text>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.city}>{item.city}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          <TouchableOpacity 
            style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6, alignItems: 'center' }}
            onPress={() => handleAddToCart(item.id)}
          >
            <Text style={{ color: '#10b981', fontWeight: 'bold' }}>В корзину</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BazarGo</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={onNavigateToB2B}>
            <Text style={{ color: "#3b82f6", fontWeight: "bold" }}>B2B</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNavigateToCart}>
            <Text style={{ color: "#10b981", fontWeight: "bold" }}>Корзина</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onNavigateToSettings}>
            <Text style={{ color: "#6b7280", fontWeight: "bold" }}>Настройки</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', padding: 10, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
        <TouchableOpacity style={styles.sellerBtn} onPress={onNavigateToMyListings}>
          <Text style={styles.sellerBtnText}>Мои товары</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sellerBtn} onPress={onNavigateToSellerOrders}>
          <Text style={styles.sellerBtnText}>Продажи</Text>
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchListings} style={styles.retryButton}>
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={(item: Listing) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10b981"]} />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Каталог пуст</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  list: {
    padding: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
  },
  info: {
    padding: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  city: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorBox: {
    padding: 16,
    margin: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
  sellerBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sellerBtnText: {
    color: '#374151',
    fontWeight: 'bold',
  }
});
