import Link from "next/link"
import { getPublicRegistry } from "@/app/actions/b2b"
import { SupplierRegistryClient } from "@/features/suppliers/components/supplier-registry-client"
import { BazaarIcon } from "@/components/shared/bazaar-logo"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Boxes,
  ShieldCheck,
  MapPin,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Users
} from "lucide-react"

export const metadata = {
  title: "Реестр оптовых поставщиков и фабрик Кыргызстана | BazaarOS B2B",
  description: "Проверенные производители, импортеры и дистрибьюторы Кыргызстана (ИП, ОсОО, фабрики). Прямые контакты и оптовые прайс-листы."
}

export default async function PublicSuppliersPage() {
  const registry = await getPublicRegistry()

  // Calculate unique cities count
  const citiesSet = new Set<string>()
  registry.suppliers.forEach(s => s.city && citiesSet.add(s.city))
  registry.products.forEach(p => p.city && citiesSet.add(p.city))
  const citiesCount = Math.max(citiesSet.size, 5)

  return (
    <div className="container mx-auto px-4 py-8 md:py-14 max-w-6xl space-y-12">
      {/* Hero Header */}
      <div className="rounded-3xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-6 md:p-10 relative overflow-hidden shadow-sm">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <BazaarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>BazaarOS • Открытый реестр поставщиков Кыргызстана</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Реестр оптовых поставщиков и фабрик
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
            Каталог проверенных юридических лиц (ОсОО, ИП, прямое производство) для регулярного снабжения ресторанов, ритейла и производств. Проверенные реквизиты, 14-значные ИНН и оптовые цены без переплат.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Link href="/requests/create">
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>Создать запрос котировок (AI)</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Link href="/b2b/become-supplier">
              <Building2 className="w-4 h-4 mr-1.5" />
              <span>Зарегистрироваться как поставщик</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>КОМПАНИИ В РЕЕСТРЕ</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
            {registry.suppliers.length}
          </div>
          <p className="text-xs text-zinc-500">
            ОсОО, индивидуальные предприниматели и фабрики
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>ОПТОВЫЕ ПОЗИЦИИ</span>
            <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
            {registry.products.length}
          </div>
          <p className="text-xs text-zinc-500">
            Товары с фиксированными ценами и подтвержденным MOQ
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>РЕГИОНЫ СНАБЖЕНИЯ</span>
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
            {citiesCount}
          </div>
          <p className="text-xs text-zinc-500">
            Бишкек, Ош, Джалал-Абад, Чуйская область и другие
          </p>
        </div>
      </div>

      {/* Main Client Component (Filters, Tabs, Product/Supplier Lists) */}
      <SupplierRegistryClient
        initialProducts={registry.products}
        initialSuppliers={registry.suppliers}
      />

      {/* Pre-footer Callout for Suppliers */}
      <div className="rounded-3xl bg-zinc-50 dark:bg-[#090A0F] border border-zinc-200 dark:border-zinc-800 p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Аккредитация поставщиков Кыргызстана</span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Производите или импортируете оптовые товары?
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            Разместите свои прайс-листы в каталоге BazaarOS. Получайте регулярные оптовые заказы от кофеен, отелей, производств и торговых сетей с моментальными алертами в Telegram.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <Button asChild className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Link href="/b2b/become-supplier">
              <span>Пройти аккредитацию</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11131A] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
            <Link href="/b2b">Кабинет поставщика</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
