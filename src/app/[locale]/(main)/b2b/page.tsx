import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

export const metadata = {
  title: "Для бизнеса | BazarGo"
}

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Для бизнеса</h1>
        <p className="text-lg text-muted-foreground">Оптовые закупки и возможности для магазинов</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="p-8 bg-muted/30 border rounded-3xl">
          <h2 className="text-2xl font-bold mb-4">Для магазинов</h2>
          <p className="text-muted-foreground mb-6">Откройте свой магазин на BazarGo. Получите доступ к тысячам покупателей, удобным инструментам аналитики и премиум-размещению.</p>
        </div>
        <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl">
          <h2 className="text-2xl font-bold mb-4 text-primary">Для поставщиков</h2>
          <p className="text-muted-foreground mb-6">Находите оптовых покупателей и расширяйте свой B2B бизнес с минимальными затратами на маркетинг.</p>
        </div>
      </div>
      <div className="flex justify-center">
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/b2b/become-supplier">Стать поставщиком</Link>
        </Button>
      </div>
    </div>
  )
}
