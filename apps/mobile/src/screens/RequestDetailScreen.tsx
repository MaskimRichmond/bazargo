import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { RfqRequest, RfqOffer } from '@bazargo/shared';

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
  badgeBg: '#1F2433',
  aiChoiceBg: 'rgba(16, 185, 129, 0.08)',
  aiChoiceBorder: '#10B981',
};

export function RequestDetailScreen({
  requestId,
  onBack,
}: {
  requestId: string;
  onBack: () => void;
}) {
  const [request, setRequest] = useState<RfqRequest | null>(null);
  const [offers, setOffers] = useState<RfqOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Supplier Offer Form State
  const [unitPriceStr, setUnitPriceStr] = useState('');
  const [offeredQtyStr, setOfferedQtyStr] = useState('');
  const [moqStr, setMoqStr] = useState('1');
  const [deliveryCostStr, setDeliveryCostStr] = useState('0');
  const [leadTimeStr, setLeadTimeStr] = useState('5');
  const [message, setMessage] = useState('');

  const fetchDetails = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch request details
      const { data: reqData, error: reqErr } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqErr) throw reqErr;
      setRequest(reqData as RfqRequest);

      // Set default offered quantity based on request
      if (reqData?.quantity) {
        setOfferedQtyStr(String(reqData.quantity));
      }
      if (reqData?.deadline_days) {
        setLeadTimeStr(String(reqData.deadline_days));
      }

      // Fetch offers
      const { data: offersData, error: offersErr } = await supabase
        .from('request_offers')
        .select('*, profiles:supplier_id(id, full_name, company_name, phone)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (offersErr) {
        console.warn('Error fetching offers:', offersErr.message);
        setOffers([]);
      } else {
        setOffers((offersData as RfqOffer[]) || []);
      }
    } catch (err: any) {
      Alert.alert('Ошибка загрузки', err.message || 'Не удалось загрузить данные заявки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const isOwner = Boolean(
    currentUserId &&
      request &&
      (request.buyer_id === currentUserId || request.user_id === currentUserId)
  );

  // AI Comparison Engine: Calculate total cost and rank offers
  const rankedOffers = useMemo(() => {
    const list = offers.map((offer) => {
      const unitPrice = Number(offer.unit_price) || 0;
      const qty = Number(offer.offered_quantity) || Number(request?.quantity) || 1;
      const delivery = Number(offer.delivery_cost) || 0;
      const computedTotal = offer.total_cost || unitPrice * qty + delivery;
      return {
        ...offer,
        computedTotal,
      };
    });

    // Sort by computedTotal ascending (lowest total cost first)
    list.sort((a, b) => a.computedTotal - b.computedTotal);
    return list;
  }, [offers, request]);

  // Live total calculation for the new offer form
  const liveFormTotal = useMemo(() => {
    const p = parseFloat(unitPriceStr.replace(',', '.')) || 0;
    const q = parseInt(offeredQtyStr.replace(/\D/g, ''), 10) || 0;
    const d = parseFloat(deliveryCostStr.replace(',', '.')) || 0;
    return p * q + d;
  }, [unitPriceStr, offeredQtyStr, deliveryCostStr]);

  // Actions
  const handleDeleteRequest = () => {
    Alert.alert(
      'Удаление запроса',
      'Вы уверены, что хотите удалить этот запрос? Все поступившие коммерческие предложения также будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              // 1. Delete associated offers
              await supabase.from('request_offers').delete().eq('request_id', requestId);

              // 2. Delete request with verification
              const { error } = await supabase
                .from('requests')
                .delete()
                .eq('id', requestId)
                .select('id');

              if (error) throw error;

              Alert.alert('Успех', 'Запрос успешно удален');
              onBack();
            } catch (err: any) {
              Alert.alert('Ошибка удаления', err.message || 'Не удалось удалить запрос');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCloseRequest = async () => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'CLOSED' })
        .eq('id', requestId);

      if (error) throw error;
      Alert.alert('Статус обновлен', 'Сбор коммерческих предложений завершен');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось обновить статус');
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    Alert.alert(
      'Принять предложение',
      'Вы действительно хотите утвердить эти условия поставки и зафиксировать сделку?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Принять условия',
          onPress: async () => {
            try {
              await supabase
                .from('request_offers')
                .update({ status: 'ACCEPTED' })
                .eq('id', offerId);

              await supabase
                .from('requests')
                .update({ status: 'CLOSED' })
                .eq('id', requestId);

              Alert.alert('Сделка зафиксирована', 'Предложение принято! Поставщик уведомлен.');
              fetchDetails();
            } catch (err: any) {
              Alert.alert('Ошибка', err.message);
            }
          },
        },
      ]
    );
  };

  const handleSubmitOffer = async () => {
    const price = parseFloat(unitPriceStr.replace(',', '.'));
    const qty = parseInt(offeredQtyStr.replace(/\D/g, ''), 10);
    const moq = parseInt(moqStr.replace(/\D/g, ''), 10) || 1;
    const delivery = parseFloat(deliveryCostStr.replace(',', '.')) || 0;
    const leadTime = parseInt(leadTimeStr.replace(/\D/g, ''), 10) || 5;

    if (!price || price <= 0) {
      Alert.alert('Ошибка', 'Укажите цену за единицу товара');
      return;
    }
    if (!qty || qty <= 0) {
      Alert.alert('Ошибка', 'Укажите объем предлагаемой партии');
      return;
    }

    setSubmittingOffer(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Авторизация', 'Для отправки КП необходимо войти в аккаунт');
        setSubmittingOffer(false);
        return;
      }

      const totalCost = price * qty + delivery;

      const { error } = await supabase.from('request_offers').insert([
        {
          request_id: requestId,
          supplier_id: user.id,
          unit_price: price,
          offered_quantity: qty,
          moq: moq,
          delivery_cost: delivery,
          lead_time_days: leadTime,
          total_cost: totalCost,
          message: message.trim() || null,
          status: 'PENDING',
        },
      ]);

      if (error) throw error;

      Alert.alert('Успех', 'Коммерческое предложение отправлено заказчику');
      setUnitPriceStr('');
      setMessage('');
      fetchDetails();
    } catch (err: any) {
      Alert.alert('Ошибка отправки КП', err.message || 'Не удалось отправить предложение');
    } finally {
      setSubmittingOffer(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.accent} />
          <Text style={styles.loadingText}>Загрузка деталей запроса...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={40} color={THEME.danger} />
          <Text style={styles.emptyTitle}>Запрос не найден</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = request.status === 'OPEN' || !request.status;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
          <Feather name="arrow-left" size={20} color={THEME.textPrimary} />
          <Text style={styles.headerBackText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          RFQ #{request.id.slice(0, 8)}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.accent}
            colors={[THEME.accent]}
          />
        }
      >
        {/* Main Request Specification Card */}
        <View style={styles.specCard}>
          <View style={styles.specTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{request.category_tag}</Text>
            </View>
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

          <Text style={styles.requestTitle}>{request.title}</Text>

          {request.specs ? (
            <View style={styles.specsBox}>
              <Text style={styles.specsLabel}>Характеристики:</Text>
              <Text style={styles.specsContent}>{request.specs}</Text>
            </View>
          ) : null}

          {/* Key Parameters Grid */}
          <View style={styles.paramsGrid}>
            <View style={styles.paramItem}>
              <Feather name="layers" size={14} color={THEME.accent} />
              <Text style={styles.paramLabel}>Партия</Text>
              <Text style={styles.paramVal}>
                {request.quantity?.toLocaleString('ru-RU')} {request.unit}
              </Text>
            </View>

            <View style={styles.paramItem}>
              <Feather name="tag" size={14} color={THEME.accent} />
              <Text style={styles.paramLabel}>Желаемая цена</Text>
              <Text style={styles.paramVal}>
                {request.max_price ? `${request.max_price} сом/ед` : 'Договорная'}
              </Text>
            </View>

            <View style={styles.paramItem}>
              <Feather name="map-pin" size={14} color={THEME.accent} />
              <Text style={styles.paramLabel}>Город</Text>
              <Text style={styles.paramVal}>{request.city || 'Бишкек'}</Text>
            </View>

            <View style={styles.paramItem}>
              <Feather name="clock" size={14} color={THEME.accent} />
              <Text style={styles.paramLabel}>Срок поставки</Text>
              <Text style={styles.paramVal}>{request.deadline_days || 7} дней</Text>
            </View>
          </View>

          {/* Owner Actions */}
          {isOwner && (
            <View style={styles.ownerActions}>
              {isOpen && (
                <TouchableOpacity style={styles.closeRfqBtn} onPress={handleCloseRequest}>
                  <Feather name="check-circle" size={14} color={THEME.textSecondary} />
                  <Text style={styles.closeRfqText}>Закрыть сбор КП</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.deleteRfqBtn}
                onPress={handleDeleteRequest}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={THEME.danger} />
                ) : (
                  <>
                    <Feather name="trash-2" size={14} color={THEME.danger} />
                    <Text style={styles.deleteRfqText}>Удалить запрос</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AI Comparison Engine Section */}
        <View style={styles.comparisonSection}>
          <View style={styles.comparisonHeader}>
            <View style={styles.aiBadge}>
              <Feather name="cpu" size={14} color={THEME.accent} />
              <Text style={styles.aiBadgeText}>AI Comparison Engine</Text>
            </View>
            <Text style={styles.offersCountText}>
              Поступило предложений: {rankedOffers.length}
            </Text>
          </View>

          {rankedOffers.length === 0 ? (
            <View style={styles.noOffersCard}>
              <Feather name="inbox" size={32} color={THEME.textMuted} />
              <Text style={styles.noOffersTitle}>Пока нет предложений от поставщиков</Text>
              <Text style={styles.noOffersSub}>
                Как только поставщики отправят коммерческие предложения, AI автоматически рассчитает полную стоимость и выделит лучшее решение.
              </Text>
            </View>
          ) : (
            rankedOffers.map((offer, index) => {
              const isBest = index === 0;
              const isAccepted = offer.status === 'ACCEPTED';

              return (
                <View
                  key={offer.id}
                  style={[
                    styles.offerCard,
                    isBest && styles.bestOfferCard,
                    isAccepted && styles.acceptedOfferCard,
                  ]}
                >
                  {isBest && (
                    <View style={styles.aiChoiceBanner}>
                      <Feather name="award" size={12} color="#090A0F" />
                      <Text style={styles.aiChoiceBannerText}>Выбор AI • Лучшая цена</Text>
                    </View>
                  )}

                  <View style={styles.offerTop}>
                    <View>
                      <Text style={styles.supplierTitle}>
                        {offer.profiles?.company_name ||
                          offer.profiles?.full_name ||
                          `Поставщик #${offer.supplier_id?.slice(0, 5)}`}
                      </Text>
                      {offer.profiles?.phone && (
                        <Text style={styles.supplierContact}>{offer.profiles.phone}</Text>
                      )}
                    </View>

                    <View style={styles.offerStatusPill}>
                      <Text
                        style={[
                          styles.offerStatusPillText,
                          isAccepted && { color: THEME.accent },
                        ]}
                      >
                        {isAccepted ? 'Принято' : 'На рассмотрении'}
                      </Text>
                    </View>
                  </View>

                  {/* Pricing Breakdown */}
                  <View style={styles.pricingBreakdown}>
                    <View style={styles.priceRow}>
                      <Text style={styles.breakdownLabel}>Цена за ед:</Text>
                      <Text style={styles.breakdownVal}>{offer.unit_price} сом</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.breakdownLabel}>Партия (MOQ):</Text>
                      <Text style={styles.breakdownVal}>
                        {offer.offered_quantity} шт (от {offer.moq} шт)
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.breakdownLabel}>Доставка:</Text>
                      <Text style={styles.breakdownVal}>
                        {offer.delivery_cost ? `${offer.delivery_cost} сом` : 'Бесплатно'}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.breakdownLabel}>Срок поставки:</Text>
                      <Text style={styles.breakdownVal}>{offer.lead_time_days} дн</Text>
                    </View>

                    <View style={styles.totalDivider} />

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Итого под ключ:</Text>
                      <Text style={styles.totalVal}>
                        {offer.computedTotal.toLocaleString('ru-RU')} сом
                      </Text>
                    </View>
                  </View>

                  {offer.message ? (
                    <Text style={styles.offerMessage}>«{offer.message}»</Text>
                  ) : null}

                  {/* Accept offer button for request owner */}
                  {isOwner && isOpen && !isAccepted && (
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptOffer(offer.id)}
                    >
                      <Feather name="check" size={14} color="#090A0F" style={{ marginRight: 6 }} />
                      <Text style={styles.acceptBtnText}>Принять КП и зафиксировать сделку</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Submit Offer Form (available for suppliers or test) */}
        {isOpen && (
          <View style={styles.submitOfferCard}>
            <View style={styles.submitOfferHeader}>
              <Feather name="send" size={16} color={THEME.accent} />
              <Text style={styles.submitOfferTitle}>Отправить коммерческое предложение</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Цена за 1 ед (сом)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={unitPriceStr}
                  onChangeText={setUnitPriceStr}
                  placeholder="Например 80"
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Объем партии</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={offeredQtyStr}
                  onChangeText={(t) => setOfferedQtyStr(t.replace(/\D/g, ''))}
                  placeholder="500"
                  placeholderTextColor={THEME.textMuted}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Мин. партия (MOQ)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={moqStr}
                  onChangeText={(t) => setMoqStr(t.replace(/\D/g, ''))}
                  placeholder="100"
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Доставка (сом)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={deliveryCostStr}
                  onChangeText={setDeliveryCostStr}
                  placeholder="0"
                  placeholderTextColor={THEME.textMuted}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Срок доставки (дней)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={leadTimeStr}
                onChangeText={(t) => setLeadTimeStr(t.replace(/\D/g, ''))}
                placeholder="5"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Комментарий / Условия оплаты</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholder="В наличии на складе в Бишкеке, безналичный расчет с НДС"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            {/* Live Computed Total Card */}
            <View style={styles.liveTotalBox}>
              <Text style={styles.liveTotalLabel}>Итого к оплате заказчиком:</Text>
              <Text style={styles.liveTotalVal}>
                {liveFormTotal.toLocaleString('ru-RU')} сом
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sendOfferBtn}
              onPress={handleSubmitOffer}
              disabled={submittingOffer}
            >
              {submittingOffer ? (
                <ActivityIndicator color="#090A0F" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                  <Text style={styles.sendOfferBtnText}>Отправить КП заказчику</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBackText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  specCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  specTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  requestTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  specsBox: {
    backgroundColor: THEME.inputBg,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  specsLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  specsContent: {
    color: THEME.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  paramsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  paramItem: {
    flexBasis: '48%',
    backgroundColor: THEME.inputBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  paramLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  paramVal: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.cardBorder,
  },
  closeRfqBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.inputBg,
    paddingVertical: 9,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  closeRfqText: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteRfqBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.dangerBg,
    paddingVertical: 9,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.dangerBorder,
  },
  deleteRfqText: {
    color: THEME.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  comparisonSection: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.accentBorder,
  },
  aiBadgeText: {
    color: THEME.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  offersCountText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  noOffersCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  noOffersTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  noOffersSub: {
    color: THEME.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  offerCard: {
    backgroundColor: THEME.inputBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    marginBottom: 12,
  },
  bestOfferCard: {
    backgroundColor: THEME.aiChoiceBg,
    borderColor: THEME.aiChoiceBorder,
  },
  acceptedOfferCard: {
    borderColor: THEME.accent,
  },
  aiChoiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    marginBottom: 8,
  },
  aiChoiceBannerText: {
    color: '#090A0F',
    fontSize: 11,
    fontWeight: '700',
  },
  offerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  supplierTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  supplierContact: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  offerStatusPill: {
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offerStatusPillText: {
    color: THEME.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  pricingBreakdown: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  breakdownVal: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  totalDivider: {
    height: 1,
    backgroundColor: THEME.inputBorder,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  totalVal: {
    color: THEME.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  offerMessage: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  acceptBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '700',
  },
  submitOfferCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 20,
  },
  submitOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  submitOfferTitle: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    color: THEME.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
  },
  liveTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.accentBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.accentBorder,
    marginVertical: 10,
  },
  liveTotalLabel: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  liveTotalVal: {
    color: THEME.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  sendOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendOfferBtnText: {
    color: '#090A0F',
    fontSize: 14,
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
  emptyTitle: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: THEME.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  backBtnText: {
    color: THEME.accent,
    fontSize: 14,
  },
});
