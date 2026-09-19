"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateProfileSettings } from "@/app/actions/settings"
import { REGIONS } from "@/lib/regions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

type SettingsData = {
  full_name: string
  city: string
}

export function SettingsForm({ profile, userId }: { profile: any, userId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SettingsData>({
    defaultValues: {
      full_name: profile?.full_name || "",
      city: profile?.city || ""
    }
  })

  const currentRegion = watch("city")

  const onSubmit = async (data: SettingsData) => {
    setIsSubmitting(true)
    const res = await updateProfileSettings(data)
    if (res.error) {
      alert(res.error)
    } else {
      alert("Настройки сохранены!")
      router.refresh()
    }
    setIsSubmitting(false)
  }

  const handleLogout = async () => {
    if (confirm("Вы уверены, что хотите выйти?")) {
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name">Имя</Label>
          <Input 
            id="full_name" 
            placeholder="Ваше имя" 
            {...register("full_name", { required: "Обязательное поле" })} 
          />
          {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Ваш регион</Label>
          <Select 
            value={currentRegion} 
            onValueChange={(v) => setValue("city", v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите регион" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Этот регион будет использоваться по умолчанию для объявлений.</p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl">
          {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </form>

      <div className="pt-8 border-t">
        <h3 className="font-bold text-destructive mb-4">Опасная зона</h3>
        <Button variant="outline" onClick={handleLogout} className="text-destructive border-destructive hover:bg-destructive/10">
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  )
}
