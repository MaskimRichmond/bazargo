import React, { useEffect, useState, useCallback } from 'react';
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
import { SupplierApplication } from '@bazargo/shared';

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
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
};

const AVAILABLE_CATEGORIES = [
  'Упаковка и гофротара',
  'Одноразовая посуда и стаканы',
  'Сиропы и топпинги',
  'Кофе и чай свежей обжарки',
  'Хозтовары и расходники',
];

export function SupplierHubScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<SupplierApplication | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [comment, setComment] = useState('');

  const fetchApplication = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('b2b_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching b2b application:', error.message);
      } else if (data) {
        setApplication(data as SupplierApplication);
      }
    } catch (err: any) {
      console.warn('Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplication();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      Alert.alert('Ошибка', 'Укажите название компании или ИП');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одну категорию поставок');
      return;
    }
    if (!contactPerson.trim()) {
      Alert.alert('Ошибка', 'Укажите контактное лицо');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Укажите номер телефона');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Авторизация', 'Необходимо войти в аккаунт');
        setSubmitting(false);
        return;
      }

      const cleanTelegram = telegramUsername.trim()
        ? telegramUsername.trim().replace(/^@/, '')
        : null;

      const payload = {
        user_id: user.id,
        company_name: companyName.trim(),
        inn: inn.trim() || null,
        categories: selectedCategories,
        contact_person: contactPerson.trim(),
        phone: phone.trim(),
        telegram_username: cleanTelegram,
        website: website.trim() || null,
        comment: comment.trim() || null,
        status: 'PENDING',
      };

      const { data, error } = await supabase
        .from('b2b_applications')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      Alert.alert(
        'Заявка отправлена',
        'Ваша заявка принята на рассмотрение. Мы свяжемся с вами в Telegram или по телефону.'
      );
      setApplication(data as SupplierApplication);
    } catch (err: any) {
      Alert.alert('Ошибка подачи заявки', err.message || 'Попробуйте позже');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.accent} />
          <Text style={styles.loadingText}>Загрузка данных кабинета...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Кабинет поставщика</Text>
          <Text style={styles.headerSubtitle}>Верификация и доступ к оптовым тендерам</Text>
        </View>
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
        {/* If Application Exists */}
        {application ? (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusBadge,
                  application.status === 'APPROVED'
                    ? styles.statusApproved
                    : application.status === 'REJECTED'
                    ? styles.statusRejected
                    : styles.statusPending,
                ]}
              >
                <Feather
                  name={
                    application.status === 'APPROVED'
                      ? 'check-circle'
                      : application.status === 'REJECTED'
                      ? 'x-circle'
                      : 'clock'
                  }
                  size={14}
                  color={
                    application.status === 'APPROVED'
                      ? THEME.accent
                      : application.status === 'REJECTED'
                      ? THEME.danger
                      : THEME.warning
                  }
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    application.status === 'APPROVED'
                      ? { color: THEME.accent }
                      : application.status === 'REJECTED'
                      ? { color: THEME.danger }
                      : { color: THEME.warning },
                  ]}
                >
                  {application.status === 'APPROVED'
                    ? 'Верифицированный поставщик'
                    : application.status === 'REJECTED'
                    ? 'Заявка отклонена'
                    : 'Заявка на рассмотрении'}
                </Text>
              </View>
            </View>

            <Text style={styles.appCompanyTitle}>{application.company_name}</Text>

            <View style={styles.appDetailsList}>
              <View style={styles.appDetailRow}>
                <Text style={styles.appDetailLabel}>Категории:</Text>
                <Text style={styles.appDetailValue}>
                  {application.categories?.join(', ') || 'Не указаны'}
                </Text>
              </View>

              <View style={styles.appDetailRow}>
                <Text style={styles.appDetailLabel}>Контактное лицо:</Text>
                <Text style={styles.appDetailValue}>{application.contact_person}</Text>
              </View>

              <View style={styles.appDetailRow}>
                <Text style={styles.appDetailLabel}>Телефон:</Text>
                <Text style={styles.appDetailValue}>{application.phone}</Text>
              </View>

              {application.telegram_username ? (
                <View style={styles.appDetailRow}>
                  <Text style={styles.appDetailLabel}>Telegram:</Text>
                  <Text style={[styles.appDetailValue, { color: THEME.accent }]}>
                    @{application.telegram_username.replace('@', '')}
                  </Text>
                </View>
              ) : null}

              {application.inn ? (
                <View style={styles.appDetailRow}>
                  <Text style={styles.appDetailLabel}>ИНН:</Text>
                  <Text style={styles.appDetailValue}>{application.inn}</Text>
                </View>
              ) : null}
            </View>

            {application.status === 'APPROVED' ? (
              <View style={styles.verifiedNotice}>
                <Feather name="shield" size={16} color={THEME.accent} />
                <Text style={styles.verifiedNoticeText}>
                  Ваша компания имеет высший приоритет в выдаче AI-закупщика и получает уведомления о новых тендерах.
                </Text>
              </View>
            ) : application.status === 'PENDING' ? (
              <View style={styles.pendingNotice}>
                <Feather name="info" size={16} color={THEME.warning} />
                <Text style={styles.pendingNoticeText}>
                  Администратор проверяет данные компании. Обычно это занимает от 15 минут до 2 часов.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* Application Form */
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Feather name="briefcase" size={18} color={THEME.accent} />
              <Text style={styles.formCardTitle}>Стать верифицированным поставщиком</Text>
            </View>
            <Text style={styles.formCardSubtitle}>
              Получайте прямые оптовые заказы от предпринимателей и сетей Кыргызстана
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Название компании / ИП *</Text>
              <TextInput
                style={styles.input}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="ОсОО «Азия Упаковка» или ИП Садыков"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ИНН (необязательно)</Text>
              <TextInput
                style={styles.input}
                value={inn}
                onChangeText={setInn}
                placeholder="14-значный ИНН"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Категории поставок *</Text>
              <View style={styles.categoriesWrap}>
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const selected = selectedCategories.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, selected && styles.categoryChipActive]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <Feather
                        name={selected ? 'check' : 'plus'}
                        size={12}
                        color={selected ? THEME.accent : THEME.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Контактное лицо *</Text>
              <TextInput
                style={styles.input}
                value={contactPerson}
                onChangeText={setContactPerson}
                placeholder="Имя Фамилия"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Телефон для связи *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+996 555 123 456"
                placeholderTextColor={THEME.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Telegram @username (для уведомлений)</Text>
              <TextInput
                style={styles.input}
                value={telegramUsername}
                onChangeText={setTelegramUsername}
                placeholder="@username"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Сайт / Instagram (необязательно)</Text>
              <TextInput
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://mysite.kg или @instagram"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>О компании и мощностях поставок</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={comment}
                onChangeText={setComment}
                placeholder="Собственное производство гофротары в Бишкеке, склад 2000 м², оперативная доставка"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#090A0F" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#090A0F" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Подать заявку на верификацию</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits Card */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Преимущества верифицированного поставщика</Text>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIconWrap}>
              <Feather name="zap" size={16} color={THEME.accent} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitHead}>Прямой доступ к тендерам</Text>
              <Text style={styles.benefitDesc}>
                Получайте заказы от кафе, ресторанов, производств и магазинов без посредников.
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIconWrap}>
              <Feather name="send" size={16} color={THEME.accent} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitHead}>Telegram-оповещения</Text>
              <Text style={styles.benefitDesc}>
                Мгновенные уведомления о новых закупках в вашей товарной категории.
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIconWrap}>
              <Feather name="award" size={16} color={THEME.accent} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitHead}>AI-ранжирование</Text>
              <Text style={styles.benefitDesc}>
                Ваши предложения автоматически маркируются знаком «Выбор AI» при лучших ценах.
              </Text>
            </View>
          </View>
        </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusApproved: {
    backgroundColor: THEME.accentBg,
  },
  statusPending: {
    backgroundColor: THEME.warningBg,
  },
  statusRejected: {
    backgroundColor: THEME.dangerBg,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appCompanyTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  appDetailsList: {
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  appDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appDetailLabel: {
    color: THEME.textMuted,
    fontSize: 13,
  },
  appDetailValue: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  verifiedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accentBg,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  verifiedNoticeText: {
    color: THEME.textPrimary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.warningBg,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  pendingNoticeText: {
    color: THEME.warning,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formCardTitle: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  formCardSubtitle: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    color: THEME.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoriesWrap: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
  },
  categoryChipActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accent,
  },
  categoryChipText: {
    color: THEME.textSecondary,
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: THEME.accent,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '700',
  },
  benefitsCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 20,
  },
  benefitsTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  benefitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: THEME.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitHead: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDesc: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 16,
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
});
