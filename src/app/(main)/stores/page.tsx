import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

export const metadata = {
  title: "Магазины | BazarGo"
}

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Магазины</h1>
        <p className="text-lg text-muted-foreground">Пока нет магазинов</p>
      </div>
      <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Магазины</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">Пока нет магазинов</p>
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/sell">Разместить товар</Link>
        </Button>
      </div>
    </div>
  )
}
