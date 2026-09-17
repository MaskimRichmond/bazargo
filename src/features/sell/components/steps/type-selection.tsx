import { useFormContext } from "react-hook-form"
import { Package, Copy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function TypeSelection({ userStore }: { userStore?: any }) {
  const { watch, setValue } = useFormContext()
  const currentType = watch("type")

  const types = [
    {
      id: "SINGLE",
      title: "Простой товар",
      description: "Один экземпляр. Подходит для личных вещей (например: iPhone 13, 1 шт).",
      icon: Package
    },
    {
      id: "INVENTORY",
      title: "Товар с количеством",
      description: "Несколько одинаковых единиц. Подходит для магазинов (например: AirPods Pro, 15 шт).",
      icon: Copy
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Что вы продаёте?</h2>
      
      <div className="grid gap-4">
        {types.map((type) => {
          const isSelected = currentType === type.id
          
          return (
            <Card 
              key={type.id}
              className={cn(
                "cursor-pointer transition-all border-2",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onClick={() => setValue("type", type.id, { shouldValidate: true })}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <type.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{type.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {currentType === "INVENTORY" && userStore && (
        <Card className="border-primary/20 bg-primary/5 mt-6 animate-in fade-in">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Публикация от магазина</h4>
              <p className="text-xs text-muted-foreground">Объявление будет опубликовано от имени "{userStore.name}"</p>
            </div>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer gap-2">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-primary" 
                  checked={watch("publishAsStore") || false}
                  onChange={(e) => setValue("publishAsStore", e.target.checked)}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
