import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type Category = { id: string; title: string };

export function ListingFormScreen({ onBack, editId }: { onBack: () => void, editId?: string }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [city, setCity] = useState('Бишкек');
  const [description, setDescription] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [images, setImages] = useState<string[]>([]); // local URIs or remote URLs
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: cats } = await supabase.from('categories').select('id, title').limit(10);
        if (cats && cats.length > 0) {
          setCategories(cats);
          setSelectedCategory(cats[0].id);
        }

        if (editId) {
          const { data: listing, error } = await supabase
            .from('listings')
            .select('title, price, quantity, city, description, category_id, listing_images(url)')
            .eq('id', editId)
            .single();

          if (error) throw error;
          if (listing) {
            setTitle(listing.title);
            setPrice(listing.price.toString());
            setQuantity(listing.quantity.toString());
            setCity(listing.city);
            setDescription(listing.description || '');
            if (listing.category_id) setSelectedCategory(listing.category_id);
            if (listing.listing_images) {
              setImages(listing.listing_images.map((img: any) => img.url));
            }
          }
        }
      } catch (err: any) {
        Alert.alert('Ошибка', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [editId]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title || !price || !selectedCategory) {
      Alert.alert('Ошибка', 'Заполните название, цену и выберите категорию');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Необходима авторизация');

      let listingId = editId;

      const payload = {
        title,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        city,
        description,
        category_id: selectedCategory,
        seller_id: user.id,
        listing_type: parseInt(quantity, 10) > 1 ? 'INVENTORY' : 'SINGLE',
        condition: 'NEW', // default for simplicity
        status: parseInt(quantity, 10) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      };

      if (editId) {
        const { data, error } = await supabase.from('listings').update(payload).eq('id', editId).eq('seller_id', user.id).select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Не удалось обновить объявление (нет доступа или удалено)');
      } else {
        const { data, error } = await supabase.from('listings').insert(payload).select('id').single();
        if (error) throw error;
        listingId = data.id;
      }

      // Upload new images to Storage
      for (let i = 0; i < images.length; i++) {
        const uri = images[i];
        if (uri.startsWith('file://') || uri.startsWith('content://')) {
          const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
          const fileName = `mobile_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          
          try {
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, arrayBuffer, {
                contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
              });
              
            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(uploadData.path);

            // Insert into listing_images
            await supabase.from('listing_images').insert({
              listing_id: listingId,
              url: publicUrl,
              order_index: i
            });
          } catch (e: any) {
            console.error('Upload error', e);
            Alert.alert('Ошибка загрузки фото', e.message);
          }
        }
      }

      Alert.alert('Успех', 'Объявление сохранено!');
      onBack();
    } catch (err: any) {
      Alert.alert('Ошибка сохранения', err.message);
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>{editId ? 'Редактирование' : 'Новое объявление'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#10b981" /> : <Text style={styles.saveText}>Сохранить</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Название</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Название товара" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Цена (₸)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Количество</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" />
          </View>
        </View>

        <Text style={styles.label}>Город</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Бишкек" />

        <Text style={styles.label}>Описание</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline />

        <Text style={styles.label}>Категория</Text>
        <View style={styles.catContainer}>
          {categories.map(c => (
            <TouchableOpacity 
              key={c.id} 
              style={[styles.catBtn, selectedCategory === c.id && styles.catBtnActive]}
              onPress={() => setSelectedCategory(c.id)}
            >
              <Text style={selectedCategory === c.id ? styles.catTextActive : styles.catText}>{c.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Фотографии</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageBox}>
              <Image source={{ uri: img }} style={styles.image} />
              <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(i)}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
            <Text style={{ fontSize: 24, color: '#9ca3af' }}>+</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={{height: 40}} />
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  backText: { color: '#6b7280', fontSize: 16 },
  saveText: { color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  catContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  catBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catText: { color: '#374151' },
  catTextActive: { color: '#fff', fontWeight: 'bold' },
  imageScroll: { flexDirection: 'row', marginTop: 8 },
  imageBox: { width: 80, height: 80, marginRight: 12, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  removeImage: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addImageBtn: { width: 80, height: 80, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
