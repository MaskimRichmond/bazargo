"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateProfileSettings, B2BProfileSettingsData } from "@/app/actions/settings"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  Building2, 
  Truck, 
  MapPin, 
  Briefcase, 
  Bell, 
  Phone, 
  Send, 
  Save, 
  Loader2, 
  LogOut,
  AlertTriangle,
  X
} from "lucide-react"

const CITIES = [
  "Бишкек",
  "Ош",
  "Джалал-Абад",
  "Каракол",
  "Токмок",
  "Кант",
  "Нарын",
  "Талас",
  "Баткен",
  "Кара-Балта",
  "Узген"
]

export function SettingsForm({ 
  profile, 
  userId 
}: { 
  profile: Record<string, any>
  userId: string 
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<B2BProfileSettingsData>({
    defaultValues: {
      company_name: profile?.company_name || profile?.full_name || "",
      business_type: profile?.business_type || "horeca",
      city: profile?.city || "Бишкек",
      delivery_address: profile?.delivery_address || "",
      whatsapp: profile?.whatsapp || profile?.phone || "",
      telegram_username: profile?.telegram_username || ""
    }
  })

  const currentBusinessType = watch("business_type")
  const currentCity = watch("city")

  const onSubmit = async (data: B2BProfileSettingsData) => {
    setIsSubmitting(true)
    try {
      const res = await updateProfileSettings(data)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Реквизиты компании сохранены")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Ошибка при сохранении настроек")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* CARD 1: Реквизиты и логистика */}
        <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b pb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Реквизиты и логистика
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Данные вашей организации и фактический адрес доставки для поставщиков
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Название компании / заведения */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="company_name" className="text-sm font-semibold flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>Название компании или заведения</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                placeholder="Например: ОсОО «Арабика Кофе» или Сеть кофеен «Sierra»"
                className="h-11 rounded-xl bg-background text-sm"
                {...register("company_name", { required: "Укажите название компании или заведения" })}
              />
              {errors.company_name && (
                <p className="text-xs text-destructive">{errors.company_name.message}</p>
              )}
            </div>

            {/* Сфера бизнеса */}
            <div className="space-y-2">
              <Label htmlFor="business_type" className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Сфера бизнеса</span>
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currentBusinessType}
                onValueChange={(val) => setValue("business_type", val, { shouldValidate: true })}
              >
                <SelectTrigger id="business_type" className="h-11 rounded-xl bg-background text-sm">
                  <SelectValue placeholder="Выберите сферу деятельности" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horeca">HoReCa (Кафе, Рестораны, Кофейни, Бары)</SelectItem>
                  <SelectItem value="retail">Магазин / Торговая точка / Ритейл</SelectItem>
                  <SelectItem value="production">Производство / Фабрика / Цех</SelectItem>
                  <SelectItem value="wholesale">Оптовая торговля / Дистрибуция</SelectItem>
                  <SelectItem value="other">Другое коммерческое предприятие</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Город базирования */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Город базирования</span>
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currentCity}
                onValueChange={(val) => setValue("city", val, { shouldValidate: true })}
              >
                <SelectTrigger id="city" className="h-11 rounded-xl bg-background text-sm">
                  <SelectValue placeholder="Выберите город" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Фактический адрес доставки */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="delivery_address" className="text-sm font-semibold flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-primary" />
                <span>Фактический адрес доставки</span>
              </Label>
              <Textarea
                id="delivery_address"
                rows={2}
                placeholder="Например: г. Бишкек, ул. Токтогула 125, ориентир ТЦ «Мото», ворота со двора"
                className="rounded-xl bg-background text-sm resize-none"
                {...register("delivery_address")}
              />
              <p className="text-[11px] text-muted-foreground">
                Поставщики увидят этот адрес для точного расчета стоимости доставки партии.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: Уведомления и интеграция */}
        <div className="rounded-3xl border bg-card p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b pb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Уведомления и интеграция
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Прямые каналы для оперативной связи, котировок и подтверждения сделок
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-semibold flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-primary" />
                <span>WhatsApp номер для связи</span>
              </Label>
              <Input
                id="whatsapp"
                placeholder="+996 555 123 456"
                className="h-11 rounded-xl bg-background font-mono text-sm"
                {...register("whatsapp")}
              />
              <p className="text-[11px] text-muted-foreground">
                Используется поставщиками для отправки спецификаций и счетов.
              </p>
            </div>

            {/* Telegram Username */}
            <div className="space-y-2">
              <Label htmlFor="telegram_username" className="text-sm font-semibold flex items-center gap-1.5">
                <Send className="w-4 h-4 text-primary" />
                <span>Telegram @username</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs text-muted-foreground font-mono pointer-events-none">
                  @
                </span>
                <Input
                  id="telegram_username"
                  placeholder="company_procurement"
                  className="h-11 rounded-xl bg-background pl-8 font-mono text-sm"
                  {...register("telegram_username")}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Для мгновенных системных уведомлений по коммерческим предложениям.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение данных...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить профиль компании</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowLogoutModal(true)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 rounded-xl h-10"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти из аккаунта</span>
          </Button>
        </div>
      </form>

      {/* Custom Logout Modal (No window.confirm) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">Выйти из аккаунта?</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Вы завершите текущую сессию в BazaarOS. Для дальнейшей работы потребуется повторная авторизация.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl text-xs"
              >
                Отмена
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Выйти</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
