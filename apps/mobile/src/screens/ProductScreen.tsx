import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ProductScreen({
  productId,
  onNavigateBack,
  onNavigateToCart
}: {
  productId: string;
  onNavigateBack: () => void;
  onNavigateToCart: () => void;
}) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles!seller_id(id, full_name, phone),
        listing_images(url)
      `)
      .eq('id', productId)
      .single();

    if (error || !data) {
      Alert.alert('Ошибка', 'Не удалось загрузить товар');
      onNavigateBack();
      return;
    }
    setProduct(data);
    setLoading(false);
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Требуется авторизация', 'Пожалуйста, войдите в аккаунт');
        return;
      }
      
      // Check if item already in cart
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('listing_id', product.id)
        .single();
        
      if (existing) {
        Alert.alert('Внимание', 'Товар уже в корзине!');
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          listing_id: product.id,
          quantity: 1
        });

      if (error) throw error;
      
      Alert.alert('Успех', 'Товар добавлен в корзину!', [
        { text: 'Продолжить покупки' },
        { text: 'Перейти в корзину', onPress: onNavigateToCart }
      ]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {product.listing_images && product.listing_images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: screenWidth }}>
            {product.listing_images.map((img: any, i: number) => (
              <Image 
                key={i} 
                source={{ uri: img.url || 'https://via.placeholder.com/400' }} 
                style={{ width: screenWidth, height: screenWidth, resizeMode: 'cover' }} 
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.placeholderImage, { width: screenWidth, height: screenWidth }]}>
            <Text style={styles.placeholderText}>Нет фото</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.price}>{product.price.toLocaleString()} ₸</Text>
          <Text style={styles.title}>{product.title}</Text>
          
          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>📍 Город: {product.city || 'Не указан'}</Text>
            <Text style={styles.metaText}>📦 Состояние: {product.condition}</Text>
            {product.is_b2b && <Text style={styles.b2bBadge}>B2B Опт</Text>}
          </View>

          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.description}>{product.description || 'Нет описания'}</Text>

          <Text style={styles.sectionTitle}>Продавец</Text>
          <View style={styles.sellerCard}>
            <Text style={styles.sellerName}>{product.profiles?.full_name || 'Без имени'}</Text>
            {product.show_phone && product.profiles?.phone && (
              <Text style={styles.sellerPhone}>{product.profiles.phone}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.buyButton, addingToCart && styles.disabledButton]} 
          onPress={handleAddToCart}
          disabled={addingToCart || product.status !== 'ACTIVE'}
        >
          <Text style={styles.buyButtonText}>
            {addingToCart ? 'Добавление...' : product.status !== 'ACTIVE' ? 'Недоступно' : 'В корзину'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 16 },
  backButtonText: { fontSize: 16, color: '#10b981' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  scrollContent: { paddingBottom: 24 },
  placeholderImage: { backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#94a3b8' },
  infoContainer: { padding: 16, backgroundColor: '#fff', marginTop: 12 },
  price: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  metaBlock: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16 },
  metaText: { fontSize: 14, color: '#475569', marginBottom: 4 },
  b2bBadge: { alignSelf: 'flex-start', backgroundColor: '#2563eb', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },
  sellerCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sellerName: { fontSize: 16, fontWeight: 'bold' },
  sellerPhone: { fontSize: 14, color: '#10b981', marginTop: 4 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  buyButton: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center' },
  disabledButton: { opacity: 0.7, backgroundColor: '#94a3b8' },
  buyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
