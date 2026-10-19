"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { submitSupplierApplication } from "@/app/actions/b2b"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CheckCircle2, Send, Loader2, Building2, User, Phone, MapPin, Tag, MessageSquare, ArrowRight } from "lucide-react"
import Link from "next/link"

type SupplierFormData = {
  company_name: string
  contact_name: string
  phone: string
  city: string
  categories: string
  telegram_username: string
  description: string
}

const PRESET_CATEGORIES = [
  "Упаковка и коробки",
  "Стаканы и одноразовая посуда",
  "Кофе и сиропы",
  "Хозтовары",
  "Продукты HoReCa"
]

export function SupplierApplicationForm({ userId }: { userId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SupplierFormData>({
    defaultValues: {
      city: "Бишкек",
      telegram_username: "",
      categories: ""
    }
  })

  const toggleCategory = (cat: string) => {
    let next: string[]
    if (selectedCats.includes(cat)) {
      next = selectedCats.filter(c => c !== cat)
    } else {
      next = [...selectedCats, cat]
    }
    setSelectedCats(next)
    setValue("categories", next.join(", "), { shouldValidate: true })
  }

  const onSubmit = async (data: SupplierFormData) => {
    const finalCategories = selectedCats.length > 0 ? selectedCats.join(", ") : data.categories
    if (!finalCategories) {
      toast.error("Выберите хотя бы одну категорию снабжения")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitSupplierApplication({
        company_name: data.company_name,
        contact_name: data.contact_name,
        phone: data.phone,
        city: data.city,
        categories: finalCategories,
        telegram_username: data.telegram_username,
        description: data.description
      })

      if (result.error) {
        toast.error(result.error)
        setIsSubmitting(false)
        return
      }

      setIsSuccess(true)
      toast.success("Заявка успешно отправлена! Мы свяжемся с вами в Telegram")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Ошибка при отправке заявки. Попробуйте позже.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="p-8 text-center space-y-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">Заявка успешно принята!</h3>
          <p className="text-zinc-300 text-sm max-w-md mx-auto leading-relaxed">
            Ваша компания поставщика добавлена на модерацию. Оповещения о подходящих B2B-запросах и коммерческих сделках будут приходить в Telegram.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Link href="/requests">
              <span>Смотреть открытые RFQ-запросы</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-zinc-800 bg-[#090A0F] text-zinc-300 hover:text-white">
            <Link href="/b2b">Кабинет поставщика</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 1. Company Name */}
      <div className="space-y-2">
        <Label htmlFor="company_name" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Название компании, фабрики или ИП <span className="text-red-400">*</span>
        </Label>
        <Input 
          id="company_name" 
          placeholder="ОсОО «ГофроПак Кыргызстан» или ИП Сулайманов" 
          className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          {...register("company_name", { required: "Укажите название компании" })} 
        />
        {errors.company_name && <p className="text-xs text-red-400">{errors.company_name.message}</p>}
      </div>

      {/* 2. Contact Person & Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="contact_name" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
            <User className="w-4 h-4 text-zinc-400" />
            Контактное лицо <span className="text-red-400">*</span>
          </Label>
          <Input 
            id="contact_name" 
            placeholder="Азамат Касымов" 
            className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
            {...register("contact_name", { required: "Укажите контактное лицо" })} 
          />
          {errors.contact_name && <p className="text-xs text-red-400">{errors.contact_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
            <Phone className="w-4 h-4 text-zinc-400" />
            Номер телефона <span className="text-red-400">*</span>
          </Label>
          <Input 
            id="phone" 
            placeholder="+996 555 123 456" 
            className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 font-mono placeholder:text-zinc-600"
            {...register("phone", { required: "Укажите номер телефона" })} 
          />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>
      </div>

      {/* 3. Telegram Username & City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="telegram_username" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
            <Send className="w-4 h-4 text-emerald-400" />
            Telegram (@username) для мгновенного получения заказов
          </Label>
          <div className="relative">
            <Input 
              id="telegram_username" 
              placeholder="@username" 
              className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100 font-mono placeholder:text-zinc-600"
              {...register("telegram_username")} 
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            На этот аккаунт бот будет отправлять горячие RFQ-запросы по вашим категориям
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
            <MapPin className="w-4 h-4 text-zinc-400" />
            Город / Базис склада <span className="text-red-400">*</span>
          </Label>
          <Select defaultValue="Бишкек" onValueChange={(val) => setValue("city", val, { shouldValidate: true })}>
            <SelectTrigger className="h-11 rounded-xl bg-[#090A0F] border-zinc-800 text-zinc-100">
              <SelectValue placeholder="Выберите город" />
            </SelectTrigger>
            <SelectContent className="bg-[#11131A] border-zinc-800 text-zinc-100">
              <SelectItem value="Бишкек">Бишкек</SelectItem>
              <SelectItem value="Ош">Ош</SelectItem>
              <SelectItem value="Джалал-Абад">Джалал-Абад</SelectItem>
              <SelectItem value="Каракол">Каракол</SelectItem>
              <SelectItem value="Токмок">Токмок</SelectItem>
              <SelectItem value="Нарын">Нарын</SelectItem>
              <SelectItem value="Талас">Талас</SelectItem>
              <SelectItem value="Баткен">Баткен</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Supply Categories (Chips) */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
          <Tag className="w-4 h-4 text-emerald-400" />
          Категории снабжения оптом <span className="text-red-400">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((cat) => {
            const isSelected = selectedCats.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                    : "bg-[#090A0F] text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Company Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-1.5 text-zinc-200">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          О компании и производственных мощностях (необязательно)
        </Label>
        <Textarea 
          id="description" 
          placeholder="Собственное производство гофротары в Чуйской области, минимальные партии от 500 шт, доставка собственным автотранспортом..." 
          className="resize-none min-h-[90px] rounded-xl bg-[#090A0F] border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20"
          {...register("description")} 
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all cursor-pointer" 
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Отправка заявки...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            <span>Подать заявку поставщика</span>
          </>
        )}
      </Button>
    </form>
  )
}
