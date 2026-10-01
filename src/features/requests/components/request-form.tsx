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
import { CITIES_BY_REGION, guessRegionByCity } from "@/lib/regions"
import { useTranslations } from "next-intl";

export function RequestForm({ categories }: { categories: { id: string, name: string, parent_id: string | null }[] }) {
    const t = useTranslations();
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
      region: "Бишкек",
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
    formData.append("region", data.region)
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
    } catch (err: Error | unknown) {
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
          <Label htmlFor="title">{t("chto_vam_nuzhno")}<span className="text-destructive">*</span></Label>
          <Input id="title" {...register("title")} className="h-12 bg-muted/50" placeholder={t("naprimer_iphone_13_128gb_1")} />
          {errors.title && <p className="text-xs text-destructive">{t(errors.title.message as string)}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("kategoriya")}<span className="text-destructive">*</span></Label>
          <Select 
            value={currentCategory} 
            onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
          >
            <SelectTrigger className="h-12 bg-muted/50">
              <SelectValue placeholder={t("vyberite_samuyu_tochnuyu_kategoriyu")} />
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
          {errors.categoryId && <p className="text-xs text-destructive">{t(errors.categoryId.message as string)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("opisanie_optsionalno")}</Label>
          <Textarea id="description" {...register("description")} className="bg-muted/50 min-h-[100px]" placeholder={t("utochnite_detali_tsvet_komplekt")} />
          {errors.description && <p className="text-xs text-destructive">{t(errors.description.message as string)}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMax">{t("maksimalnaya_tsena_som")}</Label>
            <Input id="budgetMax" type="number" {...register("budgetMax")} className="h-12 bg-muted/50" placeholder={t("naprimer_30000")} />
            {errors.budgetMax && <p className="text-xs text-destructive">{t(errors.budgetMax.message as string)}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("sostoyanie")}</Label>
            <Select 
              value={currentCondition} 
              onValueChange={(val: string) => setValue("condition", val)}
            >
              <SelectTrigger className="h-12 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">{t("lyuboe")}</SelectItem>
                <SelectItem value="NEW">{t("novoe")}</SelectItem>
                <SelectItem value="USED_LIKE_NEW">{t("kak_novoe")}</SelectItem>
                <SelectItem value="USED_GOOD">{t("horoshee_b_u")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>{t("gorod")}<span className="text-destructive">*</span></Label>
          <Select 
            value={watch("city")} 
            onValueChange={(val) => {
              setValue("city", val, { shouldValidate: true })
              const region = guessRegionByCity(val);
              if (region) {
                setValue("region", region, { shouldValidate: true })
              }
            }}
          >
            <SelectTrigger className="h-12 bg-muted/50">
              <SelectValue placeholder={t("vyberite_gorod")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
                <div key={region}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {region}
                  </div>
                  {cities.map((city: string) => (
                    <SelectItem key={city} value={city} className="pl-6">{city}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          {errors.city && <p className="text-xs text-destructive">{t(errors.city.message as string)}</p>}
          {errors.region && <p className="text-xs text-destructive">{t(errors.region.message as string)}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("srok_aktualnosti")}</Label>
          <Select 
            value={watch("expiresInDays").toString()} 
            onValueChange={(val) => setValue("expiresInDays", parseInt(val))}
          >
            <SelectTrigger className="h-12 bg-muted/50 w-full md:w-1/2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{t("3_dnya")}</SelectItem>
              <SelectItem value="7">{t("7_dney")}</SelectItem>
              <SelectItem value="14">{t("14_dney")}</SelectItem>
              <SelectItem value="30">{t("30_dney")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="pt-4 border-t">
        <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={isLoading}>
          {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {t("opublikovat_zapros")}</Button>
      </div>
    </form>
  );
}
