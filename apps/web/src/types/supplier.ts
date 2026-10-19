export type CompanyType = 'IP' | 'LLC' | 'FACTORY'

export type ModerationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface SupplierProfile {
  id: string
  userId?: string
  companyName: string
  companyType: CompanyType
  inn: string // 14 digits for Kyrgyz Republic
  directorName?: string
  categoryTag: string
  categories?: string[]
  city: string
  address?: string
  phone: string
  telegramUsername?: string
  moderationStatus: ModerationStatus
  priceListUrl?: string
  documentsUrl?: string
  verifiedAt?: string
  createdAt: string
  specs?: string
  description?: string
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  IP: 'ИП (Индивидуальный предприниматель)',
  LLC: 'ОсОО (Юридическое лицо)',
  FACTORY: 'Фабрика / Прямое производство'
}

export const KYRGYZ_CITIES = [
  'Бишкек',
  'Ош',
  'Джалал-Абад',
  'Каракол',
  'Токмок',
  'Чуйская область',
  'Нарын',
  'Талас',
  'Баткен'
] as const

export function validateKyrgyzInn(inn: string): boolean {
  const cleaned = inn.replace(/\D/g, '')
  return cleaned.length === 14
}
