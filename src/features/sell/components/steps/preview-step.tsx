import { useFormContext } from "react-hook-form"
import { ProductCard } from "@/components/shared/product-card"
import { useTranslations } from "next-intl";

export function PreviewStep({ categories }: { categories: any[] }) {
    const t = useTranslations();
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
    seller: { name: t("preview_step.you"), rating: 0, reviews: 0 },
    image: data.images?.[0]?.url || "",
    isVerified: false,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">{t("kak_budet_vyglyadet_obyavlenie")}</h2>
        <p className="text-sm text-muted-foreground">{t("proverte_dannye_pered_publikatsiey")}</p>
      </div>

      <div className="max-w-xs mx-auto border rounded-xl overflow-hidden shadow-lg p-2 bg-background">
        <ProductCard product={previewProduct} />
      </div>

      <div className="bg-muted/30 rounded-xl p-4 space-y-3 mt-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("kategoriya_1")}</span>
          <span className="font-medium text-right">{categoryName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("tip")}</span>
          <span className="font-medium text-right">
            {data.type === "SINGLE" ? t("preview_step.single_item") : `${t("preview_step.inventory")} (${data.quantity} ${t("preview_step.pcs")})`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("dostavka_1")}</span>
          <span className="font-medium text-right">
            {data.deliveryMethods?.length ? data.deliveryMethods.map((m: string) => {
              if (m === "PICKUP") return t("preview_step.pickup")
              if (m === "SELLER_DELIVERY") return t("preview_step.seller_delivery")
              if (m === "THIRD_PARTY") return t("preview_step.third_party")
              return m
            }).join(", ") : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
