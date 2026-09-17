"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { StoreFormValues, storeFormSchema } from "../schema"
import { createStore, updateStore } from "@/app/actions/stores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImagePlus, Loader2 } from "lucide-react"
import { ImageWithFallback } from "@/components/shared/image-with-fallback"

export function StoreForm({ categories, initialData = null, isEditing = false }: { categories: any[], initialData?: any, isEditing?: boolean }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(initialData?.logo_url || null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      categoryId: initialData?.category_id || "",
      city: initialData?.city || "Бишкек",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
    }
  })

  const currentCategory = watch("categoryId")

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue("logo", file)
      const url = URL.createObjectURL(file)
      setPreviewLogo(url)
    }
  }

  const onSubmit = async (data: StoreFormValues) => {
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("description", data.description || "")
    formData.append("categoryId", data.categoryId)
    formData.append("city", data.city)
    formData.append("phone", data.phone || "")
    formData.append("email", data.email || "")
    if (data.logo) {
      formData.append("logo", data.logo)
    }

    try {
      let result;
      if (isEditing && initialData) {
        result = await updateStore(initialData.id, formData)
      } else {
        result = await createStore(formData)
      }

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        router.push("/my-store")
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label>Логотип магазина</Label>
          <div className="mt-2 flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted border">
              {previewLogo ? (
                <ImageWithFallback src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImagePlus className="w-8 h-8" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center justify-center h-10 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors">
                Загрузить логотип
              </Label>
              <input id="logo-upload" type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleLogoChange} />
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP (рекомендуется 1:1)</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Название магазина <span className="text-destructive">*</span></Label>
          <Input id="name" {...register("name")} className="h-12 bg-muted/50" placeholder="Например: TechStore" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label>Категория <span className="text-destructive">*</span></Label>
          <Select 
            value={currentCategory} 
            onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 bg-muted/50">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(c => !c.parent_id).map((root) => {
                const children = categories.filter(c => c.parent_id === root.id)
                if (children.length > 0) {
                  return (
                    <div key={root.id}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{root.name}</div>
                      {children.map(child => (
                        <SelectItem key={child.id} value={child.id} className="pl-6">{child.name}</SelectItem>
                      ))}
                    </div>
                  )
                }
                return <SelectItem key={root.id} value={root.id}>{root.name}</SelectItem>
              })}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Город <span className="text-destructive">*</span></Label>
          <Input id="city" {...register("city")} className="h-12 bg-muted/50" readOnly />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea id="description" {...register("description")} className="bg-muted/50 min-h-[120px]" placeholder="Расскажите о вашем магазине..." />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" {...register("phone")} className="h-12 bg-muted/50" placeholder="+996..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} className="h-12 bg-muted/50" placeholder="store@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={isLoading}>
          {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {isEditing ? "Сохранить изменения" : "Создать магазин"}
        </Button>
      </div>
    </form>
  )
}
