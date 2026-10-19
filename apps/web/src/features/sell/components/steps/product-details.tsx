import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CITIES_BY_REGION, guessRegionByCity } from "@/lib/regions"
import { useTranslations } from "next-intl";

function renderCategoryOptions(categories: { id: string, name: string, parent_id: string | null }[], parentId: string | null = null, depth = 0) {
  return categories
    .filter(c => c.parent_id === parentId)
    .map(c => {
      const children = categories.filter(child => child.parent_id === c.id)
      const padding = depth * 16 // 16px per level

      if (children.length > 0) {
        return (
          <SelectGroup key={c.id}>
            <SelectLabel 
              className="px-2 py-1.5 text-sm font-semibold text-muted-foreground" 
              style={{ paddingLeft: `${8 + padding}px` }}
            >
              {c.name}
            </SelectLabel>
            {renderCategoryOptions(categories, c.id, depth + 1)}
          </SelectGroup>
        )
      }
      return (
        <SelectItem 
          key={c.id} 
          value={c.id} 
        >
          <div style={{ paddingLeft: `${padding}px` }}>{c.name}</div>
        </SelectItem>
      )
    })
}

export function ProductDetails({ categories }: { categories: { id: string, name: string, parent_id: string | null }[] }) {
    const t = useTranslations();
  const { register, watch, setValue, formState: { errors } } = useFormContext()
  const listingType = watch("type")
  const currentCategory = watch("categoryId")
  const currentCondition = watch("condition")

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-6">{t("o_tovare")}</h2>

      <div className="space-y-2">
        <Label htmlFor="title">{t("nazvanie")}<span className="text-destructive">*</span></Label>
        <Input 
          id="title" 
          placeholder={t("naprimer_iphone_13_128gb_2")} 
          {...register("title")} 
          className="h-12 bg-muted/50"
        />
        {errors.title && <p className="text-xs text-destructive">{t(errors.title.message as string)}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t("kategoriya")}<span className="text-destructive">*</span></Label>
        <Select 
          value={currentCategory} 
          onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
        >
          <SelectTrigger className="h-12 bg-muted/50">
            <SelectValue placeholder={t("vyberite_kategoriyu")} />
          </SelectTrigger>
          <SelectContent>
            {renderCategoryOptions(categories)}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-xs text-destructive">{t(errors.categoryId.message as string)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t("tsena_som")}<span className="text-destructive">*</span></Label>
          <Input 
            id="price" 
            type="number"
            placeholder="0"
            {...register("price")} 
            className="h-12 bg-muted/50 font-semibold"
          />
          {errors.price && <p className="text-xs text-destructive">{t(errors.price.message as string)}</p>}
        </div>

        {listingType === "INVENTORY" && (
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("kolichestvo_1")}<span className="text-destructive">*</span></Label>
            <Input 
              id="quantity" 
              type="number"
              placeholder="1"
              {...register("quantity")} 
              className="h-12 bg-muted/50"
            />
            {errors.quantity && <p className="text-xs text-destructive">{t(errors.quantity.message as string)}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("sostoyanie")}<span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "NEW", label: t("conditions.NEW") },
            { id: "USED_LIKE_NEW", label: t("conditions.USED_LIKE_NEW") },
            { id: "USED_GOOD", label: t("conditions.USED_GOOD") },
            { id: "USED_FAIR", label: t("conditions.USED_FAIR") },
            { id: "FOR_PARTS", label: t("conditions.FOR_PARTS") }
          ].map((cond) => (
            <div 
              key={cond.id}
              onClick={() => setValue("condition", cond.id, { shouldValidate: true })}
              className={`p-3 border rounded-xl text-center cursor-pointer text-sm font-medium transition-colors ${
                currentCondition === cond.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              }`}
            >
              {cond.label}
            </div>
          ))}
        </div>
        {errors.condition && <p className="text-xs text-destructive">{t(errors.condition.message as string)}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("opisanie")}<span className="text-destructive">*</span></Label>
        <Textarea 
          id="description" 
          placeholder={t("opishite_tovar_ego_harakteristiki")} 
          {...register("description")} 
          className="min-h-[120px] bg-muted/50 resize-y"
        />
        {errors.description && <p className="text-xs text-destructive">{t(errors.description.message as string)}</p>}
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

      <div className="pt-4 border-t space-y-4">
        <label className="flex items-center gap-3 font-medium cursor-pointer">
          <input 
            type="checkbox" 
            {...register("isB2b")}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Оптовое предложение (B2B)
        </label>
        
        {watch("isB2b") && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border">
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Оптовая цена (сом)</Label>
              <Input 
                id="wholesalePrice" 
                type="number"
                placeholder="0"
                {...register("wholesalePrice")} 
                className="h-10 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderQuantity">Минимальная партия (шт)</Label>
              <Input 
                id="minOrderQuantity" 
                type="number"
                placeholder="10"
                {...register("minOrderQuantity")} 
                className="h-10 bg-background"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
