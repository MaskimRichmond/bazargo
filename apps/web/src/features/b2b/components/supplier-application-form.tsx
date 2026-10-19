"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SupplierFormData = {
  company_name: string
  contact_name: string
  phone: string
  city: string
  categories: string
  description: string
}

export function SupplierApplicationForm({ userId }: { userId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SupplierFormData>()

  const onSubmit = async (data: SupplierFormData) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("b2b_applications")
        .insert({
          user_id: userId,
          company_name: data.company_name,
          contact_name: data.contact_name,
          phone: data.phone,
          city: data.city,
          categories: data.categories,
          description: data.description,
        })

      if (error) throw error

      alert("Заявка успешно отправлена!")
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Ошибка при отправке заявки. Попробуйте позже.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="company_name">Название компании или ИП</Label>
        <Input 
          id="company_name" 
          placeholder="ООО Ромашка" 
          {...register("company_name", { required: "Это поле обязательно" })} 
        />
        {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_name">Контактное лицо</Label>
        <Input 
          id="contact_name" 
          placeholder="Иван Иванов" 
          {...register("contact_name", { required: "Это поле обязательно" })} 
        />
        {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input 
            id="phone" 
            placeholder="+996 555 123 456" 
            {...register("phone", { required: "Это поле обязательно" })} 
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Город</Label>
          <Select onValueChange={(val) => setValue("city", val, { shouldValidate: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите город/область" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Бишкек">Бишкек</SelectItem>
              <SelectItem value="Ош">Ош</SelectItem>
              <SelectItem value="Джалал-Абад">Джалал-Абад</SelectItem>
              <SelectItem value="Каракол">Каракол</SelectItem>
              <SelectItem value="Баткен">Баткен</SelectItem>
              <SelectItem value="Талас">Талас</SelectItem>
              <SelectItem value="Нарын">Нарын</SelectItem>
            </SelectContent>
          </Select>
          {errors.city && <p className="text-sm text-destructive">Выберите город</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categories">В каких категориях планируете продавать?</Label>
        <Input 
          id="categories" 
          placeholder="Электроника, одежда, автозапчасти..." 
          {...register("categories", { required: "Это поле обязательно" })} 
        />
        {errors.categories && <p className="text-sm text-destructive">{errors.categories.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Коротко о вашей компании (необязательно)</Label>
        <Textarea 
          id="description" 
          placeholder="Мы являемся официальным дистрибьютором..." 
          className="resize-none h-24"
          {...register("description")} 
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Отправка..." : "Отправить заявку"}
      </Button>
    </form>
  )
}
