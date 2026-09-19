import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CITIES_BY_REGION, guessRegionByCity } from "@/lib/regions"

export function ProductDetails({ categories }: { categories: any[] }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext()
  const listingType = watch("type")
  const currentCategory = watch("categoryId")
  const currentCondition = watch("condition")

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-6">О товаре</h2>

      <div className="space-y-2">
        <Label htmlFor="title">Название <span className="text-destructive">*</span></Label>
        <Input 
          id="title" 
          placeholder="Например: iPhone 13 128GB" 
          {...register("title")} 
          className="h-12 bg-muted/50"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Цена (сом) <span className="text-destructive">*</span></Label>
          <Input 
            id="price" 
            type="number"
            placeholder="0"
            {...register("price")} 
            className="h-12 bg-muted/50 font-semibold"
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message as string}</p>}
        </div>

        {listingType === "INVENTORY" && (
          <div className="space-y-2">
            <Label htmlFor="quantity">Количество <span className="text-destructive">*</span></Label>
            <Input 
              id="quantity" 
              type="number"
              placeholder="1"
              {...register("quantity")} 
              className="h-12 bg-muted/50"
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message as string}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Состояние <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "NEW", label: "Новое" },
            { id: "USED_LIKE_NEW", label: "Б/у (идеальное)" },
            { id: "USED_GOOD", label: "Б/у (хорошее)" },
            { id: "USED_FAIR", label: "Б/у (нормальное)" },
            { id: "FOR_PARTS", label: "На запчасти" }
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
        {errors.condition && <p className="text-xs text-destructive">{errors.condition.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание <span className="text-destructive">*</span></Label>
        <Textarea 
          id="description" 
          placeholder="Опишите товар, его характеристики и особенности..." 
          {...register("description")} 
          className="min-h-[120px] bg-muted/50 resize-y"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label>Город <span className="text-destructive">*</span></Label>
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
            <SelectValue placeholder="Выберите город" />
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
        {errors.city && <p className="text-xs text-destructive">{errors.city.message as string}</p>}
        {errors.region && <p className="text-xs text-destructive">{errors.region.message as string}</p>}
      </div>

    </div>
  )
}
