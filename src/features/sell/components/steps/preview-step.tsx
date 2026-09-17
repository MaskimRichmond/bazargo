import { useFormContext } from "react-hook-form"
import { ProductCard } from "@/components/shared/product-card"

export function PreviewStep({ categories }: { categories: any[] }) {
  const { watch } = useFormContext()
  const data = watch()

  // Generate a mock product for the preview card
  const categoryName = categories.find(c => c.id === data.categoryId)?.name || "Без категории"
  
  const previewProduct = {
    id: "preview",
    title: data.title || "Без названия",
    price: data.price || 0,
    city: data.city || "Бишкек",
    time: "Только что",
    condition: data.condition === "NEW" ? "Новое" : 
               data.condition === "USED_LIKE_NEW" ? "Б/у (идеальное)" : 
               data.condition === "USED_GOOD" ? "Б/у (хорошее)" : 
               data.condition === "USED_FAIR" ? "Б/у (нормальное)" : "На запчасти",
    seller: { name: "Вы", rating: 0, reviews: 0 },
    image: data.images?.[0]?.url || "",
    isVerified: false,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Как будет выглядеть объявление</h2>
        <p className="text-sm text-muted-foreground">Проверьте данные перед публикацией</p>
      </div>

      <div className="max-w-xs mx-auto border rounded-xl overflow-hidden shadow-lg p-2 bg-background">
        <ProductCard product={previewProduct} />
      </div>

      <div className="bg-muted/30 rounded-xl p-4 space-y-3 mt-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Категория:</span>
          <span className="font-medium text-right">{categoryName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Тип:</span>
          <span className="font-medium text-right">
            {data.type === "SINGLE" ? "Простой товар" : `Инвентарь (${data.quantity} шт)`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Доставка:</span>
          <span className="font-medium text-right">
            {data.deliveryMethods?.length ? data.deliveryMethods.map((m: string) => {
              if (m === "PICKUP") return "Самовывоз"
              if (m === "SELLER_DELIVERY") return "Доставка продавцом"
              if (m === "THIRD_PARTY") return "Через сторонний сервис"
              return m
            }).join(", ") : "-"}
          </span>
        </div>
      </div>
    </div>
  )
}
