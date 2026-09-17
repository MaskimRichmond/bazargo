import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function DeliveryOptions() {
  const { watch, setValue, formState: { errors } } = useFormContext()
  const currentMethods = watch("deliveryMethods") || []

  const toggleMethod = (method: string) => {
    if (currentMethods.includes(method)) {
      setValue("deliveryMethods", currentMethods.filter((m: string) => m !== method), { shouldValidate: true })
    } else {
      setValue("deliveryMethods", [...currentMethods, method], { shouldValidate: true })
    }
  }

  const options = [
    { id: "PICKUP", label: "Самовывоз", description: "Покупатель забирает товар сам" },
    { id: "SELLER_DELIVERY", label: "Доставка продавцом", description: "Вы можете доставить товар покупателю" },
    { id: "THIRD_PARTY", label: "Сторонняя доставка", description: "Доставка через курьерские службы" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-2">Способ получения</h2>
      <p className="text-sm text-muted-foreground mb-6">Выберите один или несколько вариантов</p>

      {errors.deliveryMethods && <p className="text-sm text-destructive font-medium">{errors.deliveryMethods.message as string}</p>}

      <div className="space-y-3">
        {options.map((opt) => (
          <div 
            key={opt.id} 
            className={`flex items-start space-x-3 p-4 rounded-xl border transition-colors cursor-pointer ${
              currentMethods.includes(opt.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onClick={() => toggleMethod(opt.id)}
          >
            <Checkbox 
              id={opt.id} 
              checked={currentMethods.includes(opt.id)} 
              className="mt-1"
            />
            <div className="space-y-1">
              <Label htmlFor={opt.id} className="text-base font-semibold cursor-pointer">{opt.label}</Label>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
