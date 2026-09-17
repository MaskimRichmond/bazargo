"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { RequestFormValues, requestFormSchema } from "../schema"
import { createRequest } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export function RequestForm({ categories }: { categories: any[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      title: "",
      categoryId: "",
      description: "",
      condition: "ANY",
      city: "Бишкек",
      expiresInDays: 7
    }
  })

  const currentCategory = watch("categoryId")
  const currentCondition = watch("condition")

  const onSubmit = async (data: RequestFormValues) => {
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("title", data.title)
    formData.append("categoryId", data.categoryId)
    formData.append("description", data.description || "")
    if (data.budgetMax) formData.append("budgetMax", data.budgetMax.toString())
    formData.append("condition", data.condition || "ANY")
    formData.append("city", data.city)
    formData.append("expiresInDays", data.expiresInDays.toString())

    try {
      const result = await createRequest(formData)
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        router.push("/requests")
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
        <div className="space-y-2">
          <Label htmlFor="title">Что вам нужно? <span className="text-destructive">*</span></Label>
          <Input id="title" {...register("title")} className="h-12 bg-muted/50" placeholder="Например: iPhone 13 128GB синий" />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
        </div>

        <div className="space-y-2">
          <Label>Категория <span className="text-destructive">*</span></Label>
          <Select 
            value={currentCategory} 
            onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 bg-muted/50">
              <SelectValue placeholder="Выберите самую точную категорию" />
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
          <Label htmlFor="description">Описание (опционально)</Label>
          <Textarea id="description" {...register("description")} className="bg-muted/50 min-h-[100px]" placeholder="Уточните детали: цвет, комплект, состояние батареи..." />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMax">Максимальная цена (сом)</Label>
            <Input id="budgetMax" type="number" {...register("budgetMax")} className="h-12 bg-muted/50" placeholder="Например: 30000" />
            {errors.budgetMax && <p className="text-xs text-destructive">{errors.budgetMax.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label>Состояние</Label>
            <Select 
              value={currentCondition} 
              onValueChange={(val: any) => setValue("condition", val)}
            >
              <SelectTrigger className="h-12 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Любое</SelectItem>
                <SelectItem value="NEW">Новое</SelectItem>
                <SelectItem value="USED_LIKE_NEW">Как новое</SelectItem>
                <SelectItem value="USED_GOOD">Хорошее (Б/у)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Город <span className="text-destructive">*</span></Label>
            <Input id="city" {...register("city")} className="h-12 bg-muted/50" readOnly />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message as string}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Срок актуальности</Label>
            <Select 
              value={watch("expiresInDays").toString()} 
              onValueChange={(val) => setValue("expiresInDays", parseInt(val))}
            >
              <SelectTrigger className="h-12 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 дня</SelectItem>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>

      <div className="pt-4 border-t">
        <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={isLoading}>
          {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          Опубликовать запрос
        </Button>
      </div>
    </form>
  )
}
