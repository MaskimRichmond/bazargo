import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { RfqRequest, RfqCategoryTag } from '@bazargo/shared';

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
  badgeBg: '#1F2433',
};

const CATEGORIES: { tag: string; label: string }[] = [
  { tag: 'all', label: 'Все' },
  { tag: 'packaging', label: 'Упаковка' },
  { tag: 'cups', label: 'Стаканы' },
  { tag: 'syrups', label: 'Сиропы' },
  { tag: 'coffee', label: 'Кофе' },
  { tag: 'other', label: 'Другое' },
];

export function RfqExchangeScreen({
  onSelectRequest,
  onNavigateToCreate,
}: {
  onSelectRequest: (requestId: string) => void;
  onNavigateToCreate: () => void;
}) {
  const [requests, setRequests] = useState<RfqRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchRequests = useCallback(async () => {
    try {
      let query = supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setRequests((data as RfqRequest[]) || []);
    } catch (err: any) {
      console.warn('Error fetching requests:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const filteredRequests = requests.filter((req) => {
    const matchesCategory =
      selectedCategory === 'all' || req.category_tag === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      req.title.toLowerCase().includes(q) ||
      (req.specs && req.specs.toLowerCase().includes(q)) ||
      (req.city && req.city.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (tag: string) => {
    switch (tag) {
      case 'packaging':
        return 'Упаковка';
      case 'cups':
        return 'Стаканы';
      case 'syrups':
        return 'Сиропы';
      case 'coffee':
        return 'Кофе';
      default:
        return 'Товары';
    }
  };

  const renderItem = ({ item }: { item: RfqRequest }) => {
    const isOwner =
      currentUserId && (item.buyer_id === currentUserId || item.user_id === currentUserId);
    const isOpen = item.status === 'OPEN' || !item.status;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => onSelectRequest(item.id)}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{getCategoryLabel(item.category_tag)}</Text>
          </View>

          <View style={styles.headerRight}>
            {isOwner && (
              <View style={styles.ownerBadge}>
                <Feather name="user" size={11} color={THEME.accent} />
                <Text style={styles.ownerBadgeText}>Моя закупка</Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                !isOpen && { backgroundColor: 'rgba(148, 163, 184, 0.1)' },
              ]}
            >
              <Text style={[styles.statusBadgeText, !isOpen && { color: THEME.textMuted }]}>
                {isOpen ? 'Открыт' : 'Закрыт'}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Specs */}
        {item.specs ? (
          <Text style={styles.cardSpecs} numberOfLines={1}>
            {item.specs}
          </Text>
        ) : null}

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Объем</Text>
            <Text style={styles.metricValue}>
              {item.quantity?.toLocaleString('ru-RU') || 1} {item.unit || 'шт'}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Бюджет</Text>
            <Text style={styles.metricValue}>
              {item.max_price ? `до ${item.max_price} сом/ед` : 'Договорная'}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Город / Срок</Text>
            <Text style={styles.metricValue}>
              {item.city || 'Бишкек'} • {item.deadline_days || 7} дн
            </Text>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.dateWrap}>
            <Feather name="clock" size={12} color={THEME.textMuted} />
            <Text style={styles.dateText}>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Недавно'}
            </Text>
          </View>

          {isOwner ? (
            <View style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Управление / КП</Text>
              <Feather name="chevron-right" size={14} color={THEME.accent} />
            </View>
          ) : (
            <View style={styles.offerBtn}>
              <Feather name="send" size={13} color="#090A0F" style={{ marginRight: 6 }} />
              <Text style={styles.offerBtnText}>Отправить КП</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Биржа B2B-закупок</Text>
          <Text style={styles.headerSubtitle}>Актуальные запросы оптовых покупателей</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={onNavigateToCreate}>
          <Feather name="plus" size={16} color="#090A0F" />
          <Text style={styles.createBtnText}>Запрос</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={THEME.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию, характеристикам, городу..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Horizontal Filter */}
      <View style={styles.categoryFilterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.tag}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const active = selectedCategory === item.tag;
            return (
              <TouchableOpacity
                style={[styles.categoryFilterChip, active && styles.categoryFilterChipActive]}
                onPress={() => setSelectedCategory(item.tag)}
              >
                <Text
                  style={[
                    styles.categoryFilterChipText,
                    active && styles.categoryFilterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Request List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.accent} />
          <Text style={styles.loadingText}>Загрузка тендеров...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.accent}
              colors={[THEME.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={42} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>Запросов не найдено</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Станьте первым, кто создаст запрос на закупку!'}
              </Text>
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={onNavigateToCreate}>
                <Feather name="plus-circle" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCreateBtnText}>Создать RFQ-запрос</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardBorder,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  categoryFilterWrap: {
    paddingBottom: 10,
  },
  categoryFilterChip: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryFilterChipActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accent,
  },
  categoryFilterChipText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryFilterChipTextActive: {
    color: THEME.accent,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: THEME.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accentBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ownerBadgeText: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: THEME.accentBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSpecs: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageBtnText: {
    color: THEME.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  offerBtnText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '700',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '700',
  },
});
