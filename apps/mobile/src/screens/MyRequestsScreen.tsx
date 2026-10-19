import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { RfqRequest } from '@bazargo/shared';

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

export function MyRequestsScreen({
  onSelectRequest,
  onNavigateToCreate,
}: {
  onSelectRequest: (requestId: string) => void;
  onNavigateToCreate: () => void;
}) {
  const [requests, setRequests] = useState<RfqRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offersCounts, setOffersCounts] = useState<Record<string, number>>({});

  const fetchMyRequests = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Query requests where buyer_id is user or user_id is user
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .or(`buyer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reqs = (data as RfqRequest[]) || [];
      setRequests(reqs);

      // Fetch offers counts
      if (reqs.length > 0) {
        const reqIds = reqs.map((r) => r.id);
        const { data: offersData } = await supabase
          .from('request_offers')
          .select('request_id');

        if (offersData) {
          const counts: Record<string, number> = {};
          offersData.forEach((off: any) => {
            if (off.request_id) {
              counts[off.request_id] = (counts[off.request_id] || 0) + 1;
            }
          });
          setOffersCounts(counts);
        }
      }
    } catch (err: any) {
      console.warn('Error fetching my requests:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
  };

  const handleDelete = (requestId: string) => {
    Alert.alert(
      'Удаление запроса',
      'Вы уверены, что хотите удалить эту закупку? Все поступившие коммерческие предложения будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('request_offers').delete().eq('request_id', requestId);
              const { error } = await supabase
                .from('requests')
                .delete()
                .eq('id', requestId)
                .select('id');

              if (error) throw error;

              Alert.alert('Успех', 'Запрос успешно удален');
              setRequests((prev) => prev.filter((r) => r.id !== requestId));
            } catch (err: any) {
              Alert.alert('Ошибка удаления', err.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RfqRequest }) => {
    const isOpen = item.status === 'OPEN' || !item.status;
    const count = offersCounts[item.id] || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                !isOpen && { backgroundColor: 'rgba(148, 163, 184, 0.1)' },
              ]}
            >
              <Text style={[styles.statusBadgeText, !isOpen && { color: THEME.textMuted }]}>
                {isOpen ? 'Сбор предложений' : 'Закрыт'}
              </Text>
            </View>

            <View style={styles.offersCountBadge}>
              <Feather name="file-text" size={11} color={THEME.accent} />
              <Text style={styles.offersCountText}>
                {count > 0 ? `${count} КП получено` : 'Ожидает предложений'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteIconButton}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={15} color={THEME.danger} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={() => onSelectRequest(item.id)}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.specs ? <Text style={styles.cardSpecs}>{item.specs}</Text> : null}

          <View style={styles.paramsRow}>
            <Text style={styles.paramText}>
              {item.quantity?.toLocaleString('ru-RU')} {item.unit}
            </Text>
            <Text style={styles.paramDot}>•</Text>
            <Text style={styles.paramText}>
              {item.max_price ? `до ${item.max_price} сом/ед` : 'Договорная'}
            </Text>
            <Text style={styles.paramDot}>•</Text>
            <Text style={styles.paramText}>{item.city || 'Бишкек'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardBottom}>
          <TouchableOpacity
            style={styles.openDetailsBtn}
            onPress={() => onSelectRequest(item.id)}
          >
            <Feather name="cpu" size={13} color="#090A0F" style={{ marginRight: 6 }} />
            <Text style={styles.openDetailsBtnText}>Открыть сравнение КП</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Мои закупки</Text>
          <Text style={styles.headerSubtitle}>
            Управление запросами и откликами поставщиков
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={onNavigateToCreate}>
          <Feather name="plus" size={16} color="#090A0F" />
          <Text style={styles.createBtnText}>Создать</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{requests.length}</Text>
          <Text style={styles.statDesc}>Всего тендеров</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: THEME.accent }]}>
            {Object.values(offersCounts).reduce((a, b) => a + b, 0)}
          </Text>
          <Text style={styles.statDesc}>Получено КП</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {requests.filter((r) => r.status === 'OPEN' || !r.status).length}
          </Text>
          <Text style={styles.statDesc}>Активных</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.accent} />
          <Text style={styles.loadingText}>Загрузка ваших закупок...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
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
              <Feather name="inbox" size={40} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>У вас пока нет созданных закупок</Text>
              <Text style={styles.emptySub}>
                Создайте первую заявку с помощью AI-ассистента всего за 30 секунд.
              </Text>
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={onNavigateToCreate}>
                <Feather name="plus-circle" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCreateBtnText}>Создать закупку через AI</Text>
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: THEME.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statDesc: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: THEME.cardBorder,
  },
  listContent: {
    padding: 16,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    backgroundColor: THEME.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  offersCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  offersCountText: {
    color: THEME.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteIconButton: {
    padding: 6,
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
    marginBottom: 8,
  },
  paramsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paramText: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  paramDot: {
    color: THEME.textMuted,
    marginHorizontal: 6,
  },
  cardBottom: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
  },
  openDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 9,
    borderRadius: 6,
  },
  openDetailsBtnText: {
    color: '#090A0F',
    fontSize: 13,
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
    marginTop: 14,
    marginBottom: 6,
  },
  emptySub: {
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
