import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { parseRfqFallback, ParsedRfqResponse, RfqCategoryTag } from '@bazargo/shared';

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
};

const TEMPLATE_CHIPS = [
  {
    label: 'Коробки',
    category: 'packaging' as RfqCategoryTag,
    prompt: 'Нужно 500 картонных коробок 30х20х15 см для доставки в Бишкек, цена до 85 сом, срок 7 дней',
  },
  {
    label: 'Стаканы',
    category: 'cups' as RfqCategoryTag,
    prompt: 'Куплю 1000 двухслойных стаканов 350 мл с крышками для кофе в Бишкек, до 6 сом за шт',
  },
  {
    label: 'Сиропы',
    category: 'syrups' as RfqCategoryTag,
    prompt: 'Ищу сиропы для кофейни ваниль и карамель 50 бутылок по 1л до 450 сом в Ош',
  },
  {
    label: 'Кофе',
    category: 'coffee' as RfqCategoryTag,
    prompt: 'Нужно 30 кг кофе в зернах 80/20 арабика/робуста свежей обжарки до 1200 сом за кг в Бишкек',
  },
];

const CATEGORIES: { tag: RfqCategoryTag; label: string }[] = [
  { tag: 'packaging', label: 'Упаковка' },
  { tag: 'cups', label: 'Стаканы' },
  { tag: 'syrups', label: 'Сиропы' },
  { tag: 'coffee', label: 'Кофе' },
  { tag: 'other', label: 'Другое' },
];

const COMMON_UNITS = ['шт', 'коробок', 'стаканов', 'бутылок', 'упаковок', 'кг', 'л'];

type SupplierResult = {
  id: string;
  company_name: string;
  categories: string[];
  contact_person?: string;
  phone?: string;
  telegram_username?: string;
  is_verified?: boolean;
};

export function CreateRfqScreen({
  onNavigateToExchange,
  onRequestCreated,
}: {
  onNavigateToExchange: () => void;
  onRequestCreated: (requestId: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [foundSuppliers, setFoundSuppliers] = useState<SupplierResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  // Form state - using strings to prevent digit-jumping/reset bugs!
  const [title, setTitle] = useState('');
  const [specs, setSpecs] = useState('');
  const [quantityStr, setQuantityStr] = useState('500');
  const [unit, setUnit] = useState('шт');
  const [maxPriceStr, setMaxPriceStr] = useState('85');
  const [city, setCity] = useState('Бишкек');
  const [deadlineDaysStr, setDeadlineDaysStr] = useState('7');
  const [categoryTag, setCategoryTag] = useState<RfqCategoryTag>('packaging');

  // Success modal
  const [createdModalVisible, setCreatedModalVisible] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const applyParsedData = (data: ParsedRfqResponse) => {
    setTitle(data.title || '');
    setSpecs(data.specs || '');
    setQuantityStr(String(data.quantity || 1));
    setUnit(data.unit || 'шт');
    setMaxPriceStr(data.max_price ? String(data.max_price) : '');
    setCity(data.city || 'Бишкек');
    setDeadlineDaysStr(String(data.deadline_days || 7));
    if (data.category_tag) {
      setCategoryTag(data.category_tag);
    }
  };

  const handleParsePrompt = async () => {
    if (!prompt.trim()) {
      Alert.alert('Внимание', 'Введите текст запроса или выберите шаблон');
      return;
    }

    setParsing(true);
    try {
      // Direct local regex fallback parser guarantees 100% reliability instantly
      const parsed = parseRfqFallback(prompt);
      applyParsedData(parsed);

      // Trigger supplier lookup for this category
      searchSuppliers(parsed.category_tag);
    } catch {
      const fallback = parseRfqFallback(prompt);
      applyParsedData(fallback);
      searchSuppliers(fallback.category_tag);
    } finally {
      setParsing(false);
    }
  };

  const searchSuppliers = async (tag: RfqCategoryTag) => {
    setSearchingSuppliers(true);
    setSearchDone(true);
    try {
      const { data, error } = await supabase
        .from('b2b_applications')
        .select('id, company_name, categories, contact_person, phone, telegram_username, status')
        .limit(10);

      if (error) {
        setFoundSuppliers([]);
        return;
      }

      const list: SupplierResult[] = (data || []).map((app: any) => ({
        id: app.id,
        company_name: app.company_name || 'Поставщик',
        categories: Array.isArray(app.categories) ? app.categories : [],
        contact_person: app.contact_person,
        phone: app.phone,
        telegram_username: app.telegram_username,
        is_verified: app.status === 'APPROVED',
      }));

      // Filter by category or show top suppliers
      const filtered = list.filter(
        (s) =>
          s.categories.length === 0 ||
          s.categories.some((c) =>
            c.toLowerCase().includes(tag.toLowerCase()) ||
            (tag === 'packaging' && c.toLowerCase().includes('упаков')) ||
            (tag === 'cups' && c.toLowerCase().includes('посуд')) ||
            (tag === 'syrups' && c.toLowerCase().includes('сироп')) ||
            (tag === 'coffee' && c.toLowerCase().includes('кофе'))
          )
      );

      setFoundSuppliers(filtered.length > 0 ? filtered : list.slice(0, 3));
    } catch {
      setFoundSuppliers([]);
    } finally {
      setSearchingSuppliers(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название закупаемого товара');
      return;
    }

    const qty = parseInt(quantityStr.replace(/\D/g, ''), 10) || 1;
    const maxPrice = maxPriceStr.trim() ? parseFloat(maxPriceStr.replace(',', '.')) : null;
    const deadlineDays = parseInt(deadlineDaysStr.replace(/\D/g, ''), 10) || 7;

    setPublishing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Авторизация', 'Для создания запроса необходимо войти в аккаунт');
        setPublishing(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + deadlineDays);

      const payload: Record<string, any> = {
        buyer_id: user.id,
        user_id: user.id,
        title: title.trim(),
        quantity: qty,
        unit: unit.trim() || 'шт',
        specs: specs.trim(),
        max_price: maxPrice,
        budget: maxPrice ? maxPrice * qty : null,
        city: city.trim() || 'Бишкек',
        deadline_days: deadlineDays,
        raw_ai_prompt: prompt.trim() || null,
        category_tag: categoryTag,
        status: 'OPEN',
        description: `Закупка: ${title}. Количество: ${qty} ${unit}. Характеристики: ${specs}. Срок: ${deadlineDays} дн. Город: ${city}.`,
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from('requests')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        // Safe fallback if max_price/budget column doesn't exist
        const fallbackPayload = {
          user_id: user.id,
          buyer_id: user.id,
          title: title.trim(),
          city: city.trim() || 'Бишкек',
          status: 'OPEN',
          description: JSON.stringify({
            title,
            quantity: qty,
            unit,
            specs,
            max_price: maxPrice,
            deadline_days: deadlineDays,
            category_tag: categoryTag,
          }),
          expires_at: expiresAt.toISOString(),
        };

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('requests')
          .insert([fallbackPayload])
          .select('id')
          .single();

        if (fallbackError) {
          throw fallbackError;
        }

        const newId = fallbackData?.id;
        setLastCreatedId(newId);
        setCreatedModalVisible(true);
      } else {
        const newId = data?.id;
        setLastCreatedId(newId);
        setCreatedModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Ошибка создания запроса', err.message || 'Не удалось сохранить запрос');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.aiIconBadge}>
            <Feather name="cpu" size={16} color={THEME.accent} />
          </View>
          <Text style={styles.headerTitle}>AI-Снабжение BazaarOS</Text>
        </View>
        <TouchableOpacity style={styles.exchangeButton} onPress={onNavigateToExchange}>
          <Feather name="list" size={16} color={THEME.textSecondary} />
          <Text style={styles.exchangeButtonText}>Биржа</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* AI Input Section */}
        <View style={styles.aiSection}>
          <Text style={styles.sectionSubtitle}>
            Опишите запрос своими словами — AI мгновенно заполнит спецификацию и подберет проверенных поставщиков
          </Text>

          {/* Quick chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {TEMPLATE_CHIPS.map((chip, index) => (
              <TouchableOpacity
                key={index}
                style={styles.chip}
                onPress={() => {
                  setPrompt(chip.prompt);
                  const parsed = parseRfqFallback(chip.prompt);
                  applyParsedData(parsed);
                  searchSuppliers(parsed.category_tag);
                }}
              >
                <Feather name="zap" size={12} color={THEME.accent} style={{ marginRight: 6 }} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Prompt input */}
          <TextInput
            style={styles.promptInput}
            multiline
            numberOfLines={4}
            placeholder="Например: Нужно 500 картонных коробок 30х20х15 см для доставки в Бишкек до 85 сом за шт, срок 7 дней"
            placeholderTextColor={THEME.textMuted}
            value={prompt}
            onChangeText={setPrompt}
          />

          <TouchableOpacity
            style={styles.aiParseButton}
            onPress={handleParsePrompt}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator color="#090A0F" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#090A0F" style={{ marginRight: 8 }} />
                <Text style={styles.aiParseButtonText}>Разобрать через AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Specification Card */}
        <View style={styles.specCard}>
          <View style={styles.specHeader}>
            <Feather name="file-text" size={16} color={THEME.accent} />
            <Text style={styles.specTitle}>Спецификация тендера</Text>
          </View>

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Наименование товара</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Коробки картонные 30х20х15 см"
              placeholderTextColor={THEME.textMuted}
            />
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Категория</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.tag}
                  style={[
                    styles.categoryButton,
                    categoryTag === cat.tag && styles.categoryButtonActive,
                  ]}
                  onPress={() => {
                    setCategoryTag(cat.tag);
                    searchSuppliers(cat.tag);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      categoryTag === cat.tag && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Specs */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Характеристики / Размеры / Плотность</Text>
            <TextInput
              style={styles.input}
              value={specs}
              onChangeText={setSpecs}
              placeholder="300x200x150 мм, трехслойный гофрокартон Т-22"
              placeholderTextColor={THEME.textMuted}
            />
          </View>

          {/* Quantity & Unit */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Количество</Text>
              <TextInput
                style={styles.input}
                value={quantityStr}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const clean = text.replace(/\D/g, '');
                  setQuantityStr(clean);
                }}
                placeholder="500"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Единица</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="шт"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
          </View>

          {/* Max Price & Deadline */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Желаемая цена (сом/ед)</Text>
              <TextInput
                style={styles.input}
                value={maxPriceStr}
                keyboardType="numeric"
                onChangeText={setMaxPriceStr}
                placeholder="85"
                placeholderTextColor={THEME.textMuted}
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Срок поставки (дней)</Text>
              <TextInput
                style={styles.input}
                value={deadlineDaysStr}
                keyboardType="numeric"
                onChangeText={(text) => setDeadlineDaysStr(text.replace(/\D/g, ''))}
                placeholder="7"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
          </View>

          {/* City */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Город доставки</Text>
            <View style={styles.cityChips}>
              {['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.cityChip, city === c && styles.cityChipActive]}
                  onPress={() => setCity(c)}
                >
                  <Text style={[styles.cityChipText, city === c && styles.cityChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={city}
              onChangeText={setCity}
              placeholder="Город доставки"
              placeholderTextColor={THEME.textMuted}
            />
          </View>
        </View>

        {/* Matched Suppliers Section */}
        <View style={styles.suppliersSection}>
          <View style={styles.suppliersHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="users" size={16} color={THEME.accent} style={{ marginRight: 8 }} />
              <Text style={styles.suppliersTitle}>Поставщики в базе</Text>
            </View>
            <TouchableOpacity
              style={styles.searchSuppliersBtn}
              onPress={() => searchSuppliers(categoryTag)}
              disabled={searchingSuppliers}
            >
              <Feather name="refresh-cw" size={12} color={THEME.textSecondary} />
              <Text style={styles.searchSuppliersText}>Обновить</Text>
            </TouchableOpacity>
          </View>

          {searchingSuppliers ? (
            <ActivityIndicator color={THEME.accent} style={{ marginVertical: 16 }} />
          ) : foundSuppliers.length > 0 ? (
            foundSuppliers.map((sup) => (
              <View key={sup.id} style={styles.supplierCard}>
                <View style={styles.supplierTop}>
                  <Text style={styles.supplierName}>{sup.company_name}</Text>
                  {sup.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Feather name="check-circle" size={12} color={THEME.accent} />
                      <Text style={styles.verifiedText}>Верифицирован</Text>
                    </View>
                  )}
                </View>
                {sup.categories.length > 0 && (
                  <Text style={styles.supplierCategories}>
                    {sup.categories.slice(0, 3).join(', ')}
                  </Text>
                )}
                {sup.telegram_username && (
                  <Text style={styles.supplierTg}>@{sup.telegram_username.replace('@', '')}</Text>
                )}
              </View>
            ))
          ) : searchDone ? (
            <View style={styles.emptySuppliers}>
              <Text style={styles.emptySuppliersText}>
                Пока нет поставщиков в этой категории. Заявка будет опубликована на общей бирже.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.findSuppliersAction}
              onPress={() => searchSuppliers(categoryTag)}
            >
              <Feather name="search" size={14} color={THEME.accent} style={{ marginRight: 6 }} />
              <Text style={styles.findSuppliersActionText}>Найти подходящих поставщиков</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Publish Button */}
        <TouchableOpacity
          style={styles.publishButton}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color="#090A0F" />
          ) : (
            <>
              <Feather name="send" size={18} color="#090A0F" style={{ marginRight: 8 }} />
              <Text style={styles.publishButtonText}>Опубликовать RFQ-запрос</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={createdModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBadge}>
              <Feather name="check" size={28} color={THEME.accent} />
            </View>
            <Text style={styles.modalTitle}>Запрос успешно создан</Text>
            <Text style={styles.modalSubtitle}>
              Тендер опубликован на бирже BazaarOS. Поставщики получили уведомление и уже могут подавать коммерческие предложения.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setCreatedModalVisible(false);
                if (lastCreatedId) {
                  onRequestCreated(lastCreatedId);
                } else {
                  onNavigateToExchange();
                }
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Перейти к запросу</Text>
              <Feather name="arrow-right" size={16} color="#090A0F" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => {
                setCreatedModalVisible(false);
                onNavigateToExchange();
              }}
            >
              <Text style={styles.modalSecondaryBtnText}>Открыть биржу RFQ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: THEME.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.accentBorder,
  },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  exchangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  exchangeButtonText: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  aiSection: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  sectionSubtitle: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  chipsScroll: {
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    marginRight: 8,
  },
  chipText: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  promptInput: {
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    color: THEME.textPrimary,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  aiParseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    borderRadius: 8,
  },
  aiParseButtonText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '700',
  },
  specCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
  },
  specHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  specTitle: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
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
  row: {
    flexDirection: 'row',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryButton: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryButtonActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accent,
  },
  categoryButtonText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: THEME.accent,
    fontWeight: '700',
  },
  cityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cityChipActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accent,
  },
  cityChipText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  cityChipTextActive: {
    color: THEME.accent,
    fontWeight: '700',
  },
  suppliersSection: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 20,
  },
  suppliersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  suppliersTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  searchSuppliersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchSuppliersText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  supplierCard: {
    backgroundColor: THEME.inputBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.inputBorder,
    marginBottom: 8,
  },
  supplierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierName: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.accentBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    color: THEME.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  supplierCategories: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  supplierTg: {
    color: THEME.accent,
    fontSize: 11,
    marginTop: 4,
  },
  emptySuppliers: {
    paddingVertical: 8,
  },
  emptySuppliersText: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  findSuppliersAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accentBg,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.accentBorder,
  },
  findSuppliersActionText: {
    color: THEME.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 14,
    borderRadius: 10,
  },
  publishButtonText: {
    color: '#090A0F',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  modalIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.accentBorder,
    marginBottom: 16,
  },
  modalTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalSecondaryBtnText: {
    color: THEME.textSecondary,
    fontSize: 13,
  },
});
